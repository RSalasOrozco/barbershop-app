"use client";

import { useCallback, useEffect, useState } from "react";
import Sidebar from "@/components/Sidebar";
import { toast } from "sonner";
import type { SessionUser } from "@/lib/types";

interface LicenseInfo {
  status: "valid" | "expired" | "invalid" | "missing";
  valid: boolean;
  business?: string;
  issuedAt?: string;
  expiresAt?: string;
  maxBarbers?: number;
  daysLeft?: number;
  reason?: string;
}

interface BackupInfo {
  name: string;
  size: number;
  createdAt: string;
}

const LICENSE_BADGE: Record<string, { label: string; cls: string }> = {
  valid: { label: "Activa", cls: "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30" },
  expired: { label: "Vencida", cls: "bg-red-500/15 text-red-400 border border-red-500/30" },
  invalid: { label: "No válida", cls: "bg-red-500/15 text-red-400 border border-red-500/30" },
  missing: { label: "Sin licencia", cls: "bg-amber-500/15 text-amber-400 border border-amber-500/30" }
};

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("es-ES", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
}

export default function SistemaPage() {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [license, setLicense] = useState<LicenseInfo | null>(null);
  const [backups, setBackups] = useState<BackupInfo[]>([]);
  const [creatingBackup, setCreatingBackup] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const meRes = await fetch("/api/auth/me");
      if (meRes.ok) {
        const me = await meRes.json();
        setUser(me.user);
      }
      const licRes = await fetch("/api/admin/license");
      if (licRes.ok) {
        const lic = await licRes.json();
        setLicense(lic.license);
      }
      const bakRes = await fetch("/api/admin/backup");
      if (bakRes.ok) {
        const bak = await bakRes.json();
        setBackups(bak.backups || []);
      }
    } catch (error) {
      console.error(error);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const createBackup = async () => {
    setCreatingBackup(true);
    try {
      const res = await fetch("/api/admin/backup", { method: "POST" });
      const data = await res.json();
      if (res.ok) {
        toast.success(`Backup creado: ${data.filename}`);
        setBackups(data.backups || []);
      } else {
        toast.error(data.error || "Error al crear el backup");
      }
    } catch (error) {
      console.error(error);
      toast.error("Error al crear el backup");
    } finally {
      setCreatingBackup(false);
    }
  };

  const badge = license ? LICENSE_BADGE[license.status] : null;

  return (
    <div className="min-h-screen">
      <Sidebar userName={user?.name} userRole={user?.role} />
      <main className="md:pl-60">
        <div className="p-4 md:p-8 max-w-5xl mx-auto">
          <div className="mb-6">
            <h1 className="text-2xl md:text-3xl font-bold text-stone-50">⚙️ Sistema</h1>
            <p className="text-stone-500 mt-1 text-sm">Licencia, respaldo de datos y mantenimiento</p>
          </div>

          {/* Licencia */}
          <div className="card p-5 mb-6">
            <div className="flex items-center justify-between gap-3 mb-4">
              <h2 className="text-base font-semibold text-stone-100">🔑 Licencia</h2>
              {badge && (
                <span className={`badge ${badge.cls}`}>{badge.label}</span>
              )}
            </div>

            {!license ? (
              <p className="text-sm text-stone-500">Cargando licencia...</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="stat-label">Negocio</p>
                  <p className="text-lg font-bold text-stone-50 mt-1">
                    {license.business || "—"}
                  </p>
                </div>
                <div>
                  <p className="stat-label">Vencimiento</p>
                  <p className="text-lg font-bold text-stone-50 mt-1">
                    {license.expiresAt ? (
                      <>
                        {license.expiresAt}
                        {license.daysLeft !== undefined && (
                          <span className={`text-sm font-medium ml-2 ${license.daysLeft <= 30 ? "text-amber-400" : "text-emerald-400"}`}>
                            ({license.daysLeft} días)
                          </span>
                        )}
                      </>
                    ) : "—"}
                  </p>
                </div>
                <div>
                  <p className="stat-label">Emitida</p>
                  <p className="text-stone-200 mt-1">{license.issuedAt || "—"}</p>
                </div>
                <div>
                  <p className="stat-label">Peluqueros permitidos</p>
                  <p className="text-stone-200 mt-1">{license.maxBarbers ?? "—"}</p>
                </div>
              </div>
            )}

            {license && !license.valid && (
              <div className="mt-4 p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-sm text-red-300">
                {license.reason}. Contacta a tu proveedor para renovar.
              </div>
            )}
          </div>

          {/* Backups */}
          <div className="card p-5">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
              <div>
                <h2 className="text-base font-semibold text-stone-100">💾 Respaldo de datos</h2>
                <p className="text-xs text-stone-500 mt-0.5">
                  La base de datos es un solo archivo (barbershop.db). Se conservan las últimas 30 copias.
                </p>
              </div>
              <button onClick={createBackup} disabled={creatingBackup} className="btn btn-primary">
                {creatingBackup ? "Creando..." : "Crear backup ahora"}
              </button>
            </div>

            {backups.length === 0 ? (
              <p className="text-sm text-stone-500 text-center py-6">
                Aún no hay backups. Crea el primero pulsando el botón.
              </p>
            ) : (
              <div className="space-y-2">
                {backups.map((b) => (
                  <div key={b.name} className="flex items-center justify-between gap-3 p-3 rounded-xl bg-stone-800/50 border border-stone-700/60">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-stone-200 truncate">{b.name}</p>
                      <p className="text-xs text-stone-500">{formatDateTime(b.createdAt)} · {formatSize(b.size)}</p>
                    </div>
                    <a
                      href={`/api/admin/backup?download=${encodeURIComponent(b.name)}`}
                      className="btn btn-ghost !px-3 !py-1.5 text-xs shrink-0"
                    >
                      ⬇️ Descargar
                    </a>
                  </div>
                ))}
              </div>
            )}
          </div>

          <p className="text-xs text-stone-600 mt-6">
            BarberTrack © {new Date().getFullYear()} · Sistema de gestión de barbería
          </p>
        </div>
      </main>
    </div>
  );
}