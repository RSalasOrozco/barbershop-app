import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";
import { requireAdmin } from "@/lib/guard";

interface CountRow {
  count: number;
}

interface RevenueRow {
  total: number | null;
}

export async function GET(request: NextRequest) {
  try {
    const guard = await requireAdmin(request);
    if (guard.error) return guard.error;

    const { searchParams } = new URL(request.url);
    const barberId = searchParams.get("barberId");

    const whereBarber = barberId ? " AND a.barber_id = ?" : "";
    const whereBarberValue = barberId ? [barberId] : [];

    // Estadísticas generales
    const totalAppointments = db
      .prepare(`SELECT COUNT(*) as count FROM appointments a WHERE 1=1 ${whereBarber}`)
      .get(...whereBarberValue) as CountRow;
    const pendingAppointments = db
      .prepare(`SELECT COUNT(*) as count FROM appointments a WHERE a.status = ? ${whereBarber}`)
      .get("pendiente", ...whereBarberValue) as CountRow;
    const completedAppointments = db
      .prepare(`SELECT COUNT(*) as count FROM appointments a WHERE a.status = ? ${whereBarber}`)
      .get("completada", ...whereBarberValue) as CountRow;
    const cancelledAppointments = db
      .prepare(`SELECT COUNT(*) as count FROM appointments a WHERE a.status = ? ${whereBarber}`)
      .get("cancelada", ...whereBarberValue) as CountRow;

    // Citas de hoy
    const todayAppointments = db
      .prepare(`SELECT COUNT(*) as count FROM appointments a WHERE a.date = date('now') AND a.status NOT IN ('cancelada') ${whereBarber}`)
      .get(...whereBarberValue) as CountRow;

    // Ingresos totales (citas completadas)
    const revenue = db
      .prepare(
        `SELECT SUM(s.price) as total
         FROM appointments a
         JOIN services s ON a.service_id = s.id
         WHERE a.status = 'completada' ${whereBarber}`
      )
      .get(...whereBarberValue) as RevenueRow;

    // Citas por día de la semana
    const appointmentsByDay = db
      .prepare(
        `SELECT
           CASE strftime('%w', a.date)
             WHEN '0' THEN 'Domingo'
             WHEN '1' THEN 'Lunes'
             WHEN '2' THEN 'Martes'
             WHEN '3' THEN 'Miércoles'
             WHEN '4' THEN 'Jueves'
             WHEN '5' THEN 'Viernes'
             WHEN '6' THEN 'Sábado'
           END as day_name,
           strftime('%w', a.date) as day_num,
           COUNT(*) as count
         FROM appointments a
         WHERE 1=1 ${whereBarber}
         GROUP BY strftime('%w', a.date)
         ORDER BY day_num`
      )
      .all(...whereBarberValue);

    // Ingresos por día (últimos 7 días)
    const revenueByDay = db
      .prepare(
        `SELECT a.date, SUM(s.price) as total
         FROM appointments a
         JOIN services s ON a.service_id = s.id
         WHERE a.status = 'completada' AND a.date >= date('now', '-7 days') ${whereBarber}
         GROUP BY a.date
         ORDER BY a.date DESC`
      )
      .all(...whereBarberValue);

    // Servicios más populares
    const popularServices = db
      .prepare(
        `SELECT s.name, COUNT(*) as count, SUM(s.price) as revenue
         FROM appointments a
         JOIN services s ON a.service_id = s.id
         WHERE a.status = 'completada' ${whereBarber}
         GROUP BY s.id
         ORDER BY count DESC
         LIMIT 5`
      )
      .all(...whereBarberValue);

    // Métricas por peluquero
    const perBarber = db
      .prepare(
        `SELECT
           b.id, b.name, b.color,
           COUNT(a.id) FILTER (WHERE a.status NOT IN ('cancelada')) as total,
           COUNT(a.id) FILTER (WHERE a.status = 'completada') as completed,
           COALESCE(SUM(s.price) FILTER (WHERE a.status = 'completada'), 0) as revenue
         FROM barbers b
         LEFT JOIN appointments a ON a.barber_id = b.id
         LEFT JOIN services s ON a.service_id = s.id
         WHERE b.active = 1
         GROUP BY b.id
         ORDER BY revenue DESC`
      )
      .all();

    return NextResponse.json({
      totalAppointments: totalAppointments.count,
      pendingAppointments: pendingAppointments.count,
      completedAppointments: completedAppointments.count,
      cancelledAppointments: cancelledAppointments.count,
      todayAppointments: todayAppointments.count,
      totalRevenue: revenue.total || 0,
      appointmentsByDay,
      revenueByDay,
      popularServices,
      perBarber
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Error al cargar estadísticas" }, { status: 500 });
  }
}