import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "crypto";
import db from "@/lib/db";
import bcrypt from "bcryptjs";
import { getSession } from "@/lib/auth";
import {
  generarCodigoUnico,
  verificarHorarioOcupado,
  validatePhone
} from "@/lib/appointments";

export async function POST(request: NextRequest) {
  try {
    const user = await getSession(request);
    if (!user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    if (user.role !== "admin") {
      return NextResponse.json({ error: "Acceso denegado" }, { status: 403 });
    }

    const { userId, client, serviceId, date, time, notes } =
      await request.json();

    if (!serviceId || !date || !time) {
      return NextResponse.json(
        { error: "Faltan campos requeridos" },
        { status: 400 }
      );
    }

    const service = db
      .prepare("SELECT * FROM services WHERE id = ?")
      .get(serviceId);
    if (!service) {
      return NextResponse.json(
        { error: "Servicio no válido" },
        { status: 400 }
      );
    }

    if (verificarHorarioOcupado(date, time)) {
      return NextResponse.json(
        { error: "Este horario ya está ocupado" },
        { status: 400 }
      );
    }

    let targetUserId: number;

    if (userId) {
      const target = db
        .prepare("SELECT id FROM users WHERE id = ?")
        .get(userId);
      if (!target) {
        return NextResponse.json(
          { error: "Cliente no encontrado" },
          { status: 400 }
        );
      }
      targetUserId = userId;
    } else if (client?.phone) {
      const phoneValidation = validatePhone(client.phone);
      if (!phoneValidation.valid) {
        return NextResponse.json(
          { error: phoneValidation.error },
          { status: 400 }
        );
      }

      const existing = db
        .prepare("SELECT id FROM users WHERE phone = ?")
        .get(client.phone) as { id: number } | undefined;
      if (existing) {
        targetUserId = existing.id;
      } else {
        const name = (client.name || "").trim();
        if (name.length < 2) {
          return NextResponse.json(
            { error: "El nombre del cliente debe tener al menos 2 caracteres" },
            { status: 400 }
          );
        }

        const email = `walkin-${randomBytes(6).toString("hex")}@barberia.local`;
        const randomPassword = bcrypt.hashSync(
          randomBytes(12).toString("hex"),
          10
        );

        const result = db
          .prepare(
            `
          INSERT INTO users (name, email, phone, password, role)
          VALUES (?, ?, ?, ?, 'cliente')
        `
          )
          .run(name, email, client.phone, randomPassword);

        targetUserId = result.lastInsertRowid as number;
      }
    } else {
      return NextResponse.json(
        { error: "Selecciona un cliente o ingresa el teléfono" },
        { status: 400 }
      );
    }

    const confirmationCode = generarCodigoUnico();

    const stmt = db.prepare(`
      INSERT INTO appointments (user_id, service_id, date, time, notes, confirmation_code, status)
      VALUES (?, ?, ?, ?, ?, ?, 'pendiente')
    `);

    const result = stmt.run(
      targetUserId,
      serviceId,
      date,
      time,
      notes || "",
      confirmationCode
    );

    return NextResponse.json(
      {
        success: true,
        confirmationCode,
        appointment: {
          id: result.lastInsertRowid,
          service,
          date,
          time,
          notes
        }
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error en POST /api/admin/appointments:", error);
    return NextResponse.json(
      { error: "Error al crear la cita" },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const user = await getSession(request);
    if (!user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    if (user.role !== "admin") {
      return NextResponse.json({ error: "Acceso denegado" }, { status: 403 });
    }

    const { id, status } = await request.json();

    if (!id || !status) {
      return NextResponse.json({ error: "Faltan campos" }, { status: 400 });
    }

    const stmt = db.prepare("UPDATE appointments SET status = ? WHERE id = ?");
    stmt.run(status, id);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error en PUT /api/admin/appointments:", error);
    return NextResponse.json(
      {
        error: "Error al actualizar",
        details: error instanceof Error ? error.message : "Error desconocido"
      },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const user = await getSession(request);
    if (!user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    if (user.role !== "admin") {
      return NextResponse.json({ error: "Acceso denegado" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "ID requerido" }, { status: 400 });
    }

    const stmt = db.prepare("DELETE FROM appointments WHERE id = ?");
    stmt.run(id);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error en DELETE /api/admin/appointments:", error);
    return NextResponse.json(
      {
        error: "Error al eliminar",
        details: error instanceof Error ? error.message : "Error desconocido"
      },
      { status: 500 }
    );
  }
}