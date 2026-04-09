"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";

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
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [user, setUser] = useState<any>(null);
  // ✅ CAMBIO #1: Agregar estado para el código de confirmación
  const [confirmationCode, setConfirmationCode] = useState<string | null>(null);

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

  // Función para obtener los horarios según la fecha seleccionada
  const getTimeSlots = () => {
    if (!selectedDate) return horariosNormales;
    const dia = selectedDate.getDay(); // 0 = domingo
    if (dia === 0) {
      return horariosDomingo;
    }
    return horariosNormales;
  };

  useEffect(() => {
    fetchServices();
    fetchUserData();
  }, []);

  // Limpiar la hora seleccionada si cambia la fecha y la hora ya no está disponible
  useEffect(() => {
    if (selectedDate && selectedTime) {
      const horariosDisponibles = getTimeSlots();
      if (!horariosDisponibles.includes(selectedTime)) {
        setSelectedTime("");
      }
    }
  }, [selectedDate]);

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
    try {
      const res = await fetch("/api/services");
      const data = await res.json();
      setServices(data.services);
    } catch (error) {
      console.error("Error cargando servicios:", error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedService || !selectedDate || !selectedTime) {
      setError("Por favor completa todos los campos requeridos");
      return;
    }

    setLoading(true);
    setError("");
    setSuccess("");
    // ✅ Limpiar código anterior cuando se envía una nueva cita
    setConfirmationCode(null);

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

      // ✅ CAMBIO #2: Guardar el código de confirmación y mostrar en el mensaje
      setConfirmationCode(data.confirmationCode);
      setSuccess(`✅ ¡Cita agendada exitosamente!`);

      setTimeout(() => {
        router.push("/cliente");
      }, 4000); // Aumentado a 4 segundos para que alcance a leer el código
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Filtrar solo fechas pasadas (permite TODOS los días, incluyendo domingos)
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

        {/* ✅ CAMBIO #3: Mostrar el código de confirmación en el mensaje de éxito */}
        {success && (
          <div className="mb-6 bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded">
            {success}
            {confirmationCode && (
              <div className="mt-3 p-3 bg-blue-100 border border-blue-400 text-blue-700 rounded">
                <strong>📱 CÓDIGO DE CONFIRMACIÓN:</strong>
                <div className="text-2xl font-bold my-2">
                  {confirmationCode}
                </div>
                <small>
                  ✂️ Preséntalo cuando llegues a la barbería para confirmar tu
                  cita.
                </small>
                <br />
                <small className="text-xs">
                  💡 También recibirás este código por WhatsApp (próximamente).
                </small>
              </div>
            )}
          </div>
        )}

        {error && (
          <div className="mb-6 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
            {error}
          </div>
        )}

        <form
          onSubmit={handleSubmit}
          className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 md:p-8"
        >
          {/* Selección de Servicio */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              ¿Qué servicio deseas? *
            </label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {services.map((service) => (
                <div
                  key={service.id}
                  onClick={() => setSelectedService(service.id)}
                  className={`
                    cursor-pointer p-4 rounded-lg border-2 transition-all
                    ${
                      selectedService === service.id
                        ? "border-blue-500 bg-blue-50 dark:bg-blue-900/30"
                        : "border-gray-200 dark:border-gray-600 hover:border-blue-300"
                    }
                  `}
                >
                  <h3 className="font-semibold text-gray-800 dark:text-white">
                    {service.name}
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-300">
                    ${service.price.toLocaleString()} COP
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Duración: {service.duration} min
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Selección de Fecha */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Fecha *
            </label>
            <DatePicker
              selected={selectedDate}
              onChange={(date) => setSelectedDate(date)}
              filterDate={filterDate}
              minDate={new Date()}
              dateFormat="dd/MM/yyyy"
              placeholderText="Selecciona una fecha"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
              required
            />

            {/* Mensaje informativo para domingos */}
            {selectedDate && selectedDate.getDay() === 0 && (
              <div className="mt-2 p-2 bg-orange-100 border border-orange-400 text-orange-700 rounded text-sm">
                ⚠️ Los domingos solo atendemos hasta las 2:00 PM
              </div>
            )}
          </div>

          {/* Selección de Hora */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Hora *
            </label>
            <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
              {getTimeSlots().map((time) => (
                <button
                  key={time}
                  type="button"
                  onClick={() => setSelectedTime(time)}
                  className={`
                    py-2 px-3 rounded-md text-sm font-medium transition-colors
                    ${
                      selectedTime === time
                        ? "bg-blue-600 text-white"
                        : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
                    }
                  `}
                >
                  {time}
                </button>
              ))}
            </div>
          </div>

          {/* Notas adicionales */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Notas adicionales (opcional)
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              placeholder="Ej: Prefiero corte con tijera, tengo el cabello largo..."
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
            />
          </div>

          {/* Botón Submit */}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-4 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? "Agendando..." : "Confirmar Cita"}
          </button>
        </form>
      </div>
    </div>
  );
}
