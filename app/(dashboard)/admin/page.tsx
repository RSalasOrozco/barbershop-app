"use client";

import { useState, useEffect, useRef } from "react";
import Navbar from "@/components/Navbar";
import { toast } from "sonner";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { HORARIOS_NORMALES, HORARIOS_DOMINGO } from "@/lib/horarios";

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

interface User {
  id: number;
  name: string;
  email: string;
  role: "admin" | "cliente";
}

interface Service {
  id: number;
  name: string;
  price: number;
  duration: number;
}

interface DayStat {
  day_name: string;
  day_num: string;
  count: number;
}

interface RevenueByDay {
  date: string;
  total: number;
}

interface PopularService {
  name: string;
  count: number;
  revenue: number;
}

interface Stats {
  totalAppointments: number;
  pendingAppointments: number;
  completedAppointments: number;
  totalRevenue: number;
  appointmentsByDay: DayStat[];
  revenueByDay: RevenueByDay[];
  popularServices: PopularService[];
}

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState<"citas" | "estadisticas">("citas");
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>("todas");
  const [sortOrder, setSortOrder] = useState<
    "fecha-reciente" | "fecha-lejana" | "hora-proxima"
  >("fecha-reciente");

  // Estados para el modal de confirmación
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [pendingAction, setPendingAction] = useState<{
    id: number;
    status: string;
  } | null>(null);

  // Estados para el modal de nueva cita
  const [showNewModal, setShowNewModal] = useState(false);
  const [clients, setClients] = useState<User[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string>("");
  const [newClientMode, setNewClientMode] = useState(false);
  const [clientName, setClientName] = useState("");
  const [clientPhone, setClientPhone] = useState("");
  const [selectedServiceId, setSelectedServiceId] = useState<string>("");
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedTime, setSelectedTime] = useState<string>("");
  const [newNotes, setNewNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Estados para el modal de eliminación
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [pendingDeleteId, setPendingDeleteId] = useState<number | null>(null);

  // Guard para que StrictMode (dev) no duplique los fetch
  const mounted = useRef(false);

  useEffect(() => {
    if (mounted.current) return;
    mounted.current = true;
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
    try {
      const res = await fetch("/api/appointments");

      if (!res.ok) {
        throw new Error(`Error ${res.status}: ${res.statusText}`);
      }

      const data = await res.json();
      console.log("📋 Citas cargadas:", data.appointments?.length || 0);
      setAppointments(data.appointments || []);
    } catch (error) {
      console.error("❌ Error cargando citas:", error);
      toast.error("❌ Error al cargar las citas");
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

  const getStatusText = (status: string) => {
    switch (status) {
      case "pendiente":
        return "Pendiente";
      case "confirmada":
        return "Confirmada";
      case "completada":
        return "Completada";
      case "cancelada":
        return "Cancelada";
      default:
        return status;
    }
  };

  const updateAppointmentStatus = (id: number, status: string) => {
    setPendingAction({ id, status });
    setShowConfirmModal(true);
  };

  const confirmUpdateStatus = async () => {
    if (!pendingAction) return;

    const { id, status } = pendingAction;

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
        toast.success(`✅ Cita ${getStatusText(status)} exitosamente`);
      } else {
        toast.error("❌ Error al actualizar la cita");
      }
    } catch (error) {
      console.error("Error actualizando cita:", error);
      toast.error("❌ Error al actualizar la cita");
    } finally {
      setShowConfirmModal(false);
      setPendingAction(null);
    }
  };

  const confirmDeleteAppointment = (id: number) => {
    setPendingDeleteId(id);
    setShowDeleteModal(true);
  };

  const closeDeleteModal = () => {
    setShowDeleteModal(false);
    setPendingDeleteId(null);
  };

  const deleteAppointment = async (id: number) => {
    try {
      const res = await fetch(`/api/admin/appointments?id=${id}`, {
        method: "DELETE"
      });

      if (res.ok) {
        setAppointments((prev) => prev.filter((apt) => apt.id !== id));
        fetchStats();
        toast.success("🗑️ Cita eliminada exitosamente");
      } else {
        toast.error("❌ Error al eliminar la cita");
      }
    } catch (error) {
      console.error("Error eliminando cita:", error);
      toast.error("❌ Error al eliminar la cita");
    }
  };

  const formatDateForApi = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  const getTimeSlots = () => {
    if (!selectedDate) return HORARIOS_NORMALES;
    return selectedDate.getDay() === 0
      ? HORARIOS_DOMINGO
      : HORARIOS_NORMALES;
  };

  const openNewAppointmentModal = async () => {
    setShowNewModal(true);
    try {
      const [clientsRes, servicesRes] = await Promise.all([
        fetch("/api/admin/users"),
        fetch("/api/services")
      ]);
      if (clientsRes.ok) {
        const data = await clientsRes.json();
        setClients(
          (data.users || []).filter((u: User) => u.role === "cliente")
        );
      }
      if (servicesRes.ok) {
        const data = await servicesRes.json();
        setServices(data.services || []);
      }
    } catch (error) {
      console.error("Error cargando datos para nueva cita:", error);
    }
  };

  const closeNewAppointmentModal = () => {
    setShowNewModal(false);
    setSelectedUserId("");
    setNewClientMode(false);
    setClientName("");
    setClientPhone("");
    setSelectedServiceId("");
    setSelectedDate(null);
    setSelectedTime("");
    setNewNotes("");
  };

  const submitNewAppointment = async () => {
    if (newClientMode) {
      if (!clientName.trim() || !clientPhone.trim()) {
        toast.warning("⚠️ Ingresa nombre y teléfono del cliente");
        return;
      }
    } else if (!selectedUserId) {
      toast.warning("⚠️ Selecciona un cliente");
      return;
    }

    if (!selectedServiceId) {
      toast.warning("⚠️ Selecciona un servicio");
      return;
    }

    if (!selectedDate) {
      toast.warning("⚠️ Selecciona una fecha");
      return;
    }

    if (!selectedTime) {
      toast.warning("⚠️ Selecciona una hora");
      return;
    }

    setSubmitting(true);

    try {
      const body: {
        serviceId: number;
        date: string;
        time: string;
        notes?: string;
        userId?: number;
        client?: { name: string; phone: string };
      } = {
        serviceId: Number(selectedServiceId),
        date: formatDateForApi(selectedDate),
        time: selectedTime,
        notes: newNotes || undefined
      };

      if (newClientMode) {
        body.client = {
          name: clientName.trim(),
          phone: clientPhone.trim()
        };
      } else {
        body.userId = Number(selectedUserId);
      }

      const res = await fetch("/api/admin/appointments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
      });

      const data = await res.json();

      if (res.ok) {
        toast.success(`✅ Cita creada — Código: ${data.confirmationCode}`);
        closeNewAppointmentModal();
        fetchAppointments();
        fetchStats();
      } else {
        toast.error(`❌ ${data.error || "Error al crear la cita"}`);
      }
    } catch (error) {
      console.error("Error creando cita:", error);
      toast.error("❌ Error al crear la cita");
    } finally {
      setSubmitting(false);
    }
  };

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
    switch (status) {
      case "pendiente":
        return "bg-yellow-500 text-white font-semibold shadow-sm";
      case "confirmada":
        return "bg-green-600 text-white font-semibold shadow-sm";
      case "cancelada":
        return "bg-red-600 text-white font-semibold shadow-sm";
      case "completada":
        return "bg-blue-600 text-white font-semibold shadow-sm";
      default:
        return "bg-gray-500 text-white font-semibold shadow-sm";
    }
  };

  // Modal de confirmación
  const statusText = pendingAction
    ? getStatusText(pendingAction.status)
    : "";

  const newAppointmentModal = showNewModal ? (
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center animate-in fade-in duration-200">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-lg w-full mx-4 overflow-hidden animate-in zoom-in duration-200">
          <div className="p-4 bg-blue-50 dark:bg-blue-900/20">
            <div className="flex items-center gap-3">
              <span className="text-2xl">📅</span>
              <h3 className="text-lg font-bold text-gray-800 dark:text-white">
                Nueva Cita
              </h3>
            </div>
          </div>

          <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Cliente
              </label>
              <select
                value={newClientMode ? "NUEVO_CLIENTE" : selectedUserId}
                onChange={(e) => {
                  if (e.target.value === "NUEVO_CLIENTE") {
                    setNewClientMode(true);
                    setSelectedUserId("");
                  } else {
                    setNewClientMode(false);
                    setSelectedUserId(e.target.value);
                  }
                }}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300"
              >
                <option value="">Selecciona un cliente...</option>
                <option value="NUEVO_CLIENTE">
                  ➕ Nuevo cliente (mostrador)
                </option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.email})
                  </option>
                ))}
              </select>
            </div>

            {newClientMode && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Nombre del cliente
                  </label>
                  <input
                    type="text"
                    value={clientName}
                    onChange={(e) =>
                      setClientName(
                        e.target.value.replace(
                          /[^A-Za-zÁáÉéÍíÓóÚúÑñ\s]/g,
                          ""
                        )
                      )
                    }
                    placeholder="Nombre completo"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Teléfono
                  </label>
                  <input
                    type="tel"
                    inputMode="numeric"
                    value={clientPhone}
                    onChange={(e) =>
                      setClientPhone(
                        e.target.value.replace(/\D/g, "").slice(0, 10)
                      )
                    }
                    placeholder="3001234567"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300"
                  />
                </div>
              </>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Servicio
              </label>
              <select
                value={selectedServiceId}
                onChange={(e) => setSelectedServiceId(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300"
              >
                <option value="">Selecciona un servicio...</option>
                {services.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} — ${s.price.toLocaleString()}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Fecha
                </label>
                <DatePicker
                  selected={selectedDate}
                  onChange={(date: Date | null) => {
                    setSelectedDate(date);
                    setSelectedTime("");
                  }}
                  minDate={new Date()}
                  dateFormat="dd/MM/yyyy"
                  placeholderText="Selecciona fecha"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Hora
                </label>
                <select
                  value={selectedTime}
                  onChange={(e) => setSelectedTime(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300"
                >
                  <option value="">Selecciona hora...</option>
                  {getTimeSlots().map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Notas (opcional)
              </label>
              <textarea
                value={newNotes}
                onChange={(e) => setNewNotes(e.target.value)}
                rows={2}
                placeholder="Ej: corte con máquina, cliente frecuente..."
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300"
              />
            </div>
          </div>

          <div className="flex gap-3 p-4 border-t border-gray-200 dark:border-gray-700">
            <button
              onClick={closeNewAppointmentModal}
              disabled={submitting}
              className="flex-1 px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={submitNewAppointment}
              disabled={submitting}
              className="flex-1 px-4 py-2 rounded-lg text-white font-medium bg-blue-600 hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              {submitting ? "Creando..." : "Crear Cita"}
            </button>
          </div>
        </div>
      </div>
    ) : null;

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

            {/* Filtros */}
            <div className="mb-4 flex flex-wrap gap-3 justify-between items-center">
              <div className="flex flex-wrap gap-2">
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

              <div className="flex items-center gap-4">
                <button
                  onClick={openNewAppointmentModal}
                  className="px-4 py-2 rounded-md text-sm font-medium bg-green-600 text-white hover:bg-green-700 transition-colors"
                >
                  📅 Nueva Cita
                </button>
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
            </div>

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
                              className={`
                                text-xs font-medium px-3 py-1.5 rounded-lg border-2 cursor-pointer transition-all
                                focus:outline-none focus:ring-2 focus:ring-offset-2
                                ${apt.status === "pendiente" ? "bg-yellow-100 text-yellow-800 border-yellow-300 focus:ring-yellow-500" : ""}
                                ${apt.status === "confirmada" ? "bg-green-100 text-green-800 border-green-300 focus:ring-green-500" : ""}
                                ${apt.status === "completada" ? "bg-blue-100 text-blue-800 border-blue-300 focus:ring-blue-500" : ""}
                                ${apt.status === "cancelada" ? "bg-red-100 text-red-800 border-red-300 focus:ring-red-500" : ""}
                              `}
                            >
                              <option value="pendiente">📋 Pendiente</option>
                              <option value="confirmada">✅ Confirmar</option>
                              <option value="completada">✨ Completar</option>
                              <option value="cancelada">❌ Cancelar</option>
                            </select>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm">
                            <button
                              onClick={() => confirmDeleteAppointment(apt.id)}
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
            {/* Estadísticas - Versión simple sin gráficos */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                <h3 className="text-lg font-semibold mb-4 text-gray-800 dark:text-white">
                  📅 Citas por Día de la Semana
                </h3>
                {stats?.appointmentsByDay &&
                stats.appointmentsByDay.length > 0 ? (
                  <div className="space-y-3">
                    {stats.appointmentsByDay.map((day) => {
                      const maxCount = Math.max(
                        ...stats.appointmentsByDay.map((d) => d.count),
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
                    {stats.popularServices.map((service, index) => (
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
                  {stats.revenueByDay.map((day) => (
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

      {showConfirmModal && pendingAction && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center animate-in fade-in duration-200">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-md w-full mx-4 overflow-hidden animate-in zoom-in duration-200">
            <div
              className={`p-4 ${pendingAction.status === "cancelada" ? "bg-red-50 dark:bg-red-900/20" : "bg-blue-50 dark:bg-blue-900/20"}`}
            >
              <div className="flex items-center gap-3">
                <span className="text-2xl">
                  {pendingAction.status === "cancelada" ? "⚠️" : "✂️"}
                </span>
                <h3 className="text-lg font-bold text-gray-800 dark:text-white">
                  Confirmar acción
                </h3>
              </div>
            </div>

            <div className="p-6">
              <p className="text-gray-700 dark:text-gray-300 mb-4">
                ¿Estás seguro de que deseas marcar esta cita como{" "}
                <span
                  className={`font-bold px-2 py-0.5 rounded ${getStatusColor(pendingAction.status)}`}
                >
                  {statusText}
                </span>
                ?
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Esta acción no se puede deshacer.
              </p>
            </div>

            <div className="flex gap-3 p-4 border-t border-gray-200 dark:border-gray-700">
              <button
                onClick={() => {
                  setShowConfirmModal(false);
                  setPendingAction(null);
                }}
                className="flex-1 px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={confirmUpdateStatus}
                className={`
                  flex-1 px-4 py-2 rounded-lg text-white font-medium transition-colors
                  ${
                    pendingAction.status === "cancelada"
                      ? "bg-red-600 hover:bg-red-700"
                      : "bg-blue-600 hover:bg-blue-700"
                  }
                `}
              >
                Sí, {statusText}
              </button>
            </div>
          </div>
        </div>
      )}

      {newAppointmentModal}

      {showDeleteModal && pendingDeleteId && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center animate-in fade-in duration-200">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-md w-full mx-4 overflow-hidden animate-in zoom-in duration-200">
            <div className="p-4 bg-red-50 dark:bg-red-900/20">
              <div className="flex items-center gap-3">
                <span className="text-2xl">🗑️</span>
                <h3 className="text-lg font-bold text-gray-800 dark:text-white">
                  Eliminar cita
                </h3>
              </div>
            </div>

            <div className="p-6">
              <p className="text-gray-700 dark:text-gray-300 mb-4">
                ¿Estás seguro de que deseas eliminar esta cita?
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Esta acción no se puede deshacer.
              </p>
            </div>

            <div className="flex gap-3 p-4 border-t border-gray-200 dark:border-gray-700">
              <button
                onClick={closeDeleteModal}
                className="flex-1 px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={() => {
                  closeDeleteModal();
                  deleteAppointment(pendingDeleteId);
                }}
                className="flex-1 px-4 py-2 rounded-lg text-white font-medium bg-red-600 hover:bg-red-700 transition-colors"
              >
                Sí, eliminar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
