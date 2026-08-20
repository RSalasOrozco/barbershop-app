import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";
import bcrypt from "bcryptjs";
import { signToken } from "@/lib/auth";
import { isSecureRequest } from "@/lib/cookies";

interface UserRow {
  id: number;
  name: string;
  email: string;
  password: string;
  role: "admin" | "cliente";
}

export async function POST(request: NextRequest) {
  try {
    const { identifier, password } = await request.json();

    if (!identifier || !password) {
      return NextResponse.json(
        { error: "Correo o teléfono y contraseña son obligatorios" },
        { status: 400 }
      );
    }

    // Normalizar teléfono (quitar espacios, guiones, paréntesis)
    const normalizedIdentifier = String(identifier)
      .trim()
      .replace(/[\s\-\(\)]/g, "");

    // Buscar usuario por correo o teléfono
    const user = db
      .prepare("SELECT * FROM users WHERE email = ? OR phone = ?")
      .get(normalizedIdentifier, normalizedIdentifier) as UserRow | undefined;

    if (!user) {
      return NextResponse.json(
        {
          error: "No estás registrado. Crea una cuenta primero",
          code: "USER_NOT_FOUND"
        },
        { status: 401 }
      );
    }

    // Verificar contraseña
    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return NextResponse.json(
        { error: "Contraseña incorrecta", code: "INVALID_PASSWORD" },
        { status: 401 }
      );
    }

    // Crear token JWT
    const token = await signToken({
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role
    });

    // Crear respuesta con cookie HTTP-only (segura)
    const response = NextResponse.json({
      success: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });

    // Establecer cookie (Secure solo si va por HTTPS)
    response.cookies.set({
      name: "token",
      value: token,
      httpOnly: true,
      secure: isSecureRequest(request),
      sameSite: "lax",
      path: "/",
      maxAge: 7 * 24 * 60 * 60 // 7 días
    });

    return response;
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
