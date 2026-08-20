import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";
import { requireAdmin } from "@/lib/guard";

const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

interface ScheduleDay {
  day_of_week: number;
  is_working: boolean;
  start_time: string;
  end_time: string;
  break_start: string | null;
  break_end: string | null;
}

// GET /api/admin/barbers/schedules?barberId=1
export async function GET(request: NextRequest) {
  try {
    const guard = await requireAdmin(request);
    if (guard.error) return guard.error;

    const { searchParams } = new URL(request.url);
    const barberId = searchParams.get("barberId");

    if (!barberId) {
      return NextResponse.json({ error: "barberId requerido" }, { status: 400 });
    }

    const barber = db.prepare("SELECT id FROM barbers WHERE id = ?").get(barberId);
    if (!barber) {
      return NextResponse.json({ error: "Peluquero no encontrado" }, { status: 404 });
    }

    const schedules = db
      .prepare("SELECT * FROM barber_schedules WHERE barber_id = ? ORDER BY day_of_week")
      .all(barberId);

    return NextResponse.json({ schedules });
  } catch (error) {
    console.error("Error en GET schedules:", error);
    return NextResponse.json({ error: "Error al cargar horarios" }, { status: 500 });
  }
}

// PUT /api/admin/barbers/schedules — guarda la semana completa
export async function PUT(request: NextRequest) {
  try {
    const guard = await requireAdmin(request);
    if (guard.error) return guard.error;

    const { barberId, days } = await request.json();

    if (!barberId || !Array.isArray(days) || days.length !== 7) {
      return NextResponse.json(
        { error: "Se requieren los 7 días de la semana" },
        { status: 400 }
      );
    }

    const barber = db.prepare("SELECT id FROM barbers WHERE id = ?").get(barberId);
    if (!barber) {
      return NextResponse.json({ error: "Peluquero no encontrado" }, { status: 404 });
    }

    const upsert = db.prepare(
      `INSERT INTO barber_schedules (barber_id, day_of_week, is_working, start_time, end_time, break_start, break_end)
       VALUES (?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(barber_id, day_of_week)
       DO UPDATE SET
         is_working = excluded.is_working,
         start_time = excluded.start_time,
         end_time = excluded.end_time,
         break_start = excluded.break_start,
         break_end = excluded.break_end`
    );

    const tx = db.transaction((list: ScheduleDay[]) => {
      for (const d of list) {
        const day = d.day_of_week;
        if (day < 0 || day > 6) {
          throw new Error(`Día de semana inválido: ${day}`);
        }

        const working = !!d.is_working;
        const start = (d.start_time || "09:00") as string;
        const end = (d.end_time || "18:00") as string;
        const bStart = d.break_start || null;
        const bEnd = d.break_end || null;

        if (working) {
          if (!TIME_RE.test(start) || !TIME_RE.test(end)) {
            throw new Error(`Horario inválido para el día ${day}`);
          }
          if (bStart && !TIME_RE.test(bStart)) throw new Error(`Inicio de descanso inválido día ${day}`);
          if (bEnd && !TIME_RE.test(bEnd)) throw new Error(`Fin de descanso inválido día ${day}`);
        }

        upsert.run(barberId, day, working ? 1 : 0, working ? start : null, working ? end : null, bStart, bEnd);
      }
    });

    try {
      tx(days as ScheduleDay[]);
    } catch (e) {
      return NextResponse.json(
        { error: e instanceof Error ? e.message : "Horarios inválidos" },
        { status: 400 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error en PUT schedules:", error);
    return NextResponse.json({ error: "Error al guardar horarios" }, { status: 500 });
  }
}