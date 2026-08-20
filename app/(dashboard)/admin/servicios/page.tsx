"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Sidebar from "@/components/Sidebar";
import { toast } from "sonner";
import type { Service, SessionUser } from "@/lib/types";
import { formatCurrency } from "@/lib/types";

export default function AdminServicesPage() {
  const [services, setServices] = useState<Service[]>([]);
  const [user, setUser] = useState<SessionUser | null>(null);
  const [loading, setLoading] = useState(true);

  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Service | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Service | null>(null);

  const mounted = useRef(false);

  const fetchAll = useCallback(async () => {
    try {
      const [s, u] = await Promise.all([fetch("/api/services"), fetch("/api/auth/me")]);
      const sd = await s.json();
      const ud = await u.json();
      setServices(sd.services || []);
      setUser(ud.user || null);
    } catch (error) {
      console.error(error);
      toast.error("Error al cargar servicios");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (mounted.current) return;
    mounted.current = true;
    fetchAll();
  }, [fetchAll]);

  const openCreate = () => {
    setEditing(null);
    setIsNew(true);
    setShowModal(true);
  };

  const openEdit = (s: Service) => {
    setEditing(s);
    setIsNew(false);
    setShowModal(true);
  };

  const save = async (payload: { name: string; price: number; duration: number }) => {
    try {
      const res = await fetch("/api/services", {
        method: isNew ? "POST" : "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(isNew ? payload : { id: editing?.id, ...payload })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error al guardar");
      toast.success(isNew ? "Servicio creado" : "Servicio actualizado");
      setShowModal(false);
      fetchAll();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Error al guardar");
    }
  };

  const remove = async (s: Service) => {
    try {
      const res = await fetch(`/api/services?id=${s.id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error al eliminar");
      toast.success("Servicio eliminado");
      setDeleteTarget(null);
      fetchAll();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Error al eliminar");
      setDeleteTarget(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen">
        <Sidebar userName={user?.name} userRole={user?.role} />
        <main className="md:pl-60 p-8 text-stone-500">Cargando servicios...</main>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <Sidebar userName={user?.name} userRole={user?.role} />
      <main className="md:pl-60">
        <div className="p-4 md:p-8 max-w-5xl mx-auto">
          <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-stone-50">✂️ Servicios</h1>
              <p className="text-stone-500 mt-1 text-sm">Catálogo de servicios con precio y duración</p>
            </div>
            <button onClick={openCreate} className="btn btn-primary">➕ Nuevo Servicio</button>
          </div>

          <div className="card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-stone-800/60">
                  <tr>
                    <th className="table-header">Servicio</th>
                    <th className="table-header">Precio</th>
                    <th className="table-header">Duración</th>
                    <th className="table-header">Citas asociadas</th>
                    <th className="table-header">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-800">
                  {services.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-10 text-center text-stone-500">
                        No hay servicios. Crea el primero.
                      </td>
                    </tr>
                  ) : (
                    services.map((s) => (
                      <tr key={s.id} className="hover:bg-stone-800/40 transition-colors">
                        <td className="table-cell">
                          <span className="text-sm font-medium text-stone-100">{s.name}</span>
                        </td>
                        <td className="table-cell text-sm text-emerald-400 font-medium">{formatCurrency(s.price)}</td>
                        <td className="table-cell">
                          <span className="badge bg-amber-500/15 text-amber-400 border border-amber-500/30">⏱ {s.duration} min</span>
                        </td>
                        <td className="table-cell text-sm text-stone-400">{s.total_appointments ?? 0}</td>
                        <td className="table-cell">
                          <div className="flex gap-2">
                            <button onClick={() => openEdit(s)} className="p-1.5 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-400 hover:bg-amber-500 hover:text-stone-950 transition-colors" title="Editar">
                              ✏️
                            </button>
                            <button onClick={() => setDeleteTarget(s)} className="p-1.5 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 hover:bg-red-500 hover:text-white transition-colors" title="Eliminar">
                              🗑️
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </main>

      {showModal && (
        <ServiceFormModal
          isNew={isNew}
          service={editing}
          onClose={() => setShowModal(false)}
          onSave={save}
        />
      )}

      {deleteTarget && (
        <div className="modal-overlay" onClick={() => setDeleteTarget(null)}>
          <div className="modal-card max-w-md" onClick={(e) => e.stopPropagation()}>
            <div className="p-5 border-b border-stone-800">
              <h3 className="text-lg font-bold text-red-400">Eliminar servicio</h3>
            </div>
            <div className="p-5">
              <p className="text-stone-300">
                ¿Eliminar el servicio <strong className="text-stone-100">{deleteTarget.name}</strong>?
              </p>
              <p className="text-xs text-stone-500 mt-2">No se puede eliminar si tiene citas asociadas.</p>
            </div>
            <div className="flex gap-3 p-5 border-t border-stone-800">
              <button onClick={() => setDeleteTarget(null)} className="btn btn-ghost flex-1">Cancelar</button>
              <button onClick={() => remove(deleteTarget)} className="btn btn-danger flex-1">Eliminar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ServiceFormModal({
  isNew,
  service,
  onClose,
  onSave
}: {
  isNew: boolean;
  service: Service | null;
  onClose: () => void;
  onSave: (payload: { name: string; price: number; duration: number }) => void;
}) {
  const [name, setName] = useState(service?.name || "");
  const [price, setPrice] = useState(String(service?.price ?? ""));
  const [duration, setDuration] = useState(String(service?.duration ?? "30"));
  const [saving, setSaving] = useState(false);

  const submit = () => {
    const p = Number(price);
    const d = Number(duration);
    if (name.trim().length < 2) {
      toast.warning("Ingresa el nombre del servicio");
      return;
    }
    if (!p || p <= 0) {
      toast.warning("Ingresa un precio válido");
      return;
    }
    if (!d || d <= 0) {
      toast.warning("Ingresa una duración válida");
      return;
    }
    setSaving(true);
    onSave({ name: name.trim(), price: p, duration: d });
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="p-5 border-b border-stone-800">
          <h3 className="text-lg font-bold text-stone-50">{isNew ? "➕ Nuevo Servicio" : "✏️ Editar Servicio"}</h3>
        </div>
        <div className="p-5 space-y-4">
          <div>
            <label className="label">Nombre</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="input"
              placeholder="Ej: Corte + Barba"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Precio (COP)</label>
              <input
                type="number"
                min={0}
                value={price}
                onChange={(e) => setPrice(e.target.value.replace(/\D/g, ""))}
                className="input"
                placeholder="25000"
              />
            </div>
            <div>
              <label className="label">Duración (minutos)</label>
              <input
                type="number"
                min={5}
                step={5}
                value={duration}
                onChange={(e) => setDuration(e.target.value.replace(/\D/g, ""))}
                className="input"
                placeholder="45"
              />
            </div>
          </div>
          <p className="text-xs text-stone-500">
            La duración define los turnos disponibles del peluquero para este servicio.
          </p>
        </div>
        <div className="flex gap-3 p-5 border-t border-stone-800">
          <button onClick={onClose} disabled={saving} className="btn btn-ghost flex-1">Cancelar</button>
          <button onClick={submit} disabled={saving} className="btn btn-primary flex-1">
            {saving ? "Guardando..." : "Guardar"}
          </button>
        </div>
      </div>
    </div>
  );
}