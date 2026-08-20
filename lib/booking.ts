import { toISODate } from "@/lib/types";

/** Máximo de días hacia el futuro que se permite agendar una cita. */
export const MAX_BOOKING_DAYS = 15;

/** Última fecha permitida para agendar (hoy + MAX_BOOKING_DAYS). */
export function getMaxBookingDate(): Date {
  const d = new Date();
  d.setDate(d.getDate() + MAX_BOOKING_DAYS);
  return d;
}

/** Valida que una fecha esté dentro de la ventana de reserva (no pasada ni más allá del límite). */
export function isWithinBookingWindow(date: string): { valid: boolean; error?: string } {
  const todayStr = toISODate(new Date());
  if (date < todayStr) {
    return { valid: false, error: "No puedes agendar citas en fechas pasadas" };
  }
  if (date > toISODate(getMaxBookingDate())) {
    return {
      valid: false,
      error: `Solo se pueden agendar citas con máximo ${MAX_BOOKING_DAYS} días de anticipación`
    };
  }
  return { valid: true };
}