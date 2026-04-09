import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";
import bcrypt from "bcryptjs";

// Función de validación de email
const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

// Función de validación de nombre
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

// ✅ NUEVA: Función de validación de teléfono
const validatePhone = (phone: string): { valid: boolean; error: string } => {
  // Limpiar el número (quitar espacios, guiones, etc.)
  const cleanPhone = phone.replace(/[\s\-\(\)]/g, "");

  // Verificar que sean solo números
  const phoneRegex = /^\d+$/;
  if (!phoneRegex.test(cleanPhone)) {
    return { valid: false, error: "Solo se permiten números" };
  }

  // Verificar que tenga 10 dígitos (Colombia)
  if (cleanPhone.length !== 10) {
    return { valid: false, error: "El número debe tener 10 dígitos" };
  }

  // Verificar que empiece con 3 (celular Colombia)
  if (!cleanPhone.startsWith("3")) {
    return {
      valid: false,
      error: "Debe ser un número de celular que empiece con 3"
    };
  }

  return { valid: true, error: "" };
};

export async function POST(request: NextRequest) {
  try {
    // ✅ AGREGAR phone a los datos que recibimos
    const { name, email, phone, password } = await request.json();

    // Validaciones básicas (agregar phone)
    if (!name || !email || !phone || !password) {
      return NextResponse.json(
        { error: "Todos los campos son obligatorios" },
        { status: 400 }
      );
    }

    // Validar nombre
    const nameValidation = validateName(name);
    if (!nameValidation.valid) {
      return NextResponse.json(
        { error: nameValidation.error },
        { status: 400 }
      );
    }

    // ✅ NUEVA: Validar teléfono
    const phoneValidation = validatePhone(phone);
    if (!phoneValidation.valid) {
      return NextResponse.json(
        { error: phoneValidation.error },
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

    // ✅ Verificar si el teléfono ya existe (opcional)
    const existingPhone = db
      .prepare("SELECT id FROM users WHERE phone = ?")
      .get(phone);
    if (existingPhone) {
      return NextResponse.json(
        { error: "El número de teléfono ya está registrado" },
        { status: 400 }
      );
    }

    // Hashear contraseña
    const hashedPassword = await bcrypt.hash(password, 10);

    // ✅ Modificar INSERT para incluir el teléfono
    const stmt = db.prepare(
      "INSERT INTO users (name, email, phone, password, role) VALUES (?, ?, ?, ?, ?)"
    );
    const result = stmt.run(
      name.trim(),
      email,
      phone,
      hashedPassword,
      "cliente"
    );

    return NextResponse.json(
      {
        success: true,
        user: { id: result.lastInsertRowid, name: name.trim(), email, phone }
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
