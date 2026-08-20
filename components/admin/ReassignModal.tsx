"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import type { Appointment, Barber } from "@/lib/types";
import { toISODate, formatDateShort } from "@/lib/types";
import { buildWhatsAppLink, absenceReassignmentMessage } from "@/lib/whatsapp";
import { getMaxBookingDate } from "@/lib/booking";

interface Props {
  open: boolean;
  onClose: () => void;
  appointment: Appointment | null;
  onReassigned: () => void;
}

export default function ReassignModal({ open, onClose, appointment, onReassigned }: Props) {
  const [barbers, setBarbers] = useState<Barber[]>([]);
  const [barberId, setBarberId] = useState("");
  const [date, setDate] = useState<Date | null>(null);
  const [slots, setSlots] = useState<string[]>([]);
  const [selectedTime, setSelectedTime] = useState("");
  const [loading, setLoading] = useState(false);
  const [closing, setClosing] = useState(false);

  const closeModal = () => {
    if (closing) return;
    setClosing(true);
    setTimeout(() => {
      onClose();
      setClosing(false);
    }, 200);
  };

  useEffect(() => {
    if (!open) return;
    setSelectedTime("");
    setSlots([]);

    if (appointment) {
      setBarberId(String(appointment.barber_id || ""));
      setDate(new Date(appointment.date + "T00:00:00"));
    }

    fetch("/api/admin/barbers?active=1")
      .then((r) => r.json())
      .then((data) => setBarbers(data.barbers || []))
      .catch(() => toast.error("Error al cargar peluqueros"));
  }, [open, appointment]);

  useEffect(() => {
    if (!open || !appointment || !barberId || !date) {
      setSlots([]);
      setSelectedTime("");
      return;
    }
    let cancelled = false;
    fetch(`/api/admin/slots?barberId=${barberId}&date=${toISODate(date)}&serviceId=${appointment.service_id}&excludeId=${appointment.id}`)
      .then((r) => r.json())
      .then((data) => {
        if (!cancelled) {
          setSlots(data.slots || []);
          setSelectedTime((prev) => (data.slots || []).includes(prev) ? prev : "");
        }
      })
      .catch(() => toast.error("Error al consultar horarios"));
    return () => {
      cancelled = true;
    };
  }, [open, appointment, barberId, date]);

  const handleSubmit = async () => {
    if (!appointment) return;
    if (!barberId) {
      toast.warning("Selecciona un peluquero");
      return;
    }
    if (!date) {
      toast.warning("Selecciona una fecha");
      return;
    }
    if (!selectedTime) {
      toast.warning("Selecciona una hora");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/admin/appointments", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: appointment.id,
          barberId: Number(barberId),
          date: toISODate(date),
          time: selectedTime
        })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Error al reasignar");
      }

      const newBarber = barbers.find((b) => b.id === Number(barberId));
      const link = buildWhatsAppLink(
        appointment.client_phone || "",
        absenceReassignmentMessage({
          clientName: appointment.client_name || "",
          serviceName: appointment.service_name,
          date: formatDateShort(toISODate(date)),
          time: selectedTime,
          absentBarber: appointment.barber_name || "el peluquero anterior",
          alternativeBarber: newBarber?.name || "otro peluquero",
          alternativeTime: selectedTime
        })
      );

      toast.success("Cita reasignada correctamente", {
        description: `${appointment.client_name} → ${newBarber?.name || "otro peluquero"} · ${formatDateShort(toISODate(date))} ${selectedTime}`,
        action: {
          label: "💬 WhatsApp",
          onClick: () => link && window.open(link, "_blank")
        }
      });
      onReassigned();
      closeModal();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Error al reasignar");
    } finally {
      setLoading(false);
    }
  };

  if (!open || !appointment) return null;

  const overlayCls = closing ? "modal-overlay modal-overlay-closing" : "modal-overlay";

  return (
    <div className={overlayCls} onClick={closeModal}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="p-5 border-b border-stone-800 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold text-stone-50">🔄 Reasignar Cita</h3>
            <p className="text-sm text-stone-400 mt-0.5">
              {appointment.client_name} · {appointment.service_name} ·{" "}
              {formatDateShort(appointment.date)} a las {appointment.time}
            </p>
          </div>
          <button onClick={closeModal} className="text-stone-400 hover:text-white text-xl leading-none">×</button>
        </div>

        <div className="p-5 space-y-4">
          <div>
            <label className="label">Nuevo peluquero</label>
            <select value={barberId} onChange={(e) => { setBarberId(e.target.value); setSelectedTime(""); }} className="input">
              <option value="">Selecciona un peluquero...</option>
              {barbers.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                  {b.id === appointment.barber_id ? " (actual)" : ""}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="label">Nueva fecha</label>
            <DatePicker
              selected={date}
              onChange={(d: Date | null) => { setDate(d); setSelectedTime(""); }}
              minDate={new Date()}
              maxDate={getMaxBookingDate()}
              dateFormat="dd/MM/yyyy"
              className="input"
            />
          </div>

          <div>
            <label className="label">Nueva hora</label>
            {!barberId || !date ? (
              <p className="text-sm text-stone-500">Elige peluquero y fecha para ver horarios.</p>
            ) : slots.length === 0 ? (
              <p className="text-sm text-amber-500/80">No hay horarios disponibles para ese peluquero en esa fecha.</p>
            ) : (
              <div className="grid grid-cols-4 md:grid-cols-6 gap-2">
                {slots.map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setSelectedTime(t)}
                    className={`py-2 rounded-lg text-sm font-medium transition-all ${
                      selectedTime === t
                        ? "bg-amber-500 text-stone-950 shadow-md"
                        : "bg-stone-800 text-stone-300 hover:bg-stone-700"
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="flex gap-3 p-5 border-t border-stone-800">
          <button onClick={closeModal} disabled={loading} className="btn btn-ghost flex-1">
            Cancelar
          </button>
          <button onClick={handleSubmit} disabled={loading} className="btn btn-primary flex-1">
            {loading ? "Reasignando..." : "Reasignar"}
          </button>
        </div>
      </div>
    </div>
  );
}