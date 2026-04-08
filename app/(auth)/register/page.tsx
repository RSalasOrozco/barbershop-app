"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

// Función de validación de email
const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

// ✅ Función de validación de nombre (NUEVA)
const validateName = (name: string): { valid: boolean; error: string } => {
  // 1. Longitud mínima
  if (name.length < 2) {
    return {
      valid: false,
      error: "El nombre debe tener al menos 2 caracteres"
    };
  }

  // 2. Solo letras y espacios (incluye acentos y ñ)
  const nameRegex = /^[A-Za-zÁáÉéÍíÓóÚúÑñ\s]+$/;
  if (!nameRegex.test(name)) {
    return {
      valid: false,
      error: "El nombre solo puede contener letras y espacios"
    };
  }

  // 3. No permitir solo espacios
  if (name.trim().length === 0) {
    return { valid: false, error: "El nombre no puede estar vacío" };
  }

  // 4. Detectar caracteres repetidos excesivamente (anti-spam)
  const repeatedChars = /(.)\1{4,}/; // 5 o más veces la misma letra
  if (repeatedChars.test(name)) {
    return {
      valid: false,
      error: "El nombre contiene caracteres repetidos excesivamente"
    };
  }

  // 5. Detectar patrones de teclado comunes (asdf, qwer, etc.)
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

  // 6. Advertencia: Solo tiene un nombre (sin apellido)
  if (!name.includes(" ")) {
    return {
      valid: true,
      error: "⚠️ Recomendamos ingresar nombre y apellido"
    };
  }

  return { valid: true, error: "" };
};

export default function RegisterPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [warning, setWarning] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setWarning("");

    // ✅ Validación de nombre (NUEVA)
    const nameValidation = validateName(name);
    if (!nameValidation.valid) {
      setError(nameValidation.error);
      setLoading(false);
      return;
    }

    // Si es válido pero tiene advertencia (sin apellido)
    if (nameValidation.error) {
      setWarning(nameValidation.error);
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
        body: JSON.stringify({ name: name.trim(), email, password })
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

  // ✅ Validación en tiempo real mientras escribe (NUEVA)
  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setName(value);

    // Limpiar error cuando empieza a escribir
    if (error) setError("");
    if (warning) setWarning("");
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
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
              💡 Recomendado: Ingresa nombre y apellido real
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
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Debe contener @ y un dominio válido (.com, .es, etc.)
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

        <div className="mt-6 p-4 bg-gray-50 dark:bg-gray-700 rounded-md">
          <p className="text-xs text-gray-600 dark:text-gray-300">
            <strong>📋 Ejemplos de nombres válidos:</strong>
            <br />
            ✅ Juan Pérez
            <br />
            ✅ María García López
            <br />
            ✅ José Ángel
            <br />
            ❌ asdfgh
            <br />
            ❌ 12345
            <br />❌ aaaaaa
          </p>
        </div>
      </div>
    </div>
  );
}
