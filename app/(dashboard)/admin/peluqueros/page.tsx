"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Sidebar from "@/components/Sidebar";
import ReassignModal from "@/components/admin/ReassignModal";
import { toast } from "sonner";
import type { Absence, Appointment, Barber, ScheduleDay } from "@/lib/types";
import type { SessionUser } from "@/lib/types";
import { DAY_NAMES, formatCurrency, formatDateShort, toISODate } from "@/lib/types";

const BARBER_COLORS = ["#f59e0b", "#ef4444", "#3b82f6", "#10b981", "#8b5cf6", "#ec4899", "#14b8a6", "#f97316"];

const emptyWeek = (): ScheduleDay[] =>
  DAY_NAMES.map((d) => ({
    day_of_week: d.value,
    is_working: true,
    start_time: "09:00",
    end_time: "18:00",
    break_start: "12:00",
    break_end: "14:00"
  }));

export default function AdminBarbersPage() {
  const [barbers, setBarbers] = useState<Barber[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [absences, setAbsences] = useState<Absence[]>([]);
  const [user, setUser] = useState<SessionUser | null>(null);
  const [loading, setLoading] = useState(true);

  const [editBarber, setEditBarber] = useState<Barber | null>(null);
  const [showBarberModal, setShowBarberModal] = useState(false);
  const [isNew, setIsNew] = useState(false);

  const [scheduleBarber, setScheduleBarber] = useState<Barber | null>(null);
  const [week, setWeek] = useState<ScheduleDay[]>(emptyWeek());
  const [savingSchedules, setSavingSchedules] = useState(false);

  const [absenceBarber, setAbsenceBarber] = useState<Barber | null>(null);
  const [showAbsenceModal, setShowAbsenceModal] = useState(false);

  const [reassignTarget, setReassignTarget] = useState<Appointment | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Barber | null>(null);

  const mounted = useRef(false);

  const fetchAll = useCallback(async () => {
    try {
      const [b, a, ab, u] = await Promise.all([
        fetch("/api/admin/barbers"),
        fetch("/api/admin/appointments"),
        fetch("/api/admin/absences"),
        fetch("/api/auth/me")
      ]);
      const bd = await b.json();
      const ad = await a.json();
      const abd = await ab.json();
      const ud = await u.json();
      setBarbers(bd.barbers || []);
      setAppointments(ad.appointments || []);
      setAbsences(abd.absences || []);
      setUser(ud.user || null);
    } catch (error) {
      console.error(error);
      toast.error("Error al cargar datos");
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
    setEditBarber(null);
    setIsNew(true);
    setShowBarberModal(true);
  };

  const openEdit = (b: Barber) => {
    setEditBarber(b);
    setIsNew(false);
    setShowBarberModal(true);
  };

  const openSchedules = async (b: Barber) => {
    setScheduleBarber(b);
    try {
      const res = await fetch(`/api/admin/barbers/schedules?barberId=${b.id}`);
      const data = await res.json();
      if (data.schedules?.length) {
        const map = new Map<number, ScheduleDay>();
        for (const s of data.schedules) {
          map.set(s.day_of_week, {
            day_of_week: s.day_of_week,
            is_working: s.is_working === 1,
            start_time: s.start_time || "09:00",
            end_time: s.end_time || "18:00",
            break_start: s.break_start,
            break_end: s.break_end
          });
        }
        setWeek(DAY_NAMES.map((d) => map.get(d.value) || { day_of_week: d.value, is_working: false, start_time: "09:00", end_time: "18:00", break_start: null, break_end: null }));
      } else {
        setWeek(emptyWeek());
      }
    } catch (error) {
      console.error(error);
      toast.error("Error al cargar horarios");
    }
  };

  const saveSchedules = async () => {
    if (!scheduleBarber) return;
    setSavingSchedules(true);
    try {
      const res = await fetch("/api/admin/barbers/schedules", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ barberId: scheduleBarber.id, days: week })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error al guardar");
      toast.success("Horarios guardados");
      setScheduleBarber(null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Error al guardar horarios");
    } finally {
      setSavingSchedules(false);
    }
  };

  const saveBarber = async (payload: { name: string; phone: string; color: string; active: boolean; notes: string }) => {
    try {
      const res = await fetch("/api/admin/barbers", {
        method: isNew ? "POST" : "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(isNew ? payload : { id: editBarber?.id, ...payload })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error al guardar");
      toast.success(isNew ? "Peluquero creado" : "Peluquero actualizado");
      setShowBarberModal(false);
      fetchAll();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Error al guardar");
    }
  };

  const createAbsence = async (payload: { barberId: number; date: string; endDate: string; reason: string }) => {
    try {
      const res = await fetch("/api/admin/absences", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error al registrar");
      toast.success("Novedad registrada. Revisa las citas afectadas.");
      setShowAbsenceModal(false);
      fetchAll();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Error al registrar la novedad");
    }
  };

  const removeAbsence = async (id: number) => {
    try {
      const res = await fetch(`/api/admin/absences?id=${id}`, { method: "DELETE" });
      if (res.ok) {
        toast.success("Novedad eliminada");
        fetchAll();
      }
    } catch (error) {
      console.error(error);
    }
  };

  const deleteBarber = async (b: Barber) => {
    try {
      const res = await fetch(`/api/admin/barbers?id=${b.id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error al eliminar");
      toast.success("Peluquero eliminado");
      setDeleteTarget(null);
      fetchAll();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Error al eliminar");
      setDeleteTarget(null);
    }
  };

  const toggleActive = async (b: Barber) => {
    try {
      const res = await fetch("/api/admin/barbers", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: b.id, name: b.name, phone: b.phone, color: b.color, active: b.active ? 0 : 1, notes: b.notes })
      });
      if (res.ok) {
        toast.success(b.active ? "Peluquero desactivado" : "Peluquero activado");
        fetchAll();
      }
    } catch (error) {
      console.error(error);
    }
  };

  const affectedForAbsence = (abs: Absence): Appointment[] => {
    const end = abs.end_date || abs.date;
    return appointments.filter(
      (a) =>
        a.barber_id === abs.barber_id &&
        a.date >= abs.date &&
        a.date <= end &&
        a.status !== "cancelada"
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen">
        <Sidebar userName={user?.name} userRole={user?.role} />
        <main className="md:pl-60 p-8 text-stone-500">Cargando peluqueros...</main>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <Sidebar userName={user?.name} userRole={user?.role} />
      <main className="md:pl-60">
        <div className="p-4 md:p-8 max-w-7xl mx-auto">
          <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-stone-50">💈 Peluqueros</h1>
              <p className="text-stone-500 mt-1 text-sm">Gestiona tu equipo, horarios semanales y novedades</p>
            </div>
            <button onClick={openCreate} className="btn btn-primary">➕ Nuevo Peluquero</button>
          </div>

          {/* Tarjetas de peluqueros */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {barbers.map((b) => (
              <div key={b.id} className={`card p-5 ${!b.active ? "opacity-60" : ""}`}>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-12 h-12 rounded-xl flex items-center justify-center text-lg font-bold text-stone-950 shrink-0"
                      style={{ backgroundColor: b.color }}
                    >
                      {b.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <h3 className="font-semibold text-stone-100">{b.name}</h3>
                      <p className="text-xs text-stone-500">{b.phone || "Sin teléfono"}</p>
                    </div>
                  </div>
                  <span className={`badge ${b.active ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30" : "bg-stone-700/50 text-stone-400 border border-stone-700"}`}>
                    {b.active ? "Activo" : "Inactivo"}
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2 mt-4 text-center">
                  <div className="p-2 bg-stone-800/60 rounded-lg">
                    <p className="text-lg font-bold text-stone-100">{b.total_appointments}</p>
                    <p className="text-[10px] text-stone-500 uppercase tracking-wide">Citas</p>
                  </div>
                  <div className="p-2 bg-stone-800/60 rounded-lg">
                    <p className="text-lg font-bold text-emerald-400">{formatCurrency(b.total_revenue)}</p>
                    <p className="text-[10px] text-stone-500 uppercase tracking-wide">Ingresos</p>
                  </div>
                  <div className="p-2 bg-stone-800/60 rounded-lg">
                    <p className="text-lg font-bold text-amber-400">{b.upcoming_appointments}</p>
                    <p className="text-[10px] text-stone-500 uppercase tracking-wide">Próximas</p>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2 mt-4">
                  <button onClick={() => openEdit(b)} className="btn btn-ghost flex-1 text-xs py-1.5">✏️ Editar</button>
                  <button onClick={() => openSchedules(b)} className="btn btn-ghost flex-1 text-xs py-1.5">🕒 Horarios</button>
                  <button onClick={() => { setAbsenceBarber(b); setShowAbsenceModal(true); }} className="btn btn-ghost flex-1 text-xs py-1.5">⚠️ Novedad</button>
                </div>
                <div className="flex gap-2 mt-2">
                  <button onClick={() => toggleActive(b)} className="btn btn-ghost flex-1 text-xs py-1.5">
                    {b.active ? "⏸ Desactivar" : "▶ Activar"}
                  </button>
                  <button onClick={() => setDeleteTarget(b)} className="btn btn-danger flex-1 text-xs py-1.5">🗑️ Eliminar</button>
                </div>
              </div>
            ))}
          </div>

          {/* Novedades activas */}
          <h2 className="text-lg font-semibold text-stone-100 mt-8 mb-4">⚠️ Novedades registradas</h2>
          {absences.length === 0 ? (
            <div className="card p-8 text-center text-stone-500 text-sm">
              No hay novedades registradas. Si un peluquero no puede asistir, regístrala para reasignar sus citas.
            </div>
          ) : (
            <div className="space-y-3">
              {absences.map((abs) => {
                const affected = affectedForAbsence(abs);
                return (
                  <div key={abs.id} className="card p-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <span className="w-3 h-3 rounded-full" style={{ backgroundColor: abs.barber_color }} />
                        <div>
                          <p className="font-semibold text-stone-100">{abs.barber_name}</p>
                          <p className="text-xs text-stone-500">
                            📅 {formatDateShort(abs.date)} {abs.end_date ? `— ${formatDateShort(abs.end_date)}` : ""}
                            {abs.reason ? ` · ${abs.reason}` : ""}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="badge bg-red-500/15 text-red-400 border border-red-500/30">
                          {affected.length} cita(s) afectada(s)
                        </span>
                        <button onClick={() => removeAbsence(abs.id)} className="btn btn-danger text-xs py-1.5">Quitar novedad</button>
                      </div>
                    </div>

                    {affected.length > 0 && (
                      <div className="mt-3 space-y-2">
                        {affected.map((a) => (
                          <div key={a.id} className="flex flex-wrap items-center justify-between gap-2 p-3 bg-stone-800/60 rounded-lg">
                            <div>
                              <p className="text-sm text-stone-200">{a.client_name} · {a.service_name}</p>
                              <p className="text-xs text-stone-500">{formatDateShort(a.date)} a las {a.time} · {a.confirmation_code}</p>
                            </div>
                            <button onClick={() => setReassignTarget(a)} className="btn btn-primary text-xs py-1.5">
                              🔄 Reasignar
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>

      {/* Modal crear/editar peluquero */}
      {showBarberModal && (
        <BarberFormModal
          isNew={isNew}
          barber={editBarber}
          onClose={() => setShowBarberModal(false)}
          onSave={saveBarber}
        />
      )}

      {/* Modal horarios */}
      {scheduleBarber && (
        <div className="modal-overlay" onClick={() => setScheduleBarber(null)}>
          <div className="modal-card max-w-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="p-5 border-b border-stone-800 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-stone-50">🕒 Horarios — {scheduleBarber.name}</h3>
                <p className="text-sm text-stone-400 mt-0.5">Configura la semana: días de trabajo, rango y descanso</p>
              </div>
              <button onClick={() => setScheduleBarber(null)} className="text-stone-400 hover:text-white text-xl">×</button>
            </div>

            <div className="p-5 space-y-3">
              {week.map((day) => (
                <div key={day.day_of_week} className={`p-3 rounded-xl border transition-colors ${day.is_working ? "bg-stone-800/50 border-stone-700" : "bg-stone-900 border-stone-800 opacity-60"}`}>
                  <div className="flex flex-wrap items-center gap-3">
                    <button
                      onClick={() => setWeek((prev) => prev.map((d) => d.day_of_week === day.day_of_week ? { ...d, is_working: !d.is_working } : d))}
                      className={`w-24 text-sm font-medium px-3 py-2 rounded-lg transition-colors ${
                        day.is_working ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30" : "bg-stone-800 text-stone-400 border border-stone-700"
                      }`}
                    >
                      {day.is_working ? "✓ Trabaja" : "Descansa"} · {DAY_NAMES.find((d) => d.value === day.day_of_week)?.short}
                    </button>
                    {day.is_working && (
                      <>
                        <div className="flex items-center gap-1 text-xs text-stone-400">
                          <span>Entrada</span>
                          <input
                            type="time"
                            value={day.start_time}
                            onChange={(e) => setWeek((prev) => prev.map((d) => d.day_of_week === day.day_of_week ? { ...d, start_time: e.target.value } : d))}
                            className="input w-28 py-1.5 text-sm"
                          />
                        </div>
                        <div className="flex items-center gap-1 text-xs text-stone-400">
                          <span>Salida</span>
                          <input
                            type="time"
                            value={day.end_time}
                            onChange={(e) => setWeek((prev) => prev.map((d) => d.day_of_week === day.day_of_week ? { ...d, end_time: e.target.value } : d))}
                            className="input w-28 py-1.5 text-sm"
                          />
                        </div>
                        <div className="flex items-center gap-1 text-xs text-stone-400">
                          <span>Descanso</span>
                          <input
                            type="time"
                            value={day.break_start || ""}
                            onChange={(e) => setWeek((prev) => prev.map((d) => d.day_of_week === day.day_of_week ? { ...d, break_start: e.target.value || null } : d))}
                            className="input w-28 py-1.5 text-sm"
                          />
                          <span>a</span>
                          <input
                            type="time"
                            value={day.break_end || ""}
                            onChange={(e) => setWeek((prev) => prev.map((d) => d.day_of_week === day.day_of_week ? { ...d, break_end: e.target.value || null } : d))}
                            className="input w-28 py-1.5 text-sm"
                          />
                        </div>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div className="flex gap-3 p-5 border-t border-stone-800">
              <button onClick={() => setScheduleBarber(null)} className="btn btn-ghost flex-1">Cancelar</button>
              <button onClick={saveSchedules} disabled={savingSchedules} className="btn btn-primary flex-1">
                {savingSchedules ? "Guardando..." : "Guardar Horarios"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal novedad */}
      {showAbsenceModal && absenceBarber && (
        <AbsenceFormModal
          barber={absenceBarber}
          onClose={() => setShowAbsenceModal(false)}
          onSave={createAbsence}
        />
      )}

      <ReassignModal open={!!reassignTarget} appointment={reassignTarget} onClose={() => setReassignTarget(null)} onReassigned={fetchAll} />

      {/* Confirmar eliminación de peluquero */}
      {deleteTarget && (
        <div className="modal-overlay" onClick={() => setDeleteTarget(null)}>
          <div className="modal-card max-w-md" onClick={(e) => e.stopPropagation()}>
            <div className="p-5 border-b border-stone-800">
              <h3 className="text-lg font-bold text-red-400">Eliminar peluquero</h3>
            </div>
            <div className="p-5">
              <p className="text-stone-300">
                ¿Eliminar a <strong className="text-stone-100">{deleteTarget.name}</strong>?
              </p>
              <p className="text-xs text-stone-500 mt-2">Si tiene citas activas, deberás desactivarlo o reasignarlas primero.</p>
            </div>
            <div className="flex gap-3 p-5 border-t border-stone-800">
              <button onClick={() => setDeleteTarget(null)} className="btn btn-ghost flex-1">Cancelar</button>
              <button onClick={() => deleteBarber(deleteTarget)} className="btn btn-danger flex-1">Eliminar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function BarberFormModal({
  isNew,
  barber,
  onClose,
  onSave
}: {
  isNew: boolean;
  barber: Barber | null;
  onClose: () => void;
  onSave: (payload: { name: string; phone: string; color: string; active: boolean; notes: string }) => void;
}) {
  const [name, setName] = useState(barber?.name || "");
  const [phone, setPhone] = useState(barber?.phone || "");
  const [color, setColor] = useState(barber?.color || BARBER_COLORS[0]);
  const [active, setActive] = useState(barber?.active !== 0);
  const [notes, setNotes] = useState(barber?.notes || "");
  const [saving, setSaving] = useState(false);

  const submit = () => {
    if (name.trim().length < 2) {
      toast.warning("El nombre debe tener al menos 2 caracteres");
      return;
    }
    setSaving(true);
    onSave({ name: name.trim(), phone: phone.trim(), color, active, notes: notes.trim() });
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="p-5 border-b border-stone-800">
          <h3 className="text-lg font-bold text-stone-50">{isNew ? "➕ Nuevo Peluquero" : "✏️ Editar Peluquero"}</h3>
        </div>
        <div className="p-5 space-y-4">
          <div>
            <label className="label">Nombre completo</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value.replace(/[^A-Za-zÁáÉéÍíÓóÚúÑñ\s]/g, ""))}
              className="input"
              placeholder="Ej: Carlos Rodríguez"
            />
          </div>
          <div>
            <label className="label">Teléfono (opcional)</label>
            <input
              type="tel"
              inputMode="numeric"
              value={phone}
              onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
              className="input"
              placeholder="3001234567"
            />
          </div>
          <div>
            <label className="label">Color de identificación</label>
            <div className="flex flex-wrap gap-2">
              {BARBER_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className={`w-8 h-8 rounded-full transition-transform ${color === c ? "ring-2 ring-offset-2 ring-offset-stone-900 ring-white scale-110" : "hover:scale-110"}`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>
          <div>
            <label className="label">Notas</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              className="input resize-none"
              placeholder="Especialidad, observaciones..."
            />
          </div>
          <div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} className="accent-amber-500 w-4 h-4" />
              <span className="text-sm text-stone-300">Peluquero activo</span>
            </label>
          </div>
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

function AbsenceFormModal({
  barber,
  onClose,
  onSave
}: {
  barber: Barber;
  onClose: () => void;
  onSave: (payload: { barberId: number; date: string; endDate: string; reason: string }) => void;
}) {
  const [date, setDate] = useState(toISODate(new Date()));
  const [endDate, setEndDate] = useState("");
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);

  const submit = () => {
    if (!date) {
      toast.warning("Selecciona la fecha de la novedad");
      return;
    }
    setSaving(true);
    onSave({ barberId: barber.id, date, endDate, reason: reason.trim() });
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="p-5 border-b border-stone-800">
          <h3 className="text-lg font-bold text-stone-50">⚠️ Registrar Novedad</h3>
          <p className="text-sm text-stone-400 mt-0.5">Ausencia de <strong className="text-amber-400">{barber.name}</strong></p>
        </div>
        <div className="p-5 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Desde</label>
              <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="input" />
            </div>
            <div>
              <label className="label">Hasta (opcional)</label>
              <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="input" />
            </div>
          </div>
          <div>
            <label className="label">Motivo</label>
            <input
              type="text"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="input"
              placeholder="Ej: incapacidad, cita médica, viaje..."
            />
          </div>
          <p className="text-xs text-stone-500">
            Al guardar, sus citas quedarán marcadas y podrás reasignarlas a otro peluquero.
          </p>
        </div>
        <div className="flex gap-3 p-5 border-t border-stone-800">
          <button onClick={onClose} disabled={saving} className="btn btn-ghost flex-1">Cancelar</button>
          <button onClick={submit} disabled={saving} className="btn btn-danger flex-1">
            {saving ? "Registrando..." : "Registrar Novedad"}
          </button>
        </div>
      </div>
    </div>
  );
}