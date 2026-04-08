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

    if (payload.role !== "admin") {
      return NextResponse.json({ error: "Acceso denegado" }, { status: 403 });
    }

    // Estadísticas generales
    const totalAppointments = db
      .prepare("SELECT COUNT(*) as count FROM appointments")
      .get() as any;
    const pendingAppointments = db
      .prepare("SELECT COUNT(*) as count FROM appointments WHERE status = ?")
      .get("pendiente") as any;
    const completedAppointments = db
      .prepare("SELECT COUNT(*) as count FROM appointments WHERE status = ?")
      .get("completada") as any;

    // Ingresos totales (citas completadas)
    const revenue = db
      .prepare(
        `
      SELECT SUM(s.price) as total 
      FROM appointments a
      JOIN services s ON a.service_id = s.id
      WHERE a.status = 'completada'
    `
      )
      .get() as any;

    // Citas por día de la semana
    const appointmentsByDay = db
      .prepare(
        `
      SELECT 
        CASE strftime('%w', date)
          WHEN '0' THEN 'Domingo'
          WHEN '1' THEN 'Lunes'
          WHEN '2' THEN 'Martes'
          WHEN '3' THEN 'Miércoles'
          WHEN '4' THEN 'Jueves'
          WHEN '5' THEN 'Viernes'
          WHEN '6' THEN 'Sábado'
        END as day_name,
        strftime('%w', date) as day_num,
        COUNT(*) as count
      FROM appointments
      GROUP BY strftime('%w', date)
      ORDER BY day_num
    `
      )
      .all();

    // Ingresos por día (últimos 7 días)
    const revenueByDay = db
      .prepare(
        `
      SELECT 
        a.date,
        SUM(s.price) as total
      FROM appointments a
      JOIN services s ON a.service_id = s.id
      WHERE a.status = 'completada'
        AND a.date >= date('now', '-7 days')
      GROUP BY a.date
      ORDER BY a.date DESC
    `
      )
      .all();

    // Servicios más populares
    const popularServices = db
      .prepare(
        `
      SELECT 
        s.name,
        COUNT(*) as count,
        SUM(s.price) as revenue
      FROM appointments a
      JOIN services s ON a.service_id = s.id
      WHERE a.status = 'completada'
      GROUP BY s.id
      ORDER BY count DESC
      LIMIT 5
    `
      )
      .all();

    return NextResponse.json({
      totalAppointments: totalAppointments.count,
      pendingAppointments: pendingAppointments.count,
      completedAppointments: completedAppointments.count,
      totalRevenue: revenue.total || 0,
      appointmentsByDay,
      revenueByDay,
      popularServices
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Error al cargar estadísticas" },
      { status: 500 }
    );
  }
}
