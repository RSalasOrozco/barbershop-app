"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";

const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

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

  useEffect(() => {
    if (justRegistered) {
      toast.success("Cuenta creada. Ahora puedes iniciar sesión.");
    }
  }, [justRegistered]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const value = identifier.trim();
    const isEmail = value.includes("@");

    if (isEmail) {
      if (!validateEmail(value)) {
        toast.error("Ingresa un correo electrónico válido");
        setLoading(false);
        return;
      }
    } else if (!validatePhone(value)) {
      toast.error("El teléfono debe tener 10 dígitos y empezar con 3");
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
        toast.error(data.error || "Error al iniciar sesión");
        return;
      }

      if (data.user.role !== "admin") {
        toast.error("El acceso de clientes está desactivado. Contacta al administrador.");
        setLoading(false);
        return;
      }

      toast.success(`¡Hola, ${data.user.name}!`);
      router.push("/admin");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al iniciar sesión");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-stone-950 relative overflow-hidden">
      {/* Decoración de fondo */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(245,158,11,0.12),transparent_55%),radial-gradient(ellipse_at_bottom_left,rgba(245,158,11,0.08),transparent_55%)]" />

      <div className="relative w-full max-w-md px-4">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-500 to-amber-700 shadow-xl shadow-amber-900/40 mb-4">
            <span className="text-3xl">💈</span>
          </div>
          <h1 className="text-3xl font-bold text-stone-50 tracking-tight">BarberTrack</h1>
          <p className="text-stone-500 mt-1 text-sm">Panel de administración local</p>
        </div>

        <div className="card p-8">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="label">Correo o Teléfono</label>
              <input
                type="text"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                className="input"
                required
                disabled={loading}
                placeholder="admin@barber.com o 3001234567"
                autoComplete="username"
              />
            </div>

            <div>
              <label className="label">Contraseña</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input"
                required
                disabled={loading}
                placeholder="••••••••"
                autoComplete="current-password"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn btn-primary w-full py-2.5 text-base"
            >
              {loading ? "Iniciando sesión..." : "Ingresar"}
            </button>
          </form>
        </div>

        <div className="mt-6 card p-4 bg-stone-900/60">
          <p className="text-xs text-stone-400 font-semibold mb-1">🔑 Credenciales de prueba</p>
          <p className="text-xs text-stone-500">Admin: admin@barber.com / admin123</p>
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