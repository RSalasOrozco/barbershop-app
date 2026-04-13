"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import toast from "react-hot-toast";

interface Service {
  id: number;
  name: string;
  price: number;
  duration: number;
}

export default function AgendarCitaPage() {
  const router = useRouter();
  const [services, setServices] = useState<Service[]>([]);
  const [selectedService, setSelectedService] = useState<number | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedTime, setSelectedTime] = useState<string>("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [confirmationCode, setConfirmationCode] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState(0);

  // Horarios normales (Lunes a Sábado)
  const horariosNormales = [
    "09:00",
    "09:30",
    "10:00",
    "10:30",
    "11:00",
    "11:30",
    "14:00",
    "14:30",
    "15:00",
    "15:30",
    "16:00",
    "16:30",
    "17:00"
  ];

  // Horarios para Domingos (solo hasta 2pm)
  const horariosDomingo = [
    "09:00",
    "09:30",
    "10:00",
    "10:30",
    "11:00",
    "11:30",
    "14:00"
  ];

  const getTimeSlots = () => {
    if (!selectedDate) return horariosNormales;
    const dia = selectedDate.getDay();
    if (dia === 0) return horariosDomingo;
    return horariosNormales;
  };

  const getAvailableTimeSlots = () => {
    const todosLosHorarios = getTimeSlots();
    if (!selectedDate) return todosLosHorarios;

    const ahora = new Date();
    if (selectedDate.toDateString() !== ahora.toDateString()) {
      return todosLosHorarios;
    }

    const horaActual = ahora.getHours();
    const minutoActual = ahora.getMinutes();

    return todosLosHorarios.filter((time) => {
      const [hora, minuto] = time.split(":");
      const horaTime = parseInt(hora);
      const minutoTime = parseInt(minuto);
      if (horaTime > horaActual) return true;
      if (horaTime === horaActual && minutoTime > minutoActual) return true;
      return false;
    });
  };

  useEffect(() => {
    fetchServices();
    fetchUserData();
  }, []);

  useEffect(() => {
    if (selectedDate && selectedTime) {
      const horariosDisponibles = getAvailableTimeSlots();
      if (!horariosDisponibles.includes(selectedTime)) {
        setSelectedTime("");
      }
    }
  }, [selectedDate]);

  // Contador regresivo para la redirección
  useEffect(() => {
    if (confirmationCode) {
      setTimeLeft(8);
      const interval = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            clearInterval(interval);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [confirmationCode]);

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

  const fetchServices = async () => {
    const loadingToast = toast.loading("🔄 Cargando servicios...", {
      style: { background: "#3b82f6", color: "#fff" },
      icon: "💈"
    });

    try {
      const res = await fetch("/api/services");
      const data = await res.json();
      setServices(data.services);
      toast.success("✅ Servicios cargados", { id: loadingToast });
    } catch (error) {
      toast.error("❌ Error al cargar servicios", { id: loadingToast });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedService || !selectedDate || !selectedTime) {
      toast.error("⚠️ Completa todos los campos", {
        icon: "📋",
        style: { background: "#ef4444", color: "#fff" }
      });
      return;
    }

    const ahora = new Date();
    if (selectedDate.toDateString() === ahora.toDateString()) {
      const [horaCita, minutoCita] = selectedTime.split(":");
      const horaActual = ahora.getHours();
      const minutoActual = ahora.getMinutes();
      const horaCitaNum = parseInt(horaCita);
      const minutoCitaNum = parseInt(minutoCita);

      if (
        horaCitaNum < horaActual ||
        (horaCitaNum === horaActual && minutoCitaNum < minutoActual)
      ) {
        toast.error(`⏰ No puedes agendar para las ${selectedTime} (ya pasó)`, {
          icon: "⚠️",
          style: { background: "#ef4444", color: "#fff" }
        });
        return;
      }
    }

    setLoading(true);
    setConfirmationCode(null);

    const loadingToast = toast.loading("✂️ Agendando tu cita...", {
      style: { background: "#3b82f6", color: "#fff" },
      icon: "⏳"
    });

    try {
      const formattedDate = selectedDate.toISOString().split("T")[0];

      const res = await fetch("/api/appointments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          serviceId: selectedService,
          date: formattedDate,
          time: selectedTime,
          notes
        })
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Error al agendar");
      }

      setConfirmationCode(data.confirmationCode);

      toast.success("¡Cita agendada exitosamente!", {
        id: loadingToast,
        icon: "🎉",
        style: { background: "#10b981", color: "#fff" }
      });

      setTimeout(() => {
        router.push("/cliente");
      }, 8000);
    } catch (err: any) {
      toast.error(err.message, {
        id: loadingToast,
        icon: "❌",
        style: { background: "#ef4444", color: "#fff" }
      });
      setLoading(false);
    }
  };

  const filterDate = (date: Date) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return date >= today;
  };

  return (
    <div>
      <Navbar userName={user?.name} userRole={user?.role} />

      <div className="container mx-auto p-4 md:p-8 max-w-3xl">
        <h1 className="text-3xl font-bold text-gray-800 dark:text-white mb-2">
          📅 Agendar Nueva Cita
        </h1>
        <p className="text-gray-600 dark:text-gray-300 mb-8">
          Elige el servicio, fecha y hora que más te convenga
        </p>

        {/* Cuadro de código de confirmación */}
        {confirmationCode && (
          <div className="mb-6 p-5 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl shadow-2xl animate-in fade-in zoom-in duration-300">
            <div className="text-center">
              <p className="text-blue-100 text-sm font-medium mb-1">
                📱 TU CÓDIGO DE CONFIRMACIÓN
              </p>
              <p className="text-4xl md:text-5xl font-bold text-white font-mono tracking-wider my-2">
                {confirmationCode}
              </p>
              <p className="text-blue-100 text-xs">
                ✂️ Preséntalo cuando llegues a la barbería
              </p>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(confirmationCode);
                  toast.success("✅ Código copiado", {
                    icon: "📋",
                    style: { background: "#10b981", color: "#fff" }
                  });
                }}
                className="mt-3 bg-white/20 hover:bg-white/30 text-white text-sm font-medium py-1.5 px-4 rounded-lg transition-all"
              >
                📋 Copiar código
              </button>
              <p className="text-blue-100 text-xs mt-3">
                Redirigiendo en {timeLeft} segundos...
              </p>
            </div>
          </div>
        )}

        <form
          onSubmit={handleSubmit}
          className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 md:p-8"
        >
          {/* Servicios */}
          <div className="mb-6">
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
              ✂️ ¿Qué servicio deseas?
            </label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {services.map((service) => (
                <div
                  key={service.id}
                  onClick={() => setSelectedService(service.id)}
                  className={`
                    cursor-pointer p-4 rounded-xl border-2 transition-all duration-200
                    ${
                      selectedService === service.id
                        ? "border-blue-500 bg-blue-50 dark:bg-blue-900/30 shadow-md scale-[1.02]"
                        : "border-gray-200 dark:border-gray-600 hover:border-blue-300 hover:bg-gray-50 dark:hover:bg-gray-700/50"
                    }
                  `}
                >
                  <h3 className="font-bold text-gray-800 dark:text-white">
                    {service.name}
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                    💰 ${service.price.toLocaleString()} COP
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    ⏱️ {service.duration} min
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Fecha */}
          <div className="mb-6">
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
              📅 Fecha
            </label>
            <DatePicker
              selected={selectedDate}
              onChange={(date) => setSelectedDate(date)}
              filterDate={filterDate}
              minDate={new Date()}
              dateFormat="dd/MM/yyyy"
              placeholderText="Selecciona una fecha"
              className="w-full px-4 py-3 border-2 border-gray-200 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white transition-all"
            />
            {selectedDate && selectedDate.getDay() === 0 && (
              <div className="mt-2 p-2 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg text-sm text-orange-700 dark:text-orange-300">
                ⚠️ Los domingos solo atendemos hasta las 2:00 PM
              </div>
            )}
          </div>

          {/* Hora */}
          <div className="mb-6">
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
              ⏰ Hora
            </label>
            <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
              {getAvailableTimeSlots().map((time) => {
                const isSelected = selectedTime === time;
                return (
                  <button
                    key={time}
                    type="button"
                    onClick={() => setSelectedTime(time)}
                    className={`
                      py-2.5 px-3 rounded-xl text-sm font-medium transition-all duration-200
                      ${
                        isSelected
                          ? "bg-blue-600 text-white shadow-lg scale-105 ring-2 ring-blue-400 ring-offset-2"
                          : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 hover:scale-105"
                      }
                    `}
                  >
                    {time}
                  </button>
                );
              })}
            </div>
            {selectedDate &&
              selectedDate.toDateString() === new Date().toDateString() && (
                <div className="mt-3 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl">
                  <p className="text-sm text-amber-700 dark:text-amber-300">
                    ⏰ Solo se muestran horarios disponibles (horas futuras)
                  </p>
                </div>
              )}
          </div>

          {/* Notas */}
          <div className="mb-6">
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
              📝 Notas adicionales
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              placeholder="Ej: Prefiero corte con tijera, tengo el cabello largo..."
              className="w-full px-4 py-3 border-2 border-gray-200 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white resize-none transition-all"
            />
          </div>

          {/* Botón */}
          <button
            type="submit"
            disabled={loading}
            className={`
              w-full py-3.5 rounded-xl font-bold text-lg transition-all duration-200
              flex items-center justify-center gap-3
              ${
                loading
                  ? "bg-gray-400 cursor-not-allowed"
                  : "bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white shadow-lg hover:shadow-xl transform hover:scale-[1.02]"
              }
            `}
          >
            {loading ? (
              <>
                <svg
                  className="animate-spin h-5 w-5 text-white"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  ></circle>
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  ></path>
                </svg>
                Agendando cita...
              </>
            ) : (
              "✅ Confirmar Cita"
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
