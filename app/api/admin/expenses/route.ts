import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";
import { requireAdmin } from "@/lib/guard";

// GET - Listar gastos (por mes opcional)
export async function GET(request: NextRequest) {
  try {
    const guard = await requireAdmin(request);
    if (guard.error) return guard.error;

    const { searchParams } = new URL(request.url);
    const month = searchParams.get("month");

    const where = month ? "WHERE substr(date, 1, 7) = ?" : "";
    const params = month ? [month] : [];

    const expenses = db
      .prepare(`SELECT * FROM expenses ${where} ORDER BY date DESC, id DESC`)
      .all(...params);

    const total = db
      .prepare(`SELECT COALESCE(SUM(amount), 0) as total FROM expenses ${where}`)
      .get(...params) as { total: number };

    return NextResponse.json({ expenses, total: total.total });
  } catch (error) {
    console.error("Error en GET /api/admin/expenses:", error);
    return NextResponse.json({ error: "Error al cargar gastos" }, { status: 500 });
  }
}

// POST - Crear gasto
export async function POST(request: NextRequest) {
  try {
    const guard = await requireAdmin(request);
    if (guard.error) return guard.error;

    const { date, description, amount, category } = await request.json();

    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return NextResponse.json({ error: "Fecha no válida" }, { status: 400 });
    }
    const desc = String(description || "").trim();
    if (desc.length < 2) {
      return NextResponse.json({ error: "La descripción debe tener al menos 2 caracteres" }, { status: 400 });
    }
    const value = Number(amount);
    if (!isFinite(value) || value <= 0) {
      return NextResponse.json({ error: "El monto debe ser mayor a 0" }, { status: 400 });
    }

    const result = db
      .prepare("INSERT INTO expenses (date, description, amount, category) VALUES (?, ?, ?, ?)")
      .run(date, desc, value, category ? String(category).trim() : null);

    return NextResponse.json({ success: true, id: result.lastInsertRowid }, { status: 201 });
  } catch (error) {
    console.error("Error en POST /api/admin/expenses:", error);
    return NextResponse.json({ error: "Error al registrar el gasto" }, { status: 500 });
  }
}

// PUT - Actualizar gasto
export async function PUT(request: NextRequest) {
  try {
    const guard = await requireAdmin(request);
    if (guard.error) return guard.error;

    const { id, date, description, amount, category } = await request.json();

    if (!id) {
      return NextResponse.json({ error: "ID requerido" }, { status: 400 });
    }
    const existing = db.prepare("SELECT id FROM expenses WHERE id = ?").get(id);
    if (!existing) {
      return NextResponse.json({ error: "Gasto no encontrado" }, { status: 404 });
    }

    const newDate = date || (existing as { date: string }).date;
    const desc = String(description ?? (existing as { description: string }).description).trim();
    const value = amount !== undefined ? Number(amount) : (existing as { amount: number }).amount;

    if (!/^\d{4}-\d{2}-\d{2}$/.test(newDate)) {
      return NextResponse.json({ error: "Fecha no válida" }, { status: 400 });
    }
    if (desc.length < 2) {
      return NextResponse.json({ error: "La descripción debe tener al menos 2 caracteres" }, { status: 400 });
    }
    if (!isFinite(value) || value <= 0) {
      return NextResponse.json({ error: "El monto debe ser mayor a 0" }, { status: 400 });
    }

    db.prepare("UPDATE expenses SET date = ?, description = ?, amount = ?, category = ? WHERE id = ?").run(
      newDate,
      desc,
      value,
      category ? String(category).trim() : null,
      id
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error en PUT /api/admin/expenses:", error);
    return NextResponse.json({ error: "Error al actualizar el gasto" }, { status: 500 });
  }
}

// DELETE - Eliminar gasto
export async function DELETE(request: NextRequest) {
  try {
    const guard = await requireAdmin(request);
    if (guard.error) return guard.error;

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "ID requerido" }, { status: 400 });
    }

    db.prepare("DELETE FROM expenses WHERE id = ?").run(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error en DELETE /api/admin/expenses:", error);
    return NextResponse.json({ error: "Error al eliminar el gasto" }, { status: 500 });
  }
}