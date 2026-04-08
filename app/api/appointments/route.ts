import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";
import { jwtVerify } from "jose";

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get("token")?.value;
    if (!token) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const secret = new TextEncoder().encode(
      "barbershop-secret-key-2024-change-in-production"
    );
    const { payload } = await jwtVerify(token, secret);

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

    let params: any[] = [];

    // Si es cliente, solo ve sus citas
    if (payload.role === "cliente") {
      query += ` WHERE a.user_id = ?`;
      params.push(payload.id);
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
    const token = request.cookies.get("token")?.value;
    if (!token) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const secret = new TextEncoder().encode(
      "barbershop-secret-key-2024-change-in-production"
    );
    const { payload } = await jwtVerify(token, secret);

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

    const existing = db
      .prepare(
        `
      SELECT id FROM appointments 
      WHERE date = ? AND time = ? AND status != 'cancelada'
    `
      )
      .get(date, time);

    if (existing) {
      return NextResponse.json(
        { error: "Este horario ya está ocupado" },
        { status: 400 }
      );
    }

    const stmt = db.prepare(`
      INSERT INTO appointments (user_id, service_id, date, time, notes)
      VALUES (?, ?, ?, ?, ?)
    `);

    const result = stmt.run(payload.id, serviceId, date, time, notes || "");

    return NextResponse.json(
      {
        success: true,
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
