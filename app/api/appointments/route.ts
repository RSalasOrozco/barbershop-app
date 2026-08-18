import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";
import { getSession } from "@/lib/auth";
import {
  generarCodigoUnico,
  verificarHorarioOcupado
} from "@/lib/appointments";

export async function GET(request: NextRequest) {
  try {
    const user = await getSession(request);
    if (!user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    let query = `
      SELECT 
        a.*,
        s.name as service_name,
        s.price as service_price,
        u.name as client_name,
        u.email as client_email
      FROM appointments a
      JOIN services s ON a.service_id = s.id
      JOIN users u ON a.user_id = u.id
    `;

    const params: (string | number)[] = [];

    // Si es cliente, solo ve sus citas
    if (user.role === "cliente") {
      query += ` WHERE a.user_id = ?`;
      params.push(user.id);
    }

    query += ` ORDER BY a.date DESC, a.time DESC`;

    const appointments = db.prepare(query).all(...params);

    return NextResponse.json({ appointments });
  } catch (error) {
    console.error("Error en GET /api/appointments:", error);
    return NextResponse.json(
      {
        error: "Error al cargar citas",
        details: error instanceof Error ? error.message : "Error desconocido"
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getSession(request);
    if (!user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { serviceId, date, time, notes } = await request.json();

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

    // ✅ Generar código de confirmación único
    const confirmationCode = generarCodigoUnico();

    // ✅ Modificar INSERT para incluir el código de confirmación y status
    const stmt = db.prepare(`
      INSERT INTO appointments (user_id, service_id, date, time, notes, confirmation_code, status)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    const result = stmt.run(
      user.id,
      serviceId,
      date,
      time,
      notes || "",
      confirmationCode,
      "pendiente" // Status inicial: pendiente
    );

    return NextResponse.json(
      {
        success: true,
        confirmationCode, // ✅ Enviamos el código al frontend
        appointment: {
          id: result.lastInsertRowid,
          service: service,
          date,
          time,
          notes
        }
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error en POST /api/appointments:", error);
    return NextResponse.json(
      {
        error: "Error al crear la cita",
        details: error instanceof Error ? error.message : "Error desconocido"
      },
      { status: 500 }
    );
  }
}