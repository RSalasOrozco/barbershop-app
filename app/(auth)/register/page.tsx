"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

// Función de validación de email
const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

// ✅ Función de validación de nombre
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

  const keyboardPatterns = [
    "asdf",
    "qwer",
    "zxcv",
    "hjkl",
    "tyui",
    "1234",
    "abcd"
  ];
  const lowerName = name.toLowerCase();
  for (const pattern of keyboardPatterns) {
    if (lowerName.includes(pattern)) {
      return { valid: false, error: "Por favor ingresa un nombre real" };
    }
  }

  if (!name.includes(" ")) {
    return {
      valid: true,
      error: "⚠️ Recomendamos ingresar nombre y apellido"
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
    return {
      valid: false,
      error: "El número debe tener 10 dígitos (ej: 3001234567)"
    };
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

export default function RegisterPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState(""); // ✅ NUEVO: estado para teléfono
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [warning, setWarning] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setWarning("");

    // Validación de nombre
    const nameValidation = validateName(name);
    if (!nameValidation.valid) {
      setError(nameValidation.error);
      setLoading(false);
      return;
    }

    if (nameValidation.error) {
      setWarning(nameValidation.error);
    }

    // ✅ NUEVA: Validación de teléfono
    const phoneValidation = validatePhone(phone);
    if (!phoneValidation.valid) {
      setError(phoneValidation.error);
      setLoading(false);
      return;
    }

    // Validación de email
    if (!validateEmail(email)) {
      setError(
        "Por favor ingresa un correo electrónico válido (ejemplo@dominio.com)"
      );
      setLoading(false);
      return;
    }

    // Validación de contraseña
    if (password.length < 6) {
      setError("La contraseña debe tener al menos 6 caracteres");
      setLoading(false);
      return;
    }

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          email,
          phone: phone.replace(/[\s\-\(\)]/g, ""), // ✅ Enviar teléfono limpio
          password
        })
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Error al registrar");
      }

      router.push("/login?registered=true");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setName(value);
    if (error) setError("");
    if (warning) setWarning("");
  };

  // ✅ NUEVA: Función para formatear teléfono mientras escribe
  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, ""); // Solo números
    if (value.length <= 10) {
      setPhone(value);
    }
    if (error) setError("");
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-gray-900 py-8">
      <div className="bg-white dark:bg-gray-800 p-8 rounded-lg shadow-md w-full max-w-md">
        <h1 className="text-2xl font-bold mb-6 text-center text-gray-900 dark:text-white">
          Crear Cuenta
        </h1>

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            ❌ {error}
          </div>
        )}

        {warning && (
          <div className="bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded mb-4">
            {warning}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Nombre Completo *
            </label>
            <input
              type="text"
              value={name}
              onChange={handleNameChange}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
              required
              disabled={loading}
              placeholder="Ej: Juan Pérez"
            />
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              ✅ Solo letras y espacios. Mínimo 2 caracteres.
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Correo Electrónico *
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
              required
              disabled={loading}
              placeholder="ejemplo@correo.com"
            />
          </div>

          {/* ✅ NUEVO: Campo de Teléfono */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Número de Celular *
            </label>
            <input
              type="tel"
              value={phone}
              onChange={handlePhoneChange}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
              required
              disabled={loading}
              placeholder="3001234567"
              maxLength={10}
            />
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              📱 Número de celular a 10 dígitos (ej: 3001234567)
            </p>
            <p className="text-xs text-green-600 dark:text-green-400 mt-0.5">
              ✅ Recibirás confirmación de tus citas por WhatsApp
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Contraseña *
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
              required
              minLength={6}
              disabled={loading}
              placeholder="••••••••"
            />
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Mínimo 6 caracteres
            </p>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? "Creando cuenta..." : "Registrarse"}
          </button>
        </form>

        <p className="mt-4 text-center text-sm text-gray-600 dark:text-gray-400">
          ¿Ya tienes cuenta?{" "}
          <Link
            href="/login"
            className="text-blue-600 hover:text-blue-700 dark:text-blue-400 font-medium"
          >
            Inicia Sesión
          </Link>
        </p>
      </div>
    </div>
  );
}
