import { NextResponse } from "next/server";
import db from "@/lib/db";

export async function GET() {
  try {
    // 1. Citas por día (últimos 7 días)
    const citasPorDia = db
      .prepare(
        `
      SELECT 
        date as fecha,
        COUNT(*) as total
      FROM appointments
      WHERE date >= date('now', '-7 days')
      GROUP BY date
      ORDER BY fecha ASC
    `
      )
      .all();

    // 2. Servicios más populares (con nombre del servicio)
    const serviciosPopulares = db
      .prepare(
        `
      SELECT 
        s.name as servicio,
        COUNT(*) as total
      FROM appointments a
      JOIN services s ON a.service_id = s.id
      GROUP BY a.service_id
      ORDER BY total DESC
      LIMIT 5
    `
      )
      .all();

    // 3. Métricas generales
    const totalCitas = db
      .prepare("SELECT COUNT(*) as total FROM appointments")
      .get();

    const citasHoy = db
      .prepare(
        `
      SELECT COUNT(*) as total 
      FROM appointments 
      WHERE date = date('now')
    `
      )
      .get();

    // Ingresos totales (sumando precio de servicios de citas completadas)
    const ingresosTotales = db
      .prepare(
        `
      SELECT SUM(s.price) as total 
      FROM appointments a
      JOIN services s ON a.service_id = s.id
      WHERE a.status = 'completada'
    `
      )
      .get();

    const clientesActivos = db
      .prepare(
        `
      SELECT COUNT(DISTINCT user_id) as total 
      FROM appointments
    `
      )
      .get();

    return NextResponse.json({
      citasPorDia,
      serviciosPopulares,
      metricas: {
        totalCitas: totalCitas.total || 0,
        citasHoy: citasHoy.total || 0,
        ingresosTotales: ingresosTotales.total || 0,
        clientesActivos: clientesActivos.total || 0
      }
    });
  } catch (error) {
    console.error("Error obteniendo estadísticas:", error);
    return NextResponse.json(
      { error: "Error al cargar estadísticas" },
      { status: 500 }
    );
  }
}
