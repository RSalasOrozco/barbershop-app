"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import type { Barber, Service } from "@/lib/types";
import { toISODate, formatDateShort } from "@/lib/types";
import { getMaxBookingDate } from "@/lib/booking";

interface ClientMatch {
  id: number;
  name: string;
  phone: string | null;
  total_appointments: number;
  last_appointment: string | null;
}

interface Props {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
}

export default function NewAppointmentModal({ open, onClose, onCreated }: Props) {
  const [services, setServices] = useState<Service[]>([]);
  const [barbers, setBarbers] = useState<Barber[]>([]);

  const [selectedUser, setSelectedUser] = useState<ClientMatch | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<ClientMatch[]>([]);
  const [searching, setSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);

  const [clientName, setClientName] = useState("");
  const [clientPhone, setClientPhone] = useState("");
  const [serviceId, setServiceId] = useState("");
  const [barberId, setBarberId] = useState("");
  const [date, setDate] = useState<Date | null>(null);
  const [slots, setSlots] = useState<string[]>([]);
  const [selectedTime, setSelectedTime] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingSlots, setLoadingSlots] = useState(false);

  const reset = () => {
    setSelectedUser(null);
    setSearchQuery("");
    setSearchResults([]);
    setClientName("");
    setClientPhone("");
    setServiceId("");
    setBarberId("");
    setDate(null);
    setSlots([]);
    setSelectedTime("");
    setNotes("");
  };

  const fetchData = useCallback(async () => {
    try {
      const [servicesRes, barbersRes] = await Promise.all([
        fetch("/api/services"),
        fetch("/api/admin/barbers?active=1")
      ]);
      if (servicesRes.ok) {
        const data = await servicesRes.json();
        setServices(data.services || []);
      }
      if (barbersRes.ok) {
        const data = await barbersRes.json();
        setBarbers(data.barbers || []);
      }
    } catch (error) {
      console.error("Error cargando datos:", error);
    }
  }, []);

  useEffect(() => {
    if (open) {
      reset();
      fetchData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Búsqueda de cliente existente (debounce)
  useEffect(() => {
    if (!open) {
      setSearchResults([]);
      return;
    }
    const q = searchQuery.trim();
    if (q.length < 2) {
      setSearchResults([]);
      return;
    }
    let cancelled = false;
    setSearching(true);
    const timer = setTimeout(() => {
      fetch(`/api/admin/clients?q=${encodeURIComponent(q)}`)
        .then((r) => r.json())
        .then((data) => {
          if (!cancelled) {
            setSearchResults(data.clients || []);
            setShowResults(true);
          }
        })
        .catch(() => {
          if (!cancelled) setSearchResults([]);
        })
        .finally(() => !cancelled && setSearching(false));
    }, 300);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [open, selectedUser, searchQuery]);

  const pickClient = (c: ClientMatch) => {
    setSelectedUser(c);
    setSearchResults([]);
    setShowResults(false);
    setSearchQuery("");
    setClientName(c.name);
    setClientPhone(c.phone || "");
  };

  const clearClient = () => {
    setSelectedUser(null);
    setSearchQuery("");
    setSearchResults([]);
    setShowResults(false);
    setClientName("");
    setClientPhone("");
  };

  // Cargar slots cuando hay barbero + servicio + fecha
  useEffect(() => {
    if (!barberId || !serviceId || !date) {
      setSlots([]);
      setSelectedTime("");
      return;
    }
    let cancelled = false;
    setLoadingSlots(true);
    fetch(`/api/admin/slots?barberId=${barberId}&date=${toISODate(date)}&serviceId=${serviceId}`)
      .then((r) => r.json())
      .then((data) => {
        if (!cancelled) {
          setSlots(data.slots || []);
          setSelectedTime((prev) => (data.slots || []).includes(prev) ? prev : "");
        }
      })
      .catch(() => toast.error("Error al consultar horarios"))
      .finally(() => !cancelled && setLoadingSlots(false));
    return () => {
      cancelled = true;
    };
  }, [barberId, serviceId, date]);

  const handleSubmit = async () => {
    if (!selectedUser && (!clientName.trim() || !clientPhone.trim())) {
      toast.warning("Ingresa nombre y teléfono del cliente");
      return;
    }
    if (!serviceId) {
      toast.warning("Selecciona un servicio");
      return;
    }
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
      const body: Record<string, unknown> = {
        serviceId: Number(serviceId),
        barberId: Number(barberId),
        date: toISODate(date),
        time: selectedTime,
        notes: notes || undefined
      };
      if (selectedUser) {
        body.userId = selectedUser.id;
      } else {
        body.client = { name: clientName.trim(), phone: clientPhone.trim() };
      }

      const res = await fetch("/api/admin/appointments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
      });
      const data = await res.json();

      if (res.ok) {
        toast.success(`Cita creada — Código: ${data.confirmationCode}`);
        onClose();
        onCreated();
      } else {
        toast.error(data.error || "Error al crear la cita");
      }
    } catch (error) {
      console.error(error);
      toast.error("Error al crear la cita");
    } finally {
      setLoading(false);
    }
  };

  if (!open) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="p-5 border-b border-stone-800 flex items-center justify-between">
          <h3 className="text-lg font-bold text-stone-50">📅 Nueva Cita</h3>
          <button onClick={onClose} className="text-stone-400 hover:text-white text-xl leading-none">×</button>
        </div>

        <div className="p-5 space-y-4">
          {/* Cliente */}
          <div>
            <label className="label">Cliente</label>
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onFocus={() => setShowResults(true)}
                placeholder="Buscar por nombre o teléfono..."
                className="input"
              />
              {searching && (
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-stone-500">
                  Buscando...
                </span>
              )}
              {showResults && searchResults.length > 0 && (
                <div className="absolute z-20 mt-1 w-full bg-stone-800 border border-stone-700 rounded-xl shadow-xl overflow-hidden">
                  {searchResults.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => pickClient(c)}
                      className="w-full text-left px-4 py-2.5 hover:bg-stone-700 transition-colors flex items-center justify-between gap-2"
                    >
                      <div>
                        <p className="text-sm font-medium text-stone-100">{c.name}</p>
                        <p className="text-xs text-stone-400">{c.phone || "Sin teléfono"}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <span className="text-xs font-semibold text-amber-400">{c.total_appointments} citas</span>
                        {c.last_appointment && (
                          <p className="text-[10px] text-stone-500">Última: {formatDateShort(c.last_appointment)}</p>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {selectedUser ? (
              <div className="mt-3 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-emerald-300">
                    ✓ Cliente existente: {selectedUser.name}
                  </p>
                  <p className="text-xs text-stone-400">
                    {selectedUser.phone} · {selectedUser.total_appointments} cita(s) en su historial
                  </p>
                </div>
                <button
                  type="button"
                  onClick={clearClient}
                  className="text-xs text-stone-400 hover:text-stone-200 underline"
                >
                  Cambiar
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3 mt-3">
                <input
                  type="text"
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value.replace(/[^A-Za-zÁáÉéÍíÓóÚúÑñ\s]/g, ""))}
                  placeholder="Nombre (cliente nuevo)"
                  className="input"
                />
                <input
                  type="tel"
                  inputMode="numeric"
                  value={clientPhone}
                  onChange={(e) => setClientPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
                  placeholder="3001234567"
                  className="input"
                />
              </div>
            )}
            <p className="text-xs text-stone-500 mt-2">
              {selectedUser
                ? "Se vinculará la cita al historial del cliente."
                : "Si el cliente ya existe, escríbelo arriba y selecciónalo de la lista."}
            </p>
          </div>

          {/* Servicio */}
          <div>
            <label className="label">Servicio</label>
            <select
              value={serviceId}
              onChange={(e) => {
                setServiceId(e.target.value);
                setSelectedTime("");
              }}
              className="input"
            >
              <option value="">Selecciona un servicio...</option>
              {services.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} — ${s.price.toLocaleString()} · {s.duration} min
                </option>
              ))}
            </select>
          </div>

          {/* Peluquero */}
          <div>
            <label className="label">Peluquero</label>
            <select
              value={barberId}
              onChange={(e) => {
                setBarberId(e.target.value);
                setSelectedTime("");
              }}
              className="input"
            >
              <option value="">Selecciona un peluquero...</option>
              {barbers.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name} {b.phone ? `· ${b.phone}` : ""}
                </option>
              ))}
            </select>
          </div>

          {/* Fecha */}
          <div>
            <label className="label">Fecha</label>
            <DatePicker
              selected={date}
              onChange={(d: Date | null) => {
                setDate(d);
                setSelectedTime("");
              }}
              minDate={new Date()}
              maxDate={getMaxBookingDate()}
              dateFormat="dd/MM/yyyy"
              placeholderText="Selecciona fecha"
              className="input"
            />
            <p className="text-xs text-stone-500 mt-1">
              Reservas con máximo 15 días de anticipación.
            </p>
          </div>

          {/* Hora */}
          <div>
            <label className="label">
              Hora {serviceId && <span className="text-stone-500 font-normal">(según disponibilidad del peluquero)</span>}
            </label>
            {!barberId || !serviceId || !date ? (
              <p className="text-sm text-stone-500">Elige peluquero, servicio y fecha para ver horarios.</p>
            ) : loadingSlots ? (
              <p className="text-sm text-stone-400">Consultando disponibilidad...</p>
            ) : slots.length === 0 ? (
              <p className="text-sm text-amber-500/80">No hay horarios disponibles para este peluquero en esa fecha.</p>
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

          {/* Notas */}
          <div>
            <label className="label">Notas (opcional)</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              placeholder="Ej: corte con máquina, cliente frecuente..."
              className="input resize-none"
            />
          </div>
        </div>

        <div className="flex gap-3 p-5 border-t border-stone-800">
          <button onClick={onClose} disabled={loading} className="btn btn-ghost flex-1">
            Cancelar
          </button>
          <button onClick={handleSubmit} disabled={loading} className="btn btn-primary flex-1">
            {loading ? "Creando..." : "Crear Cita"}
          </button>
        </div>
      </div>
    </div>
  );
}