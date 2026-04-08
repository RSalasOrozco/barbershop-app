import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";
import bcrypt from "bcryptjs";

// Función de validación de email
const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

// ✅ Función de validación de nombre (NUEVA)
const validateName = (name: string): { valid: boolean; error: string } => {
  if (name.length < 2) {
    return {
      valid: false,
      error: "El nombre debe tener al menos 2 caracteres"
    };
  }

  const nameRegex = /^[A-Za-zÁáÉéÍíÓóÚúÑñ\s]+$/;
  if (!nameRegex.test(name)) {
    return {
      valid: false,
      error: "El nombre solo puede contener letras y espacios"
    };
  }

  if (name.trim().length === 0) {
    return { valid: false, error: "El nombre no puede estar vacío" };
  }

  const repeatedChars = /(.)\1{4,}/;
  if (repeatedChars.test(name)) {
    return {
      valid: false,
      error: "El nombre contiene caracteres repetidos excesivamente"
    };
  }

  return { valid: true, error: "" };
};

export async function POST(request: NextRequest) {
  try {
    const { name, email, password } = await request.json();

    // Validaciones básicas
    if (!name || !email || !password) {
      return NextResponse.json(
        { error: "Todos los campos son obligatorios" },
        { status: 400 }
      );
    }

    // ✅ Validar nombre (NUEVA)
    const nameValidation = validateName(name);
    if (!nameValidation.valid) {
      return NextResponse.json(
        { error: nameValidation.error },
        { status: 400 }
      );
    }

    // Validar formato de email
    if (!validateEmail(email)) {
      return NextResponse.json(
        {
          error: "Formato de correo electrónico inválido"
        },
        { status: 400 }
      );
    }

    // Validar longitud de contraseña
    if (password.length < 6) {
      return NextResponse.json(
        {
          error: "La contraseña debe tener al menos 6 caracteres"
        },
        { status: 400 }
      );
    }

    // Verificar si el email ya existe
    const existingUser = db
      .prepare("SELECT id FROM users WHERE email = ?")
      .get(email);
    if (existingUser) {
      return NextResponse.json(
        { error: "El correo ya está registrado" },
        { status: 400 }
      );
    }

    // Hashear contraseña
    const hashedPassword = await bcrypt.hash(password, 10);

    // Insertar usuario (nombre limpio)
    const stmt = db.prepare(
      "INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)"
    );
    const result = stmt.run(name.trim(), email, hashedPassword, "cliente");

    return NextResponse.json(
      {
        success: true,
        user: { id: result.lastInsertRowid, name: name.trim(), email }
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error en registro:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
