import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";
import { requireAdmin } from "@/lib/guard";
import { getLicenseStatus } from "@/lib/license";

const BARBER_COLORS = [
  "#f59e0b", "#ef4444", "#3b82f6", "#10b981",
  "#8b5cf6", "#ec4899", "#14b8a6", "#f97316"
];

function sanitizePhone(phone: unknown): string | null {
  if (phone === undefined || phone === null) return null;
  const clean = String(phone).replace(/[\s\-\(\)]/g, "");
  return clean.length > 0 ? clean : null;
}

// GET - Listar peluqueros con métricas
export async function GET(request: NextRequest) {
  try {
    const guard = await requireAdmin(request);
    if (guard.error) return guard.error;

    const { searchParams } = new URL(request.url);
    const onlyActive = searchParams.get("active") === "1";

    const barbers = db
      .prepare(
        `SELECT
           b.*,
           COUNT(a.id) FILTER (WHERE a.status NOT IN ('cancelada')) as total_appointments,
           COALESCE(SUM(s.price) FILTER (WHERE a.status = 'completada'), 0) as total_revenue,
           COUNT(DISTINCT CASE WHEN a.date >= date('now') AND a.status NOT IN ('cancelada', 'completada') THEN a.id END) as upcoming_appointments
         FROM barbers b
         LEFT JOIN appointments a ON a.barber_id = b.id
         LEFT JOIN services s ON a.service_id = s.id
         ${onlyActive ? "WHERE b.active = 1" : ""}
         GROUP BY b.id
         ORDER BY b.active DESC, b.name ASC`
      )
      .all();

    return NextResponse.json({ barbers });
  } catch (error) {
    console.error("Error en GET /api/admin/barbers:", error);
    return NextResponse.json({ error: "Error al cargar peluqueros" }, { status: 500 });
  }
}

// POST - Crear peluquero
export async function POST(request: NextRequest) {
  try {
    const guard = await requireAdmin(request);
    if (guard.error) return guard.error;

    const { name, phone, color, notes } = await request.json();

    if (!name || name.trim().length < 2) {
      return NextResponse.json({ error: "El nombre debe tener al menos 2 caracteres" }, { status: 400 });
    }

    // Límite de peluqueros según licencia
    const license = getLicenseStatus();
    if (license.valid && license.maxBarbers) {
      const count = db.prepare("SELECT COUNT(*) as c FROM barbers").get() as { c: number };
      if (count.c >= license.maxBarbers) {
        return NextResponse.json(
          { error: `Tu licencia permite máximo ${license.maxBarbers} peluqueros. Contacta a tu proveedor para ampliarla.` },
          { status: 403 }
        );
      }
    }

    const cleanPhone = sanitizePhone(phone);
    const result = db
      .prepare(
        "INSERT INTO barbers (name, phone, color, active, notes) VALUES (?, ?, ?, 1, ?)"
      )
      .run(
        name.trim(),
        cleanPhone,
        color || BARBER_COLORS[Math.floor(Math.random() * BARBER_COLORS.length)],
        notes || ""
      );

    const barberId = result.lastInsertRowid as number;

    // Crear horario semanal por defecto (Lun-Sáb 9-18, domingo 9-14)
    const insertSchedule = db.prepare(
      `INSERT INTO barber_schedules (barber_id, day_of_week, is_working, start_time, end_time, break_start, break_end)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    );
    for (let dow = 1; dow <= 6; dow++) {
      insertSchedule.run(barberId, dow, 1, "09:00", "18:00", "12:00", "14:00");
    }
    insertSchedule.run(barberId, 0, 1, "09:00", "14:00", null, null);

    return NextResponse.json({ success: true, id: barberId }, { status: 201 });
  } catch (error) {
    console.error("Error en POST /api/admin/barbers:", error);
    return NextResponse.json({ error: "Error al crear el peluquero" }, { status: 500 });
  }
}

// PUT - Actualizar peluquero
export async function PUT(request: NextRequest) {
  try {
    const guard = await requireAdmin(request);
    if (guard.error) return guard.error;

    const { id, name, phone, color, active, notes } = await request.json();

    if (!id) {
      return NextResponse.json({ error: "ID de peluquero requerido" }, { status: 400 });
    }

    const existing = db.prepare("SELECT id FROM barbers WHERE id = ?").get(id);
    if (!existing) {
      return NextResponse.json({ error: "Peluquero no encontrado" }, { status: 404 });
    }

    const cleanPhone = sanitizePhone(phone);

    db.prepare(
      `UPDATE barbers SET name = ?, phone = ?, color = ?, active = ?, notes = ? WHERE id = ?`
    ).run(
      (name || "").trim(),
      cleanPhone,
      color || "#f59e0b",
      active === undefined ? 1 : active ? 1 : 0,
      notes || "",
      id
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error en PUT /api/admin/barbers:", error);
    return NextResponse.json({ error: "Error al actualizar el peluquero" }, { status: 500 });
  }
}

// DELETE - Eliminar peluquero
export async function DELETE(request: NextRequest) {
  try {
    const guard = await requireAdmin(request);
    if (guard.error) return guard.error;

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "ID de peluquero requerido" }, { status: 400 });
    }

    const existing = db.prepare("SELECT id FROM barbers WHERE id = ?").get(id);
    if (!existing) {
      return NextResponse.json({ error: "Peluquero no encontrado" }, { status: 404 });
    }

    const activeCount = db
      .prepare("SELECT COUNT(*) as c FROM appointments WHERE barber_id = ? AND status NOT IN ('cancelada')")
      .get(id) as { c: number };

    if (activeCount.c > 0) {
      return NextResponse.json(
        {
          error: `No se puede eliminar: tiene ${activeCount.c} cita(s). Desactívalo o reasigna sus citas primero.`
        },
        { status: 400 }
      );
    }

    db.prepare("DELETE FROM barbers WHERE id = ?").run(id);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error en DELETE /api/admin/barbers:", error);
    return NextResponse.json({ error: "Error al eliminar el peluquero" }, { status: 500 });
  }
}