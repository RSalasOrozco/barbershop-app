import db from "@/lib/db";
import { isWithinBookingWindow } from "@/lib/booking";

export const SLOT_STEP_MIN = 30;

// Reexportados para las API (el módulo de ventana no depende de la BD)
export { MAX_BOOKING_DAYS, getMaxBookingDate } from "@/lib/booking";

export interface ScheduleRow {
  id: number;
  barber_id: number;
  day_of_week: number;
  is_working: number;
  start_time: string | null;
  end_time: string | null;
  break_start: string | null;
  break_end: string | null;
}

export interface AppointmentSlot {
  id: number;
  time: string;
  duration: number;
  status: string;
}

export function timeToMinutes(time: string): number {
  const [h, m] = time.split(":").map((n) => parseInt(n, 10));
  return h * 60 + m;
}

export function minutesToTime(mins: number): string {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

export function dayOfWeek(date: string): number {
  return new Date(`${date}T00:00:00`).getDay();
}

export function getScheduleForDate(barberId: number, date: string): ScheduleRow | undefined {
  const dow = dayOfWeek(date);
  return db
    .prepare(
      "SELECT * FROM barber_schedules WHERE barber_id = ? AND day_of_week = ?"
    )
    .get(barberId, dow) as ScheduleRow | undefined;
}

export function isAbsent(barberId: number, date: string): boolean {
  const row = db
    .prepare(
      `SELECT id FROM barber_absences
       WHERE barber_id = ?
         AND date <= ?
         AND (end_date IS NULL OR end_date >= ?)`
    )
    .get(barberId, date, date);
  return !!row;
}

export function isBarberActive(barberId: number): boolean {
  const row = db.prepare("SELECT active FROM barbers WHERE id = ?").get(barberId) as
    | { active: number }
    | undefined;
  return row ? row.active === 1 : false;
}

function getBusyIntervals(
  barberId: number,
  date: string,
  excludeAppointmentId?: number
): Array<{ start: number; end: number }> {
  const rows = db
    .prepare(
      `SELECT a.time, s.duration
       FROM appointments a
       JOIN services s ON a.service_id = s.id
       WHERE a.barber_id = ?
         AND a.date = ?
         AND a.status != 'cancelada'
         ${excludeAppointmentId ? "AND a.id != ?" : ""}
       ORDER BY a.time`
    )
    .all(...(excludeAppointmentId ? [barberId, date, excludeAppointmentId] : [barberId, date])) as AppointmentSlot[];

  return rows.map((r) => ({
    start: timeToMinutes(r.time),
    end: timeToMinutes(r.time) + (r.duration || 30)
  }));
}

export function getServiceDuration(serviceId: number): number {
  const row = db.prepare("SELECT duration FROM services WHERE id = ?").get(serviceId) as
    | { duration: number }
    | undefined;
  return row?.duration ?? 30;
}

function intervalsOverlap(a: { start: number; end: number }, b: { start: number; end: number }): boolean {
  return a.start < b.end && b.start < a.end;
}

function isPastTime(date: string, time: string): boolean {
  const today = new Date();
  const target = new Date(`${date}T${time}:00`);
  return target.getTime() < today.getTime();
}

/**
 * Genera los turnos disponibles para un barbero en una fecha,
 * respetando su horario semanal, descansos, ausencias y citas ya agendadas.
 */
export function getAvailableSlots(
  barberId: number,
  date: string,
  durationMinutes: number,
  excludeAppointmentId?: number
): string[] {
  if (!isBarberActive(barberId)) return [];

  const windowCheck = isWithinBookingWindow(date);
  if (!windowCheck.valid) return [];

  const schedule = getScheduleForDate(barberId, date);
  if (!schedule || schedule.is_working !== 1 || !schedule.start_time || !schedule.end_time) {
    return [];
  }

  if (isAbsent(barberId, date)) return [];

  const startMin = timeToMinutes(schedule.start_time);
  const endMin = timeToMinutes(schedule.end_time);
  const breakStart = schedule.break_start ? timeToMinutes(schedule.break_start) : null;
  const breakEnd = schedule.break_end ? timeToMinutes(schedule.break_end) : null;
  const busy = getBusyIntervals(barberId, date, excludeAppointmentId);

  const slots: string[] = [];

  for (let t = startMin; t + durationMinutes <= endMin; t += SLOT_STEP_MIN) {
    const candidate = { start: t, end: t + durationMinutes };

    if (breakStart !== null && breakEnd !== null && intervalsOverlap(candidate, { start: breakStart, end: breakEnd })) {
      continue;
    }

    if (busy.some((b) => intervalsOverlap(candidate, b))) {
      continue;
    }

    const timeStr = minutesToTime(t);
    if (date === new Date().toISOString().slice(0, 10) && isPastTime(date, timeStr)) {
      continue;
    }

    slots.push(timeStr);
  }

  return slots;
}

/**
 * Valida que un turno específico esté libre para el barbero en la fecha dada.
 */
export function isTimeAvailable(
  barberId: number,
  date: string,
  time: string,
  durationMinutes: number,
  excludeAppointmentId?: number
): boolean {
  return getAvailableSlots(barberId, date, durationMinutes, excludeAppointmentId).includes(time);
}