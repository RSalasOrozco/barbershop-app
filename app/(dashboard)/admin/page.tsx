"use client";

import { useState, useEffect } from "react";
import Navbar from "@/components/Navbar";
import { useRouter } from "next/navigation";

interface Appointment {
  id: number;
  client_name: string;
  client_email: string;
  service_name: string;
  service_price: number;
  date: string;
  time: string;
  status: string;
  notes: string;
  confirmation_code?: string;
}

interface Stats {
  totalAppointments: number;
  pendingAppointments: number;
  completedAppointments: number;
  totalRevenue: number;
  appointmentsByDay: any[];
  revenueByDay: any[];
  popularServices: any[];
}

export default function AdminDashboard() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"citas" | "estadisticas">("citas");
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [filterStatus, setFilterStatus] = useState<string>("todas");
  const [error, setError] = useState<string>("");
  // ✅ NUEVO: Estado para el tipo de ordenamiento
  const [sortOrder, setSortOrder] = useState<
    "fecha-reciente" | "fecha-lejana" | "hora-proxima"
  >("fecha-reciente");

  useEffect(() => {
    fetchUserData();
    fetchAppointments();
    fetchStats();
  }, []);

  const fetchUserData = async () => {
    try {
      const res = await fetch("/api/auth/me");
      if (res.ok) {
        const data = await res.json();
        setUser(data.user);
      }
    } catch (error) {
      console.error("Error fetching user:", error);
    }
  };

  const fetchAppointments = async () => {
    setError("");
    try {
      const res = await fetch("/api/appointments");

      if (!res.ok) {
        throw new Error(`Error ${res.status}: ${res.statusText}`);
      }

      const data = await res.json();
      console.log("📋 Citas cargadas:", data.appointments?.length || 0);
      setAppointments(data.appointments || []);
    } catch (error: any) {
      console.error("❌ Error cargando citas:", error);
      setError(error.message || "Error al cargar las citas");
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const res = await fetch("/api/admin/stats");
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      }
    } catch (error) {
      console.error("Error cargando estadísticas:", error);
    }
  };

  const updateAppointmentStatus = async (id: number, status: string) => {
    try {
      const res = await fetch("/api/admin/appointments", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status })
      });

      if (res.ok) {
        setAppointments((prev) =>
          prev.map((apt) => (apt.id === id ? { ...apt, status } : apt))
        );
        fetchStats();
      }
    } catch (error) {
      console.error("Error actualizando cita:", error);
    }
  };

  const deleteAppointment = async (id: number) => {
    if (!confirm("¿Estás seguro de eliminar esta cita?")) return;

    try {
      const res = await fetch(`/api/admin/appointments?id=${id}`, {
        method: "DELETE"
      });

      if (res.ok) {
        setAppointments((prev) => prev.filter((apt) => apt.id !== id));
        fetchStats();
      }
    } catch (error) {
      console.error("Error eliminando cita:", error);
    }
  };

  // ✅ NUEVA: Función para ordenar las citas
  const getSortedAppointments = (citas: Appointment[]) => {
    const citasCopy = [...citas];

    switch (sortOrder) {
      case "fecha-reciente":
        return citasCopy.sort((a, b) => {
          const fechaA = new Date(`${a.date}T${a.time}`);
          const fechaB = new Date(`${b.date}T${b.time}`);
          return fechaB.getTime() - fechaA.getTime();
        });

      case "fecha-lejana":
        return citasCopy.sort((a, b) => {
          const fechaA = new Date(`${a.date}T${a.time}`);
          const fechaB = new Date(`${b.date}T${b.time}`);
          return fechaA.getTime() - fechaB.getTime();
        });

      case "hora-proxima":
        return citasCopy.sort((a, b) => {
          const fechaA = new Date(`${a.date}T${a.time}`);
          const fechaB = new Date(`${b.date}T${b.time}`);
          return fechaA.getTime() - fechaB.getTime();
        });

      default:
        return citasCopy;
    }
  };

  const filteredAppointments =
    filterStatus === "todas"
      ? appointments
      : appointments.filter((apt) => apt.status === filterStatus);

  const getStatusColor = (status: string) => {
    const colors: any = {
      pendiente: "bg-yellow-100 text-yellow-800",
      confirmada: "bg-green-100 text-green-800",
      cancelada: "bg-red-100 text-red-800",
      completada: "bg-gray-100 text-gray-800"
    };
    return colors[status] || "bg-gray-100 text-gray-800";
  };

  if (loading) {
    return (
      <div>
        <Navbar userName={user?.name} userRole={user?.role} />
        <div className="flex items-center justify-center h-64">
          <div className="text-gray-500">Cargando datos...</div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <Navbar userName={user?.name} userRole={user?.role} />

      <div className="p-8">
        <h1 className="text-3xl font-bold text-gray-800 dark:text-white mb-2">
          🔐 Panel de Administración
        </h1>
        <p className="text-gray-600 dark:text-gray-300 mb-8">
          Gestiona todas las citas y visualiza el rendimiento del negocio
        </p>

        {/* Tabs */}
        <div className="border-b border-gray-200 dark:border-gray-700 mb-6">
          <nav className="flex space-x-4">
            <button
              onClick={() => setActiveTab("citas")}
              className={`py-2 px-4 font-medium text-sm border-b-2 transition-colors ${
                activeTab === "citas"
                  ? "border-blue-500 text-blue-600 dark:text-blue-400"
                  : "border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400"
              }`}
            >
              📋 Gestión de Citas
            </button>
            <button
              onClick={() => setActiveTab("estadisticas")}
              className={`py-2 px-4 font-medium text-sm border-b-2 transition-colors ${
                activeTab === "estadisticas"
                  ? "border-blue-500 text-blue-600 dark:text-blue-400"
                  : "border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400"
              }`}
            >
              📊 Estadísticas
            </button>
          </nav>
        </div>

        {/* Contenido de Tabs */}
        {activeTab === "citas" ? (
          <div>
            {/* Cards de resumen rápido */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
                <h3 className="text-sm text-gray-500 dark:text-gray-400">
                  Total Citas
                </h3>
                <p className="text-2xl font-bold text-gray-800 dark:text-white">
                  {appointments.length}
                </p>
              </div>
              <div className="bg-yellow-50 dark:bg-yellow-900/20 p-4 rounded-lg shadow">
                <h3 className="text-sm text-yellow-700 dark:text-yellow-400">
                  Pendientes
                </h3>
                <p className="text-2xl font-bold text-yellow-800 dark:text-yellow-300">
                  {appointments.filter((a) => a.status === "pendiente").length}
                </p>
              </div>
              <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg shadow">
                <h3 className="text-sm text-green-700 dark:text-green-400">
                  Completadas
                </h3>
                <p className="text-2xl font-bold text-green-800 dark:text-green-300">
                  {appointments.filter((a) => a.status === "completada").length}
                </p>
              </div>
              <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg shadow">
                <h3 className="text-sm text-blue-700 dark:text-blue-400">
                  Ingresos Totales
                </h3>
                <p className="text-2xl font-bold text-blue-800 dark:text-blue-300">
                  ${stats?.totalRevenue?.toLocaleString() || 0}
                </p>
              </div>
            </div>

            {/* Filtros y botones de ordenamiento */}
            <div className="mb-4 flex flex-wrap gap-3 justify-between items-center">
              <div className="flex flex-wrap gap-2">
                {/* Filtro por estado */}
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300"
                >
                  <option value="todas">Todas las citas</option>
                  <option value="pendiente">Pendientes</option>
                  <option value="confirmada">Confirmadas</option>
                  <option value="completada">Completadas</option>
                  <option value="cancelada">Canceladas</option>
                </select>

                {/* ✅ NUEVOS: Botones de ordenamiento */}
                <button
                  onClick={() => setSortOrder("hora-proxima")}
                  className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    sortOrder === "hora-proxima"
                      ? "bg-blue-600 text-white"
                      : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
                  }`}
                >
                  ⏰ Más Próximas
                </button>
                <button
                  onClick={() => setSortOrder("fecha-reciente")}
                  className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    sortOrder === "fecha-reciente"
                      ? "bg-blue-600 text-white"
                      : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
                  }`}
                >
                  📅 Más Recientes
                </button>
                <button
                  onClick={() => setSortOrder("fecha-lejana")}
                  className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    sortOrder === "fecha-lejana"
                      ? "bg-blue-600 text-white"
                      : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
                  }`}
                >
                  📆 Más Lejanas
                </button>
              </div>

              <button
                onClick={() => {
                  fetchAppointments();
                  fetchStats();
                }}
                className="text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400"
              >
                🔄 Actualizar
              </button>
            </div>

            {/* Mensaje de error si existe */}
            {error && (
              <div className="mb-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
                ❌ {error}
              </div>
            )}

            {/* Tabla de Citas */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 dark:bg-gray-700">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Cliente
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Servicio
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Código
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Fecha/Hora
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Precio
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Estado
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Acciones
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                    {getSortedAppointments(filteredAppointments).length > 0 ? (
                      getSortedAppointments(filteredAppointments).map((apt) => (
                        <tr
                          key={apt.id}
                          className="hover:bg-gray-50 dark:hover:bg-gray-700/50"
                        >
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900 dark:text-white">
                              {apt.client_name}
                            </div>
                            <div className="text-xs text-gray-500 dark:text-gray-400">
                              {apt.client_email}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300">
                            {apt.service_name}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {apt.confirmation_code ? (
                              <div className="text-sm font-mono font-bold text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-900/30 px-2 py-1 rounded inline-block">
                                {apt.confirmation_code}
                              </div>
                            ) : (
                              <span className="text-xs text-gray-400">
                                Sin código
                              </span>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900 dark:text-white">
                              {new Date(
                                apt.date + "T00:00:00"
                              ).toLocaleDateString("es-ES")}
                            </div>
                            <div className="text-xs text-gray-500 dark:text-gray-400">
                              {apt.time}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300">
                            ${apt.service_price?.toLocaleString() || 0}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <select
                              value={apt.status}
                              onChange={(e) =>
                                updateAppointmentStatus(apt.id, e.target.value)
                              }
                              className={`text-xs border rounded px-2 py-1 ${getStatusColor(apt.status)}`}
                            >
                              <option value="pendiente">Pendiente</option>
                              <option value="confirmada">Confirmar</option>
                              <option value="completada">Completar</option>
                              <option value="cancelada">Cancelar</option>
                            </select>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm">
                            <button
                              onClick={() => deleteAppointment(apt.id)}
                              className="text-red-600 hover:text-red-700 text-sm"
                              title="Eliminar cita"
                            >
                              🗑️ Eliminar
                            </button>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td
                          colSpan={7}
                          className="px-6 py-8 text-center text-gray-500 dark:text-gray-400"
                        >
                          {filterStatus === "todas"
                            ? "No hay citas registradas. ¡Cuando los clientes agenden citas aparecerán aquí!"
                            : `No hay citas con estado "${filterStatus}"`}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        ) : (
          <div>
            {/* Estadísticas */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                <h3 className="text-lg font-semibold mb-4 text-gray-800 dark:text-white">
                  📅 Citas por Día de la Semana
                </h3>
                {stats?.appointmentsByDay &&
                stats.appointmentsByDay.length > 0 ? (
                  <div className="space-y-3">
                    {stats.appointmentsByDay.map((day: any) => {
                      const maxCount = Math.max(
                        ...stats.appointmentsByDay.map((d: any) => d.count),
                        1
                      );
                      return (
                        <div key={day.day_num} className="flex items-center">
                          <span className="w-24 text-sm text-gray-600 dark:text-gray-400">
                            {day.day_name}
                          </span>
                          <div className="flex-1 mx-3">
                            <div className="h-6 bg-blue-200 dark:bg-blue-900 rounded">
                              <div
                                className="h-6 bg-blue-600 rounded"
                                style={{
                                  width: `${(day.count / maxCount) * 100}%`
                                }}
                              />
                            </div>
                          </div>
                          <span className="text-sm font-medium text-gray-800 dark:text-white">
                            {day.count}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-gray-500 text-center py-4">
                    No hay datos suficientes
                  </p>
                )}
              </div>

              <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                <h3 className="text-lg font-semibold mb-4 text-gray-800 dark:text-white">
                  🔥 Servicios Más Populares
                </h3>
                {stats?.popularServices && stats.popularServices.length > 0 ? (
                  <div className="space-y-3">
                    {stats.popularServices.map(
                      (service: any, index: number) => (
                        <div
                          key={index}
                          className="flex items-center justify-between"
                        >
                          <div>
                            <p className="text-sm font-medium text-gray-800 dark:text-white">
                              {service.name}
                            </p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                              {service.count} citas
                            </p>
                          </div>
                          <p className="text-sm font-semibold text-green-600 dark:text-green-400">
                            ${service.revenue?.toLocaleString() || 0}
                          </p>
                        </div>
                      )
                    )}
                  </div>
                ) : (
                  <p className="text-gray-500 text-center py-4">
                    No hay datos suficientes
                  </p>
                )}
              </div>
            </div>

            <div className="mt-6 bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold mb-4 text-gray-800 dark:text-white">
                💰 Ingresos Últimos 7 Días
              </h3>
              {stats?.revenueByDay && stats.revenueByDay.length > 0 ? (
                <div className="grid grid-cols-7 gap-2">
                  {stats.revenueByDay.map((day: any) => (
                    <div key={day.date} className="text-center">
                      <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                        {new Date(day.date + "T00:00:00").toLocaleDateString(
                          "es-ES",
                          { weekday: "short" }
                        )}
                      </div>
                      <div className="text-sm font-medium text-gray-800 dark:text-white">
                        ${day.total?.toLocaleString() || 0}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 text-center py-4">
                  No hay ingresos registrados en los últimos 7 días
                </p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
