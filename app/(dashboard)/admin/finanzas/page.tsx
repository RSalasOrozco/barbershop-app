"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Sidebar from "@/components/Sidebar";
import { toast } from "sonner";
import type { Expense, FinanceMonth } from "@/lib/types";
import { formatCurrency, formatDateShort } from "@/lib/types";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Legend
} from "recharts";

function currentMonth(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function monthLabel(month: string): string {
  const [y, m] = month.split("-").map(Number);
  const d = new Date(y, m - 1, 1);
  return d.toLocaleDateString("es-ES", { month: "long", year: "numeric" });
}

const PAYMENT_LABELS: Record<string, string> = {
  efectivo: "💵 Efectivo",
  tarjeta: "💳 Tarjeta",
  transferencia: "📱 Transferencia"
};

export default function AdminFinancesPage() {
  const [user, setUser] = useState<{ name: string; role: string } | null>(null);
  const [month, setMonth] = useState(currentMonth());
  const [data, setData] = useState<FinanceMonth | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"resumen" | "ingresos" | "gastos" | "peluqueros">("resumen");

  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [editExpense, setEditExpense] = useState<Expense | null>(null);
  const [deleteExpense, setDeleteExpense] = useState<Expense | null>(null);

  const mounted = useRef(false);

  const fetchData = useCallback(async (m: string) => {
    setLoading(true);
    try {
      const [fin, me] = await Promise.all([
        fetch(`/api/admin/finances?month=${m}`),
        fetch("/api/auth/me")
      ]);
      if (!fin.ok) throw new Error("Error");
      const fd = await fin.json();
      const md = await me.json();
      setData(fd);
      setUser(md.user || null);
    } catch (error) {
      console.error(error);
      toast.error("Error al cargar las finanzas");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (mounted.current) return;
    mounted.current = true;
    fetchData(month);
  }, [month, fetchData]);

  const changeMonth = (m: string) => {
    setMonth(m);
    fetchData(m);
  };

  const saveExpense = async (payload: { date: string; description: string; amount: number; category: string }, id?: number) => {
    try {
      const res = await fetch("/api/admin/expenses", {
        method: id ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(id ? { id, ...payload } : payload)
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || "Error al guardar el gasto");
      toast.success(id ? "Gasto actualizado" : "Gasto registrado");
      setShowExpenseModal(false);
      setEditExpense(null);
      fetchData(month);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Error al guardar el gasto");
    }
  };

  const removeExpense = async (id: number) => {
    try {
      const res = await fetch(`/api/admin/expenses?id=${id}`, { method: "DELETE" });
      if (res.ok) {
        toast.success("Gasto eliminado");
        setDeleteExpense(null);
        fetchData(month);
      }
    } catch (error) {
      console.error(error);
    }
  };

  const exportCSV = () => {
    if (!data) return;
    const rows: string[] = [];
    rows.push(`BarberTrack - Finanzas ${monthLabel(month)}`);
    rows.push("");
    rows.push(`Mes;${monthLabel(month)}`);
    rows.push(`Ingresos;${data.income}`);
    rows.push(`Gastos;${data.expenses}`);
    rows.push(`Ganancia;${data.profit}`);
    rows.push("");
    rows.push("DIA;CITAS;INGRESOS");
    for (const d of data.byDay) {
      rows.push(`${d.date};${d.count};${d.income}`);
    }
    rows.push("");
    rows.push("GASTOS");
    rows.push("FECHA;DESCRIPCION;CATEGORIA;MONTO");
    for (const e of data.expensesList) {
      rows.push(`${e.date};${e.description};${e.category || ""};${e.amount}`);
    }
    rows.push("");
    rows.push("PELUQUEROS");
    rows.push("PELUQUERO;CITAS;INGRESOS;COMISION;NETO");
    for (const b of data.byBarber) {
      rows.push(`${b.name};${b.count};${b.income};${b.commission};${b.net}`);
    }
    rows.push("");
    rows.push("SERVICIOS");
    rows.push("SERVICIO;CITAS;INGRESOS");
    for (const s of data.byService) {
      rows.push(`${s.name};${s.count};${s.income}`);
    }

    const blob = new Blob(["\uFEFF" + rows.join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `finanzas-${month}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const pct = (current: number, previous: number): string => {
    if (previous === 0) return current > 0 ? "+100%" : "—";
    const v = ((current - previous) / Math.abs(previous)) * 100;
    const sign = v > 0 ? "+" : "";
    return `${sign}${v.toFixed(1)}%`;
  };

  const kpis = [
    {
      label: "Ingresos",
      value: formatCurrency(data?.income ?? 0),
      sub: `vs ${monthLabel(data?.previous ? month : month)}: ${pct(data?.income ?? 0, data?.previous.income ?? 0)}`,
      accent: "text-emerald-400"
    },
    {
      label: "Gastos",
      value: formatCurrency(data?.expenses ?? 0),
      sub: `${data?.expensesList.length ?? 0} registro(s)`,
      accent: "text-red-400"
    },
    {
      label: "Ganancia neta",
      value: formatCurrency(data?.profit ?? 0),
      sub: `vs mes anterior: ${pct(data?.profit ?? 0, data?.previous.profit ?? 0)}`,
      accent: (data?.profit ?? 0) >= 0 ? "text-amber-400" : "text-red-400"
    },
    {
      label: "Ticket promedio",
      value: formatCurrency(data?.averageTicket ?? 0),
      sub: `${data?.appointmentCount ?? 0} cita(s) completadas`,
      accent: "text-stone-50"
    }
  ];

  return (
    <div className="min-h-screen">
      <Sidebar userName={user?.name} userRole={user?.role} />

      <main className="md:pl-60">
        <div className="p-4 md:p-8 max-w-7xl mx-auto">
          {/* Header */}
          <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-stone-50">💰 Finanzas</h1>
              <p className="text-stone-500 mt-1 text-sm">Ingresos, gastos y ganancia mensual de tu negocio</p>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="month"
                value={month}
                onChange={(e) => e.target.value && changeMonth(e.target.value)}
                className="input !w-auto"
              />
              <button onClick={exportCSV} disabled={!data} className="btn btn-ghost">
                📥 Exportar CSV
              </button>
            </div>
          </div>

          {loading && !data ? (
            <p className="text-stone-500 text-center py-16">Cargando finanzas...</p>
          ) : !data ? (
            <p className="text-stone-500 text-center py-16">No hay datos para este mes.</p>
          ) : (
            <>
              {/* KPIs */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                {kpis.map((k) => (
                  <div key={k.label} className="stat-card">
                    <p className="stat-label">{k.label}</p>
                    <p className={`stat-value ${k.accent}`}>{k.value}</p>
                    <p className="text-xs text-stone-500 mt-1">{k.sub}</p>
                  </div>
                ))}
              </div>

              {/* Gráfico 12 meses */}
              <div className="card p-5 mb-6">
                <h3 className="text-base font-semibold text-stone-100 mb-4">📈 Últimos 12 meses</h3>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data.last12Months} margin={{ top: 5, right: 10, left: 10, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#292524" />
                      <XAxis dataKey="month" tick={{ fill: "#a8a29e", fontSize: 11 }} tickFormatter={(v) => v.slice(5) + "/" + v.slice(2, 4)} />
                      <YAxis tick={{ fill: "#a8a29e", fontSize: 11 }} />
                      <Tooltip
                        contentStyle={{ background: "#1c1917", border: "1px solid #44403c", borderRadius: 8, fontSize: 12 }}
                        formatter={(value, name) => [formatCurrency(Number(value) || 0), name === "income" ? "Ingresos" : name === "expenses" ? "Gastos" : "Ganancia"]}
                        labelFormatter={(v) => monthLabel(String(v))}
                      />
                      <Legend formatter={(value) => (value === "income" ? "Ingresos" : value === "expenses" ? "Gastos" : "Ganancia")} />
                      <Bar dataKey="income" fill="#10b981" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="expenses" fill="#ef4444" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="profit" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Tabs */}
              <div className="flex gap-1 border-b border-stone-800 mb-6">
                {([
                  ["resumen", "📊 Resumen"],
                  ["ingresos", "💵 Ingresos"],
                  ["gastos", "🧾 Gastos"],
                  ["peluqueros", "💈 Peluqueros"]
                ] as const).map(([key, label]) => (
                  <button
                    key={key}
                    onClick={() => setTab(key)}
                    className={`px-4 py-2.5 text-sm font-medium rounded-t-lg border-b-2 transition-colors ${
                      tab === key
                        ? "border-amber-500 text-amber-400"
                        : "border-transparent text-stone-400 hover:text-stone-200"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>

              {tab === "resumen" && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div className="card p-5">
                    <h3 className="text-base font-semibold text-stone-100 mb-4">💵 Formas de pago</h3>
                    {data.byPaymentMethod.length > 0 ? (
                      <div className="space-y-3">
                        {data.byPaymentMethod.map((p) => (
                          <div key={p.method} className="flex items-center justify-between">
                            <div>
                              <p className="text-sm font-medium text-stone-200">{PAYMENT_LABELS[p.method] || p.method}</p>
                              <p className="text-xs text-stone-500">{p.count} pago(s)</p>
                            </div>
                            <span className="text-sm font-semibold text-emerald-400">{formatCurrency(p.income)}</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-stone-500 text-center py-6 text-sm">Sin pagos registrados este mes.</p>
                    )}
                  </div>

                  <div className="card p-5">
                    <h3 className="text-base font-semibold text-stone-100 mb-4">🔥 Servicios del mes</h3>
                    {data.byService.length > 0 ? (
                      <div className="space-y-3">
                        {data.byService.map((s) => (
                          <div key={s.name} className="flex items-center justify-between">
                            <div>
                              <p className="text-sm font-medium text-stone-200">{s.name}</p>
                              <p className="text-xs text-stone-500">{s.count} cita(s)</p>
                            </div>
                            <span className="text-sm font-semibold text-emerald-400">{formatCurrency(s.income)}</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-stone-500 text-center py-6 text-sm">Sin servicios este mes.</p>
                    )}
                  </div>
                </div>
              )}

              {tab === "ingresos" && (
                <div className="card overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[600px]">
                      <thead className="bg-stone-800/60">
                        <tr>
                          <th className="table-header">Día</th>
                          <th className="table-header">Citas completadas</th>
                          <th className="table-header">Ingresos</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-stone-800">
                        {data.byDay.length > 0 ? (
                          data.byDay.map((d) => (
                            <tr key={d.date} className="hover:bg-stone-800/40 transition-colors">
                              <td className="table-cell text-sm text-stone-200">{formatDateShort(d.date)}</td>
                              <td className="table-cell text-sm text-stone-300">{d.count}</td>
                              <td className="table-cell text-sm font-medium text-emerald-400">{formatCurrency(d.income)}</td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan={3} className="px-4 py-10 text-center text-stone-500">
                              Sin ingresos este mes.
                            </td>
                          </tr>
                        )}
                      </tbody>
                      {data.byDay.length > 0 && (
                        <tfoot className="bg-stone-800/40">
                          <tr>
                            <td className="px-4 py-3 text-sm font-semibold text-stone-100">Total</td>
                            <td className="px-4 py-3 text-sm font-semibold text-stone-100">{data.appointmentCount}</td>
                            <td className="px-4 py-3 text-sm font-semibold text-emerald-400">{formatCurrency(data.income)}</td>
                          </tr>
                        </tfoot>
                      )}
                    </table>
                  </div>
                </div>
              )}

              {tab === "gastos" && (
                <>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-base font-semibold text-stone-100">
                      Gastos del mes: <span className="text-red-400">{formatCurrency(data.expenses)}</span>
                    </h3>
                    <button onClick={() => { setEditExpense(null); setShowExpenseModal(true); }} className="btn btn-primary">
                      ➕ Nuevo Gasto
                    </button>
                  </div>
                  <div className="card overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full min-w-[600px]">
                        <thead className="bg-stone-800/60">
                          <tr>
                            <th className="table-header">Fecha</th>
                            <th className="table-header">Descripción</th>
                            <th className="table-header">Categoría</th>
                            <th className="table-header">Monto</th>
                            <th className="table-header">Acciones</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-stone-800">
                          {data.expensesList.length > 0 ? (
                            data.expensesList.map((e) => (
                              <tr key={e.id} className="hover:bg-stone-800/40 transition-colors">
                                <td className="table-cell text-sm text-stone-300">{formatDateShort(e.date)}</td>
                                <td className="table-cell text-sm text-stone-100">{e.description}</td>
                                <td className="table-cell text-sm text-stone-400">{e.category || "—"}</td>
                                <td className="table-cell text-sm font-medium text-red-400">{formatCurrency(e.amount)}</td>
                                <td className="table-cell">
                                  <div className="flex items-center gap-2">
                                    <button
                                      onClick={() => { setEditExpense(e); setShowExpenseModal(true); }}
                                      className="p-1.5 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-400 hover:bg-amber-500 hover:text-stone-950 transition-colors"
                                      title="Editar"
                                    >
                                      ✏️
                                    </button>
                                    <button
                                      onClick={() => setDeleteExpense(e)}
                                      className="p-1.5 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 hover:bg-red-500 hover:text-white transition-colors"
                                      title="Eliminar"
                                    >
                                      🗑️
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            ))
                          ) : (
                            <tr>
                              <td colSpan={5} className="px-4 py-10 text-center text-stone-500">
                                No hay gastos registrados este mes.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </>
              )}

              {tab === "peluqueros" && (
                <>
                  <div className="card p-4 mb-4 text-sm text-stone-400">
                    Las comisiones se configuran en <strong className="text-amber-400">💈 Peluqueros</strong> (editar peluquero).
                    <ul className="list-disc list-inside mt-2 text-xs space-y-1">
                      <li><strong>% de cada servicio:</strong> porcentaje del ingreso que genera el peluquero en el mes.</li>
                      <li><strong>Sueldo fijo mensual:</strong> monto fijo si el peluquero trabajó al menos una vez en el mes.</li>
                      <li><strong>Neto para el negocio:</strong> ingreso del peluquero menos su comisión o sueldo.</li>
                    </ul>
                  </div>
                  <div className="card overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full min-w-[700px]">
                        <thead className="bg-stone-800/60">
                          <tr>
                            <th className="table-header">Peluquero</th>
                            <th className="table-header">Citas</th>
                            <th className="table-header">Ingreso</th>
                            <th className="table-header">Comisión</th>
                            <th className="table-header">Neto negocio</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-stone-800">
                          {data.byBarber.length > 0 ? (
                            data.byBarber.map((b) => (
                              <tr key={b.id} className="hover:bg-stone-800/40 transition-colors">
                                <td className="table-cell">
                                  <span className="inline-flex items-center gap-2 text-sm text-stone-200">
                                    <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ backgroundColor: b.color }} />
                                    {b.name}
                                  </span>
                                </td>
                                <td className="table-cell text-sm text-stone-300">{b.count}</td>
                                <td className="table-cell text-sm font-medium text-emerald-400">{formatCurrency(b.income)}</td>
                                <td className="table-cell text-sm font-medium text-red-400">-{formatCurrency(b.commission)}</td>
                                <td className="table-cell text-sm font-semibold text-amber-400">{formatCurrency(b.net)}</td>
                              </tr>
                            ))
                          ) : (
                            <tr>
                              <td colSpan={5} className="px-4 py-10 text-center text-stone-500">
                                No hay datos de peluqueros este mes.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </>
              )}
            </>
          )}
        </div>
      </main>

      {showExpenseModal && (
        <ExpenseFormModal
          expense={editExpense}
          onClose={() => setShowExpenseModal(false)}
          onSave={saveExpense}
        />
      )}

      {deleteExpense && (
        <div className="modal-overlay" onClick={() => setDeleteExpense(null)}>
          <div className="modal-card max-w-md" onClick={(e) => e.stopPropagation()}>
            <div className="p-5 border-b border-stone-800">
              <h3 className="text-lg font-bold text-red-400">Eliminar gasto</h3>
            </div>
            <div className="p-5">
              <p className="text-stone-300">
                ¿Eliminar el gasto <strong className="text-stone-100">{deleteExpense.description}</strong> por{" "}
                <span className="text-red-400 font-semibold">{formatCurrency(deleteExpense.amount)}</span>?
              </p>
              <p className="text-xs text-stone-500 mt-2">Esta acción no se puede deshacer.</p>
            </div>
            <div className="flex gap-3 p-5 border-t border-stone-800">
              <button onClick={() => setDeleteExpense(null)} className="btn btn-ghost flex-1">Cancelar</button>
              <button onClick={() => removeExpense(deleteExpense.id)} className="btn btn-danger flex-1">Eliminar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ExpenseFormModal({
  expense,
  onClose,
  onSave
}: {
  expense: Expense | null;
  onClose: () => void;
  onSave: (payload: { date: string; description: string; amount: number; category: string }, id?: number) => void;
}) {
  const [date, setDate] = useState(expense?.date || currentMonth() + "-01");
  const [description, setDescription] = useState(expense?.description || "");
  const [amount, setAmount] = useState(expense ? String(expense.amount) : "");
  const [category, setCategory] = useState(expense?.category || "");
  const [saving, setSaving] = useState(false);

  const submit = () => {
    if (!date) {
      toast.warning("Selecciona la fecha");
      return;
    }
    if (description.trim().length < 2) {
      toast.warning("Describe el gasto");
      return;
    }
    const value = Number(amount);
    if (!value || value <= 0) {
      toast.warning("Ingresa un monto mayor a 0");
      return;
    }
    setSaving(true);
    onSave({ date, description: description.trim(), amount: value, category: category.trim() }, expense?.id);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="p-5 border-b border-stone-800">
          <h3 className="text-lg font-bold text-stone-50">{expense ? "✏️ Editar Gasto" : "➕ Nuevo Gasto"}</h3>
        </div>
        <div className="p-5 space-y-4">
          <div>
            <label className="label">Fecha</label>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="input" />
          </div>
          <div>
            <label className="label">Descripción</label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="input"
              placeholder="Ej: Compra de tijeras, arriendo local, luz..."
            />
          </div>
          <div>
            <label className="label">Monto</label>
            <input
              type="number"
              min="0"
              inputMode="numeric"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="input"
              placeholder="Ej: 50000"
            />
          </div>
          <div>
            <label className="label">Categoría (opcional)</label>
            <input
              type="text"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="input"
              placeholder="Ej: Insumos, Servicios, Arriendo"
            />
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