import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";
import { requireAdmin, requireAuth } from "@/lib/guard";

// GET - Listar servicios
export async function GET(request: NextRequest) {
  try {
    const guard = await requireAuth(request);
    if (guard.error) return guard.error;

    const services = db
      .prepare(
        `SELECT s.*, COUNT(a.id) as total_appointments
         FROM services s
         LEFT JOIN appointments a ON a.service_id = s.id
         GROUP BY s.id
         ORDER BY s.name`
      )
      .all();
    return NextResponse.json({ services });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Error al cargar servicios" }, { status: 500 });
  }
}

// POST - Crear servicio
export async function POST(request: NextRequest) {
  try {
    const guard = await requireAdmin(request);
    if (guard.error) return guard.error;

    const { name, price, duration } = await request.json();

    if (!name || name.trim().length < 2) {
      return NextResponse.json({ error: "El nombre del servicio es obligatorio" }, { status: 400 });
    }
    const parsedPrice = Number(price);
    const parsedDuration = Number(duration);

    if (isNaN(parsedPrice) || parsedPrice <= 0) {
      return NextResponse.json({ error: "El precio debe ser mayor a 0" }, { status: 400 });
    }
    if (isNaN(parsedDuration) || parsedDuration <= 0) {
      return NextResponse.json({ error: "La duración debe ser mayor a 0 minutos" }, { status: 400 });
    }

    const result = db
      .prepare("INSERT INTO services (name, price, duration) VALUES (?, ?, ?)")
      .run(name.trim(), parsedPrice, parsedDuration);

    return NextResponse.json({ success: true, id: result.lastInsertRowid }, { status: 201 });
  } catch (error) {
    console.error("Error en POST /api/services:", error);
    return NextResponse.json({ error: "Error al crear el servicio" }, { status: 500 });
  }
}

// PUT - Actualizar servicio
export async function PUT(request: NextRequest) {
  try {
    const guard = await requireAdmin(request);
    if (guard.error) return guard.error;

    const { id, name, price, duration } = await request.json();

    if (!id) {
      return NextResponse.json({ error: "ID de servicio requerido" }, { status: 400 });
    }
    const existing = db.prepare("SELECT id FROM services WHERE id = ?").get(id);
    if (!existing) {
      return NextResponse.json({ error: "Servicio no encontrado" }, { status: 404 });
    }

    const parsedPrice = Number(price);
    const parsedDuration = Number(duration);

    if (name && name.trim().length < 2) {
      return NextResponse.json({ error: "El nombre del servicio es obligatorio" }, { status: 400 });
    }
    if (isNaN(parsedPrice) || parsedPrice <= 0) {
      return NextResponse.json({ error: "El precio debe ser mayor a 0" }, { status: 400 });
    }
    if (isNaN(parsedDuration) || parsedDuration <= 0) {
      return NextResponse.json({ error: "La duración debe ser mayor a 0 minutos" }, { status: 400 });
    }

    db.prepare("UPDATE services SET name = ?, price = ?, duration = ? WHERE id = ?").run(
      name.trim(),
      parsedPrice,
      parsedDuration,
      id
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error en PUT /api/services:", error);
    return NextResponse.json({ error: "Error al actualizar el servicio" }, { status: 500 });
  }
}

// DELETE - Eliminar servicio
export async function DELETE(request: NextRequest) {
  try {
    const guard = await requireAdmin(request);
    if (guard.error) return guard.error;

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "ID de servicio requerido" }, { status: 400 });
    }

    const existing = db.prepare("SELECT id FROM services WHERE id = ?").get(id);
    if (!existing) {
      return NextResponse.json({ error: "Servicio no encontrado" }, { status: 404 });
    }

    const used = db
      .prepare("SELECT COUNT(*) as c FROM appointments WHERE service_id = ?")
      .get(id) as { c: number };
    if (used.c > 0) {
      return NextResponse.json(
        { error: `El servicio tiene ${used.c} cita(s) asociadas y no puede eliminarse.` },
        { status: 400 }
      );
    }

    db.prepare("DELETE FROM services WHERE id = ?").run(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error en DELETE /api/services:", error);
    return NextResponse.json({ error: "Error al eliminar el servicio" }, { status: 500 });
  }
}