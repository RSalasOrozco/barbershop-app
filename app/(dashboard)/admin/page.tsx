"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Sidebar from "@/components/Sidebar";
import NewAppointmentModal from "@/components/admin/NewAppointmentModal";
import ReassignModal from "@/components/admin/ReassignModal";
import { toast } from "sonner";
import type { Appointment, Barber, Stats } from "@/lib/types";
import { formatCurrency, formatDateShort, STATUS_META, toISODate } from "@/lib/types";
import { buildWhatsAppLink, appointmentConfirmationMessage } from "@/lib/whatsapp";

interface SessionUser {
  id: number;
  name: string;
  email: string;
  role: string;
}

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState<"citas" | "estadisticas">("citas");
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [barbers, setBarbers] = useState<Barber[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [user, setUser] = useState<SessionUser | null>(null);

  const [filterStatus, setFilterStatus] = useState("todas");
  const [filterBarber, setFilterBarber] = useState("todas");
  const [filterDate, setFilterDate] = useState("");
  const [search, setSearch] = useState("");

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  const [showNewModal, setShowNewModal] = useState(false);
  const [reassignTarget, setReassignTarget] = useState<Appointment | null>(null);

  const [confirmAction, setConfirmAction] = useState<{ id: number; status: string } | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Appointment | null>(null);

  const mounted = useRef(false);

  const fetchUserData = useCallback(async () => {
    try {
      const res = await fetch("/api/auth/me");
      if (res.ok) {
        const data = await res.json();
        setUser(data.user);
      }
    } catch (error) {
      console.error(error);
    }
  }, []);

  const fetchAppointments = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (filterStatus !== "todas") params.set("status", filterStatus);
      if (filterBarber !== "todas") params.set("barberId", filterBarber);
      if (filterDate) params.set("date", filterDate);
      if (search.trim()) params.set("search", search.trim());
      params.set("page", String(page));
      params.set("limit", String(pageSize));

      const res = await fetch(`/api/admin/appointments?${params.toString()}`);
      if (!res.ok) throw new Error("Error");
      const data = await res.json();
      setAppointments(data.appointments || []);
      setTotal(data.pagination?.total ?? 0);
      setTotalPages(data.pagination?.totalPages ?? 1);
    } catch (error) {
      console.error(error);
      toast.error("Error al cargar las citas");
    }
  }, [filterStatus, filterBarber, filterDate, search, page, pageSize]);

  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/stats");
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      }
    } catch (error) {
      console.error(error);
    }
  }, []);

  const fetchBarbers = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/barbers");
      if (res.ok) {
        const data = await res.json();
        setBarbers(data.barbers || []);
      }
    } catch (error) {
      console.error(error);
    }
  }, []);

  useEffect(() => {
    if (mounted.current) return;
    mounted.current = true;
    fetchUserData();
    fetchStats();
    fetchBarbers();
  }, [fetchUserData, fetchStats, fetchBarbers]);

  // Reiniciar página al cambiar filtros
  useEffect(() => {
    setPage(1);
  }, [filterStatus, filterBarber, filterDate, search, pageSize]);

  // Cargar citas con debounce (buscar al escribir)
  useEffect(() => {
    const t = setTimeout(() => {
      fetchAppointments();
    }, 250);
    return () => clearTimeout(t);
  }, [fetchAppointments]);

  const refresh = useCallback(() => {
    fetchAppointments();
    fetchStats();
    fetchBarbers();
  }, [fetchAppointments, fetchStats, fetchBarbers]);

  const updateStatus = async (id: number, status: string) => {
    if (!confirmAction) return;
    try {
      const res = await fetch("/api/admin/appointments", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status })
      });
      if (res.ok) {
        refresh();
        toast.success(`Cita marcada como ${STATUS_META[status]?.label || status}`);
      } else {
        toast.error("Error al actualizar la cita");
      }
    } catch (error) {
      console.error(error);
      toast.error("Error al actualizar la cita");
    } finally {
      setConfirmAction(null);
    }
  };

  const deleteAppointment = async (id: number) => {
    try {
      const res = await fetch(`/api/admin/appointments?id=${id}`, { method: "DELETE" });
      if (res.ok) {
        refresh();
        toast.success("Cita eliminada");
      } else {
        toast.error("Error al eliminar la cita");
      }
    } catch (error) {
      console.error(error);
      toast.error("Error al eliminar la cita");
    } finally {
      setDeleteTarget(null);
    }
  };

  const whatsAppLink = (a: Appointment): string | null => {
    const msg = appointmentConfirmationMessage({
      clientName: a.client_name || "",
      serviceName: a.service_name,
      barberName: a.barber_name || "",
      date: formatDateShort(a.date),
      time: a.time,
      code: a.confirmation_code || ""
    });
    return buildWhatsAppLink(a.client_phone || "", msg);
  };

  const statusSelect = (a: Appointment) => {
    const meta = STATUS_META[a.status];
    return (
      <select
        value={a.status}
        onChange={(e) => setConfirmAction({ id: a.id, status: e.target.value })}
        className={`text-xs font-semibold px-2.5 py-1.5 rounded-lg border cursor-pointer focus:outline-none ${meta.cls}`}
      >
        {Object.entries(STATUS_META).map(([key, m]) => (
          <option key={key} value={key} className="bg-stone-900 text-stone-200">
            {m.label}
          </option>
        ))}
      </select>
    );
  };

  const today = toISODate(new Date());
  const todayCount = stats?.todayAppointments ?? appointments.filter((a) => a.date === today && a.status !== "cancelada").length;

  const summaryCards = [
    { label: "Citas de Hoy", value: todayCount, sub: "no canceladas", accent: "text-amber-400" },
    { label: "Pendientes", value: stats?.pendingAppointments ?? 0, sub: "por confirmar", accent: "text-amber-400" },
    { label: "Completadas", value: stats?.completedAppointments ?? 0, sub: "total histórico", accent: "text-emerald-400" },
    { label: "Ingresos", value: formatCurrency(stats?.totalRevenue ?? 0), sub: "citas completadas", accent: "text-emerald-400" }
  ];

  return (
    <div className="min-h-screen">
      <Sidebar userName={user?.name} userRole={user?.role} />

      <main className="md:pl-60">
        <div className="p-4 md:p-8 max-w-7xl mx-auto">
          {/* Header */}
          <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-stone-50">Panel de Administración</h1>
              <p className="text-stone-500 mt-1 text-sm">Gestión de citas, peluqueros y rendimiento del negocio</p>
            </div>
            <button onClick={() => setShowNewModal(true)} className="btn btn-primary">
              📅 Nueva Cita
            </button>
          </div>

          {/* Tabs */}
          <div className="flex gap-1 border-b border-stone-800 mb-6">
            {([
              ["citas", "📋 Citas"],
              ["estadisticas", "📊 Estadísticas"]
            ] as const).map(([key, label]) => (
              <button
                key={key}
                onClick={() => setActiveTab(key)}
                className={`px-4 py-2.5 text-sm font-medium rounded-t-lg border-b-2 transition-colors ${
                  activeTab === key
                    ? "border-amber-500 text-amber-400"
                    : "border-transparent text-stone-400 hover:text-stone-200"
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {activeTab === "citas" ? (
            <>
              {/* Cards resumen */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                {summaryCards.map((c) => (
                  <div key={c.label} className="stat-card">
                    <p className="stat-label">{c.label}</p>
                    <p className={`stat-value ${c.accent}`}>{c.value}</p>
                    <p className="text-xs text-stone-500 mt-1">{c.sub}</p>
                  </div>
                ))}
              </div>

              {/* Filtros */}
              <div className="card p-4 mb-6">
                <div className="flex flex-wrap gap-3 items-end">
                  <div className="flex-1 min-w-40">
                    <label className="label">Buscar</label>
                    <input
                      type="text"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder="Cliente, teléfono, servicio, código..."
                      className="input"
                    />
                  </div>
                  <div>
                    <label className="label">Estado</label>
                    <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="input">
                      <option value="todas">Todas</option>
                      {Object.entries(STATUS_META).map(([k, m]) => (
                        <option key={k} value={k}>{m.label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="label">Peluquero</label>
                    <select value={filterBarber} onChange={(e) => setFilterBarber(e.target.value)} className="input">
                      <option value="todas">Todos</option>
                      {barbers.map((b) => (
                        <option key={b.id} value={b.id}>{b.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="label">Fecha</label>
                    <input type="date" value={filterDate} onChange={(e) => setFilterDate(e.target.value)} className="input" />
                  </div>
                  <button onClick={refresh} className="btn btn-ghost">🔄 Actualizar</button>
                </div>
              </div>

              {/* Tabla */}
              <div className="card overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[900px]">
                    <thead className="bg-stone-800/60">
                      <tr>
                        <th className="table-header">Cliente</th>
                        <th className="table-header">Servicio</th>
                        <th className="table-header">Peluquero</th>
                        <th className="table-header">Código</th>
                        <th className="table-header">Fecha/Hora</th>
                        <th className="table-header">Precio</th>
                        <th className="table-header">Estado</th>
                        <th className="table-header">Acciones</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-800">
                      {appointments.length > 0 ? (
                        appointments.map((a) => (
                          <tr key={a.id} className="hover:bg-stone-800/40 transition-colors">
                            <td className="table-cell">
                              <div className="text-sm font-medium text-stone-100">{a.client_name}</div>
                              <div className="text-xs text-stone-500">{a.client_phone || a.confirmation_code}</div>
                            </td>
                            <td className="table-cell text-sm text-stone-300">{a.service_name}</td>
                            <td className="table-cell">
                              {a.barber_name ? (
                                <span className="inline-flex items-center gap-2 text-sm text-stone-200">
                                  <span
                                    className="w-2.5 h-2.5 rounded-full inline-block"
                                    style={{ backgroundColor: a.barber_color || "#f59e0b" }}
                                  />
                                  {a.barber_name}
                                </span>
                              ) : (
                                <span className="text-xs text-stone-500">Sin asignar</span>
                              )}
                            </td>
                            <td className="table-cell">
                              <span className="font-mono text-xs font-bold text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-1 rounded">
                                {a.confirmation_code || "—"}
                              </span>
                            </td>
                            <td className="table-cell">
                              <div className="text-sm text-stone-200">{formatDateShort(a.date)}</div>
                              <div className="text-xs text-stone-500">{a.time}</div>
                            </td>
                            <td className="table-cell text-sm text-emerald-400 font-medium">
                              {formatCurrency(a.service_price)}
                            </td>
                            <td className="table-cell">{statusSelect(a)}</td>
                            <td className="table-cell">
                              <div className="flex items-center gap-2">
                                {a.client_phone && (
                                  <a
                                    href={whatsAppLink(a) || "#"}
                                    target="_blank"
                                    rel="noreferrer"
                                    title="Enviar WhatsApp"
                                    className="p-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500 hover:text-white transition-colors"
                                  >
                                    💬
                                  </a>
                                )}
                                <button
                                  onClick={() => setReassignTarget(a)}
                                  title="Reasignar peluquero/fecha"
                                  className="p-1.5 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-400 hover:bg-amber-500 hover:text-stone-950 transition-colors"
                                >
                                  🔄
                                </button>
                                <button
                                  onClick={() => setDeleteTarget(a)}
                                  title="Eliminar"
                                  className="p-1.5 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 hover:bg-red-500 hover:text-white transition-colors"
                                >
                                  🗑️
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={8} className="px-4 py-10 text-center text-stone-500">
                            No hay citas que coincidan con los filtros.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Paginación */}
                <div className="flex flex-wrap items-center justify-between gap-3 p-4 border-t border-stone-800">
                  <div className="flex items-center gap-2">
                    <p className="text-sm text-stone-500">
                      {total > 0 ? `Mostrando ${appointments.length} de ${total} citas` : "Sin resultados"}
                    </p>
                    <select
                      value={pageSize}
                      onChange={(e) => setPageSize(Number(e.target.value))}
                      className="input !w-auto !py-1.5 text-sm"
                      title="Citas por página"
                    >
                      {[15, 25, 50, 100].map((n) => (
                        <option key={n} value={n}>{n} / pág.</option>
                      ))}
                    </select>
                  </div>
                  {totalPages > 1 && (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setPage((p) => Math.max(1, p - 1))}
                        disabled={page <= 1}
                        className="btn btn-ghost !px-3 !py-1.5 text-sm"
                      >
                        ← Anterior
                      </button>
                      <span className="text-sm text-stone-400">
                        Página {page} de {totalPages}
                      </span>
                      <button
                        onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                        disabled={page >= totalPages}
                        className="btn btn-ghost !px-3 !py-1.5 text-sm"
                      >
                        Siguiente →
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </>
          ) : (
            <StatsSection stats={stats} barbers={barbers} />
          )}
        </div>
      </main>

      <NewAppointmentModal open={showNewModal} onClose={() => setShowNewModal(false)} onCreated={refresh} />
      <ReassignModal open={!!reassignTarget} appointment={reassignTarget} onClose={() => setReassignTarget(null)} onReassigned={refresh} />

      {/* Confirmar cambio de estado */}
      {confirmAction && (
        <div className="modal-overlay" onClick={() => setConfirmAction(null)}>
          <div className="modal-card max-w-md" onClick={(e) => e.stopPropagation()}>
            <div className="p-5 border-b border-stone-800">
              <h3 className="text-lg font-bold text-stone-50">Confirmar acción</h3>
            </div>
            <div className="p-5">
              <p className="text-stone-300">
                ¿Marcar la cita como{" "}
                <span className="font-bold text-amber-400">{STATUS_META[confirmAction.status]?.label}</span>?
              </p>
            </div>
            <div className="flex gap-3 p-5 border-t border-stone-800">
              <button onClick={() => setConfirmAction(null)} className="btn btn-ghost flex-1">Cancelar</button>
              <button onClick={() => updateStatus(confirmAction.id, confirmAction.status)} className="btn btn-primary flex-1">
                Sí, continuar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmar eliminación */}
      {deleteTarget && (
        <div className="modal-overlay" onClick={() => setDeleteTarget(null)}>
          <div className="modal-card max-w-md" onClick={(e) => e.stopPropagation()}>
            <div className="p-5 border-b border-stone-800">
              <h3 className="text-lg font-bold text-red-400">Eliminar cita</h3>
            </div>
            <div className="p-5">
              <p className="text-stone-300">
                ¿Eliminar la cita de <strong className="text-stone-100">{deleteTarget.client_name}</strong> el{" "}
                {formatDateShort(deleteTarget.date)} a las {deleteTarget.time}?
              </p>
              <p className="text-xs text-stone-500 mt-2">Esta acción no se puede deshacer.</p>
            </div>
            <div className="flex gap-3 p-5 border-t border-stone-800">
              <button onClick={() => setDeleteTarget(null)} className="btn btn-ghost flex-1">Cancelar</button>
              <button onClick={() => deleteAppointment(deleteTarget.id)} className="btn btn-danger flex-1">Eliminar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function StatsSection({ stats, barbers }: { stats: Stats | null; barbers: Barber[] }) {
  const [barberFilter, setBarberFilter] = useState("todas");
  const [localStats, setLocalStats] = useState<Stats | null>(stats);

  useEffect(() => {
    setLocalStats(stats);
  }, [stats]);

  useEffect(() => {
    let cancelled = false;
    const fetchFiltered = async () => {
      try {
        const res = await fetch(`/api/admin/stats${barberFilter !== "todas" ? `?barberId=${barberFilter}` : ""}`);
        if (res.ok) {
          const data = await res.json();
          if (!cancelled) setLocalStats(data);
        }
      } catch (error) {
        console.error(error);
      }
    };
    fetchFiltered();
    return () => {
      cancelled = true;
    };
  }, [barberFilter]);

  if (!localStats) {
    return <p className="text-stone-500 text-center py-10">Cargando estadísticas...</p>;
  }

  const maxDay = Math.max(...(localStats.appointmentsByDay || []).map((d) => d.count), 1);
  const maxRev = Math.max(...(localStats.revenueByDay || []).map((d) => d.total || 0), 1);

  const cards = [
    { label: "Citas totales", value: localStats.totalAppointments, accent: "text-stone-50" },
    { label: "Pendientes", value: localStats.pendingAppointments, accent: "text-amber-400" },
    { label: "Completadas", value: localStats.completedAppointments, accent: "text-emerald-400" },
    { label: "Canceladas", value: localStats.cancelledAppointments, accent: "text-red-400" }
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-stone-100">Rendimiento del negocio</h2>
        <select value={barberFilter} onChange={(e) => setBarberFilter(e.target.value)} className="input w-auto">
          <option value="todas">Todos los peluqueros</option>
          {barbers.map((b) => (
            <option key={b.id} value={b.id}>{b.name}</option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {cards.map((c) => (
          <div key={c.label} className="stat-card">
            <p className="stat-label">{c.label}</p>
            <p className={`stat-value ${c.accent}`}>{c.value}</p>
          </div>
        ))}
        <div className="stat-card col-span-2 md:col-span-4">
          <p className="stat-label">Ingresos totales</p>
          <p className="stat-value text-emerald-400">{formatCurrency(localStats.totalRevenue)}</p>
        </div>
      </div>

      {/* Por peluquero */}
      {localStats.perBarber.length > 0 && (
        <div className="card p-5">
          <h3 className="text-base font-semibold text-stone-100 mb-4">💈 Rendimiento por peluquero</h3>
          <div className="space-y-3">
            {localStats.perBarber.map((b) => (
              <div key={b.id} className="flex items-center gap-4">
                <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: b.color }} />
                <span className="w-40 truncate text-sm text-stone-200">{b.name}</span>
                <div className="flex-1 h-6 bg-stone-800 rounded overflow-hidden">
                  <div
                    className="h-full rounded"
                    style={{ width: `${Math.min((b.revenue / Math.max(localStats.totalRevenue, 1)) * 100, 100)}%`, backgroundColor: b.color }}
                  />
                </div>
                <span className="text-sm text-stone-300 w-10 text-right">{b.total}</span>
                <span className="text-sm text-emerald-400 font-medium w-24 text-right">{formatCurrency(b.revenue)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Citas por día */}
        <div className="card p-5">
          <h3 className="text-base font-semibold text-stone-100 mb-4">📅 Citas por día de la semana</h3>
          {localStats.appointmentsByDay.length > 0 ? (
            <div className="space-y-3">
              {localStats.appointmentsByDay.map((d) => (
                <div key={d.day_num} className="flex items-center gap-3">
                  <span className="w-24 text-sm text-stone-400">{d.day_name}</span>
                  <div className="flex-1 h-6 bg-stone-800 rounded overflow-hidden">
                    <div className="h-full bg-amber-500 rounded" style={{ width: `${(d.count / maxDay) * 100}%` }} />
                  </div>
                  <span className="text-sm font-medium text-stone-200 w-8 text-right">{d.count}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-stone-500 text-center py-6 text-sm">Sin datos suficientes</p>
          )}
        </div>

        {/* Servicios populares */}
        <div className="card p-5">
          <h3 className="text-base font-semibold text-stone-100 mb-4">🔥 Servicios más populares</h3>
          {localStats.popularServices.length > 0 ? (
            <div className="space-y-3">
              {localStats.popularServices.map((s, i) => (
                <div key={i} className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium text-stone-200">{s.name}</p>
                    <p className="text-xs text-stone-500">{s.count} cita(s)</p>
                  </div>
                  <span className="text-sm font-semibold text-emerald-400">{formatCurrency(s.revenue)}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-stone-500 text-center py-6 text-sm">Sin datos suficientes</p>
          )}
        </div>
      </div>

      {/* Ingresos últimos 7 días */}
      <div className="card p-5">
        <h3 className="text-base font-semibold text-stone-100 mb-4">💰 Ingresos últimos 7 días</h3>
        {localStats.revenueByDay.length > 0 ? (
          <div className="flex items-end gap-2 h-40">
            {[...localStats.revenueByDay].reverse().map((d) => (
              <div key={d.date} className="flex-1 flex flex-col items-center justify-end gap-1 h-full">
                <span className="text-xs text-emerald-400 font-medium">
                  {d.total ? formatCurrency(d.total) : ""}
                </span>
                <div
                  className="w-full bg-gradient-to-t from-amber-600 to-amber-400 rounded-t-lg"
                  style={{ height: `${Math.max(((d.total || 0) / maxRev) * 100, 2)}%` }}
                />
                <span className="text-[10px] text-stone-500">{formatDateShort(d.date)}</span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-stone-500 text-center py-6 text-sm">Sin ingresos en los últimos 7 días</p>
        )}
      </div>
    </div>
  );
}