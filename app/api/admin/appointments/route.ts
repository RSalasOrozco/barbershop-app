import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "crypto";
import db from "@/lib/db";
import bcrypt from "bcryptjs";
import { requireAdmin } from "@/lib/guard";
import { generarCodigoUnico, validatePhone } from "@/lib/appointments";
import { isTimeAvailable, isAbsent, isBarberActive, getServiceDuration } from "@/lib/slots";
import { isWithinBookingWindow } from "@/lib/booking";

// GET - Listar citas con filtros y paginación (solo admin)
export async function GET(request: NextRequest) {
  try {
    const guard = await requireAdmin(request);
    if (guard.error) return guard.error;

    const { searchParams } = new URL(request.url);
    const date = searchParams.get("date");
    const barberId = searchParams.get("barberId");
    const status = searchParams.get("status");
    const search = (searchParams.get("search") || "").trim();

    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "25", 10)));

    const where: string[] = [];
    const params: (string | number)[] = [];

    if (date) {
      where.push(`a.date = ?`);
      params.push(date);
    }
    if (barberId) {
      where.push(`a.barber_id = ?`);
      params.push(barberId);
    }
    if (status && status !== "todas") {
      where.push(`a.status = ?`);
      params.push(status);
    }
    if (search) {
      const q = `%${search}%`;
      where.push(`(a.client_name LIKE ? OR a.client_phone LIKE ? OR s.name LIKE ? OR b.name LIKE ? OR a.confirmation_code LIKE ?)`);
      params.push(q, q, q, q, q);
    }

    const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "WHERE 1=1";

    const totalRow = db
      .prepare(`
        SELECT COUNT(*) as count
        FROM appointments a
        JOIN services s ON a.service_id = s.id
        LEFT JOIN barbers b ON a.barber_id = b.id
        ${whereSql}
      `)
      .get(...params) as { count: number };
    const total = totalRow.count;
    const totalPages = Math.max(1, Math.ceil(total / limit));
    const offset = (page - 1) * limit;

    const appointments = db
      .prepare(`
        SELECT
          a.*,
          s.name as service_name,
          s.price as service_price,
          s.duration as service_duration,
          b.name as barber_name,
          b.color as barber_color
        FROM appointments a
        JOIN services s ON a.service_id = s.id
        LEFT JOIN barbers b ON a.barber_id = b.id
        ${whereSql}
        ORDER BY a.date DESC, a.time DESC
        LIMIT ? OFFSET ?
      `)
      .all(...params, limit, offset);

    return NextResponse.json({
      appointments,
      pagination: { page, limit, total, totalPages }
    });
  } catch (error) {
    console.error("Error en GET /api/admin/appointments:", error);
    return NextResponse.json({ error: "Error al cargar citas" }, { status: 500 });
  }
}

// POST - Crear cita desde mostrador (con barbero)
export async function POST(request: NextRequest) {
  try {
    const guard = await requireAdmin(request);
    if (guard.error) return guard.error;

    const { userId, client, serviceId, barberId, date, time, notes } = await request.json();

    if (!serviceId || !barberId || !date || !time) {
      return NextResponse.json(
        { error: "Servicio, peluquero, fecha y hora son obligatorios" },
        { status: 400 }
      );
    }

    const windowCheck = isWithinBookingWindow(date);
    if (!windowCheck.valid) {
      return NextResponse.json({ error: windowCheck.error }, { status: 400 });
    }

    const service = db.prepare("SELECT * FROM services WHERE id = ?").get(serviceId) as
      | { id: number; name: string; price: number; duration: number }
      | undefined;
    if (!service) {
      return NextResponse.json({ error: "Servicio no válido" }, { status: 400 });
    }

    if (!isBarberActive(barberId)) {
      return NextResponse.json({ error: "El peluquero no está activo" }, { status: 400 });
    }

    if (isAbsent(barberId, date)) {
      return NextResponse.json(
        { error: "El peluquero tiene una novedad registrada para esa fecha. Elige otro peluquero o fecha." },
        { status: 400 }
      );
    }

    const duration = service.duration || 30;
    if (!isTimeAvailable(barberId, date, time, duration)) {
      return NextResponse.json(
        { error: "El horario ya no está disponible para ese peluquero" },
        { status: 400 }
      );
    }

    // Resolver datos del cliente
    let targetUserId: number | null = null;
    let clientName = "";
    let clientPhone: string | null = null;

    if (userId) {
      const target = db.prepare("SELECT id, name, phone FROM users WHERE id = ?").get(userId) as
        | { id: number; name: string; phone: string | null }
        | undefined;
      if (!target) {
        return NextResponse.json({ error: "Cliente no encontrado" }, { status: 400 });
      }
      targetUserId = target.id;
      clientName = target.name;
      clientPhone = target.phone;
    } else if (client?.name) {
      clientName = String(client.name).trim();
      clientPhone = client.phone ? String(client.phone).replace(/[\s\-\(\)]/g, "") : null;

      if (clientName.length < 2) {
        return NextResponse.json({ error: "El nombre del cliente debe tener al menos 2 caracteres" }, { status: 400 });
      }
      if (clientPhone) {
        const phoneValidation = validatePhone(clientPhone);
        if (!phoneValidation.valid) {
          return NextResponse.json({ error: phoneValidation.error }, { status: 400 });
        }
        // Vincular con un usuario existente si coincide el teléfono
        const existing = db.prepare("SELECT id, name, phone FROM users WHERE phone = ?").get(clientPhone) as
          | { id: number; name: string; phone: string | null }
          | undefined;
        if (existing) {
          targetUserId = existing.id;
          clientName = existing.name;
        } else {
          // Si no coincide el teléfono, intentar por nombre exacto (cliente único)
          const byName = db
            .prepare("SELECT id, name, phone FROM users WHERE role = 'cliente' AND name = ?")
            .all(clientName) as { id: number; name: string; phone: string | null }[];
          if (byName.length === 1) {
            targetUserId = byName[0].id;
            clientName = byName[0].name;
          } else {
            const email = `walkin-${randomBytes(6).toString("hex")}@barberia.local`;
            const randomPassword = bcrypt.hashSync(randomBytes(12).toString("hex"), 10);
            const result = db
              .prepare("INSERT INTO users (name, email, phone, password, role) VALUES (?, ?, ?, ?, 'cliente')")
              .run(clientName, email, clientPhone, randomPassword);
            targetUserId = result.lastInsertRowid as number;
          }
        }
      }
    } else {
      return NextResponse.json({ error: "Selecciona un cliente o ingresa su nombre" }, { status: 400 });
    }

    const confirmationCode = generarCodigoUnico();

    const stmt = db.prepare(`
      INSERT INTO appointments (user_id, service_id, barber_id, date, time, notes, client_name, client_phone, confirmation_code, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'pendiente')
    `);

    const result = stmt.run(
      targetUserId,
      serviceId,
      barberId,
      date,
      time,
      notes || "",
      clientName,
      clientPhone,
      confirmationCode
    );

    return NextResponse.json(
      {
        success: true,
        confirmationCode,
        appointment: {
          id: result.lastInsertRowid,
          service,
          barberId,
          date,
          time,
          notes,
          clientName,
          clientPhone
        }
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error en POST /api/admin/appointments:", error);
    return NextResponse.json({ error: "Error al crear la cita" }, { status: 500 });
  }
}

// PUT - Cambiar estado o reasignar cita (peluquero, fecha u hora)
export async function PUT(request: NextRequest) {
  try {
    const guard = await requireAdmin(request);
    if (guard.error) return guard.error;

    const { id, status, barberId, date, time } = await request.json();

    if (!id) {
      return NextResponse.json({ error: "ID requerido" }, { status: 400 });
    }

    const appointment = db
      .prepare("SELECT * FROM appointments WHERE id = ?")
      .get(id) as { id: number; service_id: number; barber_id: number | null; date: string; time: string; status: string } | undefined;

    if (!appointment) {
      return NextResponse.json({ error: "Cita no encontrada" }, { status: 404 });
    }

    // Modo reasignación: cambiar peluquero, fecha y/o hora
    if (barberId !== undefined || date !== undefined || time !== undefined) {
      const newBarberId = barberId !== undefined ? Number(barberId) : appointment.barber_id;
      const newDate = date !== undefined ? date : appointment.date;
      const newTime = time !== undefined ? time : appointment.time;

      if (!newBarberId) {
        return NextResponse.json({ error: "Selecciona un peluquero" }, { status: 400 });
      }

      const windowCheck = isWithinBookingWindow(newDate);
      if (!windowCheck.valid) {
        return NextResponse.json({ error: windowCheck.error }, { status: 400 });
      }

      if (!isBarberActive(newBarberId)) {
        return NextResponse.json({ error: "El peluquero no está activo" }, { status: 400 });
      }
      if (isAbsent(newBarberId, newDate)) {
        return NextResponse.json(
          { error: "El peluquero tiene una novedad para esa fecha" },
          { status: 400 }
        );
      }

      const duration = getServiceDuration(appointment.service_id);
      if (!isTimeAvailable(newBarberId, newDate, newTime, duration, id)) {
        return NextResponse.json(
          { error: "El nuevo horario no está disponible" },
          { status: 400 }
        );
      }

      db.prepare(
        "UPDATE appointments SET barber_id = ?, date = ?, time = ? WHERE id = ?"
      ).run(newBarberId, newDate, newTime, id);

      return NextResponse.json({ success: true });
    }

    // Modo cambio de estado
    if (!status) {
      return NextResponse.json({ error: "Indica el nuevo estado" }, { status: 400 });
    }

    const validStatuses = ["pendiente", "confirmada", "cancelada", "completada"];
    if (!validStatuses.includes(status)) {
      return NextResponse.json({ error: "Estado no válido" }, { status: 400 });
    }

    db.prepare("UPDATE appointments SET status = ? WHERE id = ?").run(status, id);
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

// DELETE - Eliminar cita
export async function DELETE(request: NextRequest) {
  try {
    const guard = await requireAdmin(request);
    if (guard.error) return guard.error;

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "ID requerido" }, { status: 400 });
    }

    db.prepare("DELETE FROM appointments WHERE id = ?").run(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error en DELETE /api/admin/appointments:", error);
    return NextResponse.json({ error: "Error al eliminar" }, { status: 500 });
  }
}