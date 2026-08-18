"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";

// ✅ Función de validación de email (AGREGADA)
const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

// ✅ Función de validación de teléfono
const validatePhone = (phone: string): boolean => {
  const clean = phone.replace(/[\s\-\(\)]/g, "");
  return /^\d+$/.test(clean) && clean.length === 10 && clean.startsWith("3");
};

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const justRegistered = searchParams.get("registered");

  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const showError = (message: string, notRegistered = false) => {
    if (notRegistered) {
      toast.error(`❌ ${message}`, {
        action: {
          label: "Registrarse",
          onClick: () => router.push("/register")
        }
      });
    } else {
      toast.error(`❌ ${message}`);
    }
  };

  useEffect(() => {
    if (justRegistered) {
      toast.success(
        "✅ Cuenta creada exitosamente. Ahora puedes iniciar sesión."
      );
    }
  }, [justRegistered]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const value = identifier.trim();
    const isEmail = value.includes("@");

    if (isEmail) {
      if (!validateEmail(value)) {
        showError(
          "Por favor ingresa un correo electrónico válido (ejemplo@dominio.com)"
        );
        setLoading(false);
        return;
      }
    } else if (!validatePhone(value)) {
      showError(
        "El teléfono debe tener 10 dígitos y empezar con 3 (celular Colombia)"
      );
      setLoading(false);
      return;
    }

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier: value, password })
      });

      const data = await res.json();

      if (!res.ok) {
        const notRegistered = data.code === "USER_NOT_FOUND";
        showError(
          data.error || "Error al iniciar sesión",
          notRegistered
        );
        return;
      }

      // Login exitoso
      toast.success(`✅ ¡Hola, ${data.user.name}! 👋`);

      // Redirigir según el rol
      if (data.user.role === "admin") {
        router.push("/admin");
      } else {
        router.push("/cliente");
      }

      router.refresh(); // Importante para actualizar el estado del cliente
    } catch (err) {
      showError(
        err instanceof Error ? err.message : "Error al iniciar sesión"
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-gray-900">
      <div className="bg-white dark:bg-gray-800 p-8 rounded-lg shadow-md w-full max-w-md">
        <h1 className="text-2xl font-bold mb-6 text-center text-gray-900 dark:text-white">
          Iniciar Sesión
        </h1>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Correo o Teléfono
            </label>
            <input
              type="text"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
              required
              disabled={loading}
              placeholder="ejemplo@correo.com o 3001234567"
            />
            {/* ✅ Mensaje de ayuda (AGREGADO) */}
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Usa tu correo electrónico o tu número de celular (10 dígitos)
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Contraseña
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
              required
              disabled={loading}
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? "Iniciando sesión..." : "Ingresar"}
          </button>
        </form>

        <p className="mt-4 text-center text-sm text-gray-600 dark:text-gray-400">
          ¿No tienes cuenta?{" "}
          <Link
            href="/register"
            className="text-blue-600 hover:text-blue-700 dark:text-blue-400 font-medium"
          >
            Regístrate aquí
          </Link>
        </p>

        <div className="mt-6 p-4 bg-gray-50 dark:bg-gray-700 rounded-md">
          <p className="text-xs text-gray-600 dark:text-gray-300 mb-2 font-semibold">
            🔑 Credenciales de prueba:
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Admin: admin@barber.com / admin123
          </p>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}
