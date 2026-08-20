import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";
import { requireAdmin } from "@/lib/guard";

// GET /api/admin/absences?date=YYYY-MM-DD (opcional) o todas
export async function GET(request: NextRequest) {
  try {
    const guard = await requireAdmin(request);
    if (guard.error) return guard.error;

    const { searchParams } = new URL(request.url);
    const date = searchParams.get("date");
    const barberId = searchParams.get("barberId");

    let query = `
      SELECT a.*, b.name as barber_name, b.color as barber_color
      FROM barber_absences a
      JOIN barbers b ON a.barber_id = b.id
      WHERE 1=1
    `;
    const params: (string | number)[] = [];

    if (date) {
      query += ` AND a.date <= ? AND (a.end_date IS NULL OR a.end_date >= ?)`;
      params.push(date, date);
    }
    if (barberId) {
      query += ` AND a.barber_id = ?`;
      params.push(barberId);
    }

    query += ` ORDER BY a.date DESC`;

    const absences = db.prepare(query).all(...params);
    return NextResponse.json({ absences });
  } catch (error) {
    console.error("Error en GET absences:", error);
    return NextResponse.json({ error: "Error al cargar novedades" }, { status: 500 });
  }
}

// POST /api/admin/absences — registrar novedad de ausencia
export async function POST(request: NextRequest) {
  try {
    const guard = await requireAdmin(request);
    if (guard.error) return guard.error;

    const { barberId, date, endDate, reason } = await request.json();

    if (!barberId || !date) {
      return NextResponse.json({ error: "Peluquero y fecha son obligatorios" }, { status: 400 });
    }

    const barber = db.prepare("SELECT id FROM barbers WHERE id = ?").get(barberId);
    if (!barber) {
      return NextResponse.json({ error: "Peluquero no encontrado" }, { status: 404 });
    }

    if (endDate && endDate < date) {
      return NextResponse.json({ error: "La fecha final no puede ser anterior a la inicial" }, { status: 400 });
    }

    const result = db
      .prepare(
        "INSERT INTO barber_absences (barber_id, date, end_date, reason) VALUES (?, ?, ?, ?)"
      )
      .run(barberId, date, endDate || null, reason || "");

    return NextResponse.json({ success: true, id: result.lastInsertRowid }, { status: 201 });
  } catch (error) {
    console.error("Error en POST absences:", error);
    return NextResponse.json({ error: "Error al registrar la novedad" }, { status: 500 });
  }
}

// DELETE /api/admin/absences?id=1
export async function DELETE(request: NextRequest) {
  try {
    const guard = await requireAdmin(request);
    if (guard.error) return guard.error;

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "ID requerido" }, { status: 400 });
    }

    db.prepare("DELETE FROM barber_absences WHERE id = ?").run(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error en DELETE absences:", error);
    return NextResponse.json({ error: "Error al eliminar la novedad" }, { status: 500 });
  }
}