import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";
import { getSession } from "@/lib/auth";

export async function PUT(request: NextRequest) {
  try {
    const user = await getSession(request);
    if (!user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    if (user.role !== "admin") {
      return NextResponse.json({ error: "Acceso denegado" }, { status: 403 });
    }

    const { id, status } = await request.json();

    if (!id || !status) {
      return NextResponse.json({ error: "Faltan campos" }, { status: 400 });
    }

    const stmt = db.prepare("UPDATE appointments SET status = ? WHERE id = ?");
    stmt.run(status, id);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error en PUT /api/admin/appointments:", error);
    return NextResponse.json(
      {
        error: "Error al actualizar",
        details: error instanceof Error ? error.message : "Error desconocido"
      },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const user = await getSession(request);
    if (!user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    if (user.role !== "admin") {
      return NextResponse.json({ error: "Acceso denegado" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "ID requerido" }, { status: 400 });
    }

    const stmt = db.prepare("DELETE FROM appointments WHERE id = ?");
    stmt.run(id);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error en DELETE /api/admin/appointments:", error);
    return NextResponse.json(
      {
        error: "Error al eliminar",
        details: error instanceof Error ? error.message : "Error desconocido"
      },
      { status: 500 }
    );
  }
}