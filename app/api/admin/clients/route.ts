import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";
import { requireAdmin } from "@/lib/guard";

// GET /api/admin/clients?q=nombre|telefono — Buscar clientes existentes (solo admin)
export async function GET(request: NextRequest) {
  try {
    const guard = await requireAdmin(request);
    if (guard.error) return guard.error;

    const { searchParams } = new URL(request.url);
    const q = (searchParams.get("q") || "").trim();

    if (!q || q.length < 2) {
      return NextResponse.json({ clients: [] });
    }

    const like = `%${q}%`;
    const clients = db
      .prepare(
        `
        SELECT
          u.id,
          u.name,
          u.email,
          u.phone,
          COUNT(a.id) as total_appointments,
          MAX(a.date) as last_appointment
        FROM users u
        LEFT JOIN appointments a ON a.user_id = u.id
        WHERE u.role = 'cliente'
          AND (u.name LIKE ? OR u.phone LIKE ?)
        GROUP BY u.id
        ORDER BY total_appointments DESC, u.name ASC
        LIMIT 8
      `
      )
      .all(like, like);

    return NextResponse.json({ clients });
  } catch (error) {
    console.error("Error en GET /api/admin/clients:", error);
    return NextResponse.json({ error: "Error al buscar clientes" }, { status: 500 });
  }
}