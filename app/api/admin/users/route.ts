import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";
import { jwtVerify } from "jose";
import bcrypt from "bcryptjs";

// GET - Obtener todos los usuarios (solo admin)
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

    const users = db
      .prepare(
        `
      SELECT 
        u.id,
        u.name,
        u.email,
        u.role,
        u.created_at,
        COUNT(a.id) as total_appointments,
        SUM(CASE WHEN a.status = 'completada' THEN s.price ELSE 0 END) as total_spent
      FROM users u
      LEFT JOIN appointments a ON u.id = a.user_id
      LEFT JOIN services s ON a.service_id = s.id
      GROUP BY u.id
      ORDER BY u.created_at DESC
    `
      )
      .all();

    return NextResponse.json({ users });
  } catch (error) {
    console.error("Error en GET /api/admin/users:", error);
    return NextResponse.json(
      { error: "Error al cargar usuarios" },
      { status: 500 }
    );
  }
}

// PUT - Actualizar usuario (cambiar rol, nombre, etc.)
export async function PUT(request: NextRequest) {
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

    const { id, name, email, role } = await request.json();

    if (!id) {
      return NextResponse.json(
        { error: "ID de usuario requerido" },
        { status: 400 }
      );
    }

    // No permitir que el admin se quite a sí mismo el rol admin
    if (id === payload.id && role !== "admin") {
      return NextResponse.json(
        {
          error: "No puedes quitarte el rol de administrador a ti mismo"
        },
        { status: 400 }
      );
    }

    // Verificar que el email no esté duplicado (excepto para el mismo usuario)
    if (email) {
      const existing = db
        .prepare("SELECT id FROM users WHERE email = ? AND id != ?")
        .get(email, id);
      if (existing) {
        return NextResponse.json(
          { error: "El correo ya está en uso por otro usuario" },
          { status: 400 }
        );
      }
    }

    const updates: string[] = [];
    const values: any[] = [];

    if (name) {
      updates.push("name = ?");
      values.push(name);
    }
    if (email) {
      updates.push("email = ?");
      values.push(email);
    }
    if (role) {
      updates.push("role = ?");
      values.push(role);
    }

    if (updates.length === 0) {
      return NextResponse.json(
        { error: "No hay campos para actualizar" },
        { status: 400 }
      );
    }

    values.push(id);
    const query = `UPDATE users SET ${updates.join(", ")} WHERE id = ?`;
    db.prepare(query).run(...values);

    return NextResponse.json({
      success: true,
      message: "Usuario actualizado correctamente"
    });
  } catch (error) {
    console.error("Error en PUT /api/admin/users:", error);
    return NextResponse.json(
      { error: "Error al actualizar usuario" },
      { status: 500 }
    );
  }
}

// DELETE - Eliminar usuario
export async function DELETE(request: NextRequest) {
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

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { error: "ID de usuario requerido" },
        { status: 400 }
      );
    }

    // No permitir que el admin se elimine a sí mismo
    if (parseInt(id) === payload.id) {
      return NextResponse.json(
        {
          error: "No puedes eliminar tu propia cuenta de administrador"
        },
        { status: 400 }
      );
    }

    // Verificar que el usuario existe
    const user = db.prepare("SELECT role FROM users WHERE id = ?").get(id);
    if (!user) {
      return NextResponse.json(
        { error: "Usuario no encontrado" },
        { status: 404 }
      );
    }

    // Eliminar usuario (las citas se eliminarán en cascada por la FK)
    db.prepare("DELETE FROM users WHERE id = ?").run(id);

    return NextResponse.json({
      success: true,
      message: "Usuario eliminado correctamente"
    });
  } catch (error) {
    console.error("Error en DELETE /api/admin/users:", error);
    return NextResponse.json(
      { error: "Error al eliminar usuario" },
      { status: 500 }
    );
  }
}
