import type { LicenseStatus } from "@/lib/license";

const STATUS_TEXT: Record<LicenseStatus["status"], { title: string; icon: string; hint: string }> = {
  missing: {
    title: "Sin licencia",
    icon: "🔑",
    hint: "Este equipo no tiene un archivo de licencia (license.json). Comunícate con tu proveedor para activar el sistema."
  },
  invalid: {
    title: "Licencia no válida",
    icon: "⛔",
    hint: "La licencia instalada no es válida. Verifica el archivo license.json o solicita una nueva a tu proveedor."
  },
  expired: {
    title: "Licencia vencida",
    icon: "⏳",
    hint: "La licencia de este negocio ha vencido. Contacta a tu proveedor para renovarla."
  },
  valid: {
    title: "Sistema activo",
    icon: "✅",
    hint: ""
  }
};

export default function LicenseBlock({ status }: { status: LicenseStatus }) {
  const meta = STATUS_TEXT[status.status];

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-md text-center">
        <div className="text-5xl mb-4">{meta.icon}</div>
        <h1 className="text-2xl font-bold text-stone-50 mb-2">{meta.title}</h1>
        {status.business && (
          <p className="text-amber-400 font-medium mb-2">{status.business}</p>
        )}
        <p className="text-stone-400 mb-6">{meta.hint}</p>

        {status.status === "expired" && status.expiresAt && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 text-sm text-red-300">
            Vencimiento: {status.expiresAt}
          </div>
        )}
        {status.status === "valid" && status.daysLeft !== undefined && (
          <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-4 text-sm text-emerald-300">
            Licencia vigente · vence el {status.expiresAt} ({status.daysLeft} días restantes)
          </div>
        )}

        <p className="text-xs text-stone-600 mt-8">
          BarberTrack © {new Date().getFullYear()} · Sistema de gestión de barbería
        </p>
      </div>
    </div>
  );
}