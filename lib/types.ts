export interface Appointment {
  id: number;
  user_id: number | null;
  service_id: number;
  barber_id: number | null;
  date: string;
  time: string;
  status: "pendiente" | "confirmada" | "completada" | "cancelada";
  notes: string | null;
  client_name: string | null;
  client_phone: string | null;
  confirmation_code: string | null;
  service_name: string;
  service_price: number;
  service_duration: number;
  barber_name: string | null;
  barber_color: string | null;
  payment_method?: string;
  paid_amount?: number | null;
}

export interface Barber {
  id: number;
  name: string;
  phone: string | null;
  color: string;
  active: number;
  notes: string | null;
  total_appointments: number;
  total_revenue: number;
  upcoming_appointments: number;
  commission_type?: string;
  commission_value?: number;
}

export interface Expense {
  id: number;
  date: string;
  description: string;
  amount: number;
  category: string | null;
  created_at?: string;
}

export interface Service {
  id: number;
  name: string;
  price: number;
  duration: number;
  total_appointments?: number;
}

export interface User {
  id: number;
  name: string;
  email: string;
  phone: string | null;
  role: "admin" | "cliente";
  created_at: string;
  total_appointments: number;
  total_spent: number;
}

export interface SessionUser {
  id: number;
  name: string;
  email: string;
  role: "admin" | "cliente";
}

export interface ScheduleDay {
  day_of_week: number;
  is_working: boolean;
  start_time: string;
  end_time: string;
  break_start: string | null;
  break_end: string | null;
}

export interface Absence {
  id: number;
  barber_id: number;
  date: string;
  end_date: string | null;
  reason: string | null;
  barber_name: string;
  barber_color: string;
}

export interface Stats {
  totalAppointments: number;
  pendingAppointments: number;
  completedAppointments: number;
  cancelledAppointments: number;
  todayAppointments: number;
  totalRevenue: number;
  appointmentsByDay: { day_name: string; day_num: string; count: number }[];
  revenueByDay: { date: string; total: number }[];
  popularServices: { name: string; count: number; revenue: number }[];
  perBarber: { id: number; name: string; color: string; total: number; completed: number; revenue: number }[];
}

export const DAY_NAMES = [
  { value: 0, label: "Domingo", short: "Dom" },
  { value: 1, label: "Lunes", short: "Lun" },
  { value: 2, label: "Martes", short: "Mar" },
  { value: 3, label: "Miércoles", short: "Mié" },
  { value: 4, label: "Jueves", short: "Jue" },
  { value: 5, label: "Viernes", short: "Vie" },
  { value: 6, label: "Sábado", short: "Sáb" }
];

export function formatDate(iso: string): string {
  return new Date(iso + "T00:00:00").toLocaleDateString("es-ES", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric"
  });
}

export function formatDateShort(iso: string): string {
  return new Date(iso + "T00:00:00").toLocaleDateString("es-ES", {
    day: "numeric",
    month: "short"
  });
}

export function formatCurrency(n: number): string {
  return "$" + (n || 0).toLocaleString("es-CO");
}

export function toISODate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export interface FinanceBarberRow {
  id: number;
  name: string;
  color: string;
  count: number;
  income: number;
  commission: number;
  net: number;
  commission_type: string;
  commission_value: number;
}

export interface FinanceMonth {
  month: string;
  income: number;
  expenses: number;
  profit: number;
  appointmentCount: number;
  averageTicket: number;
  previous: { income: number; expenses: number; profit: number };
  byDay: { date: string; count: number; income: number }[];
  byBarber: FinanceBarberRow[];
  byService: { name: string; count: number; income: number }[];
  byPaymentMethod: { method: string; count: number; income: number }[];
  expensesList: Expense[];
  last12Months: { month: string; income: number; expenses: number; profit: number }[];
}

export const STATUS_META: Record<string, { label: string; cls: string; dot: string }> = {
  pendiente: {
    label: "Pendiente",
    cls: "bg-amber-500/15 text-amber-400 border border-amber-500/30",
    dot: "bg-amber-500"
  },
  confirmada: {
    label: "Confirmada",
    cls: "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30",
    dot: "bg-emerald-500"
  },
  completada: {
    label: "Completada",
    cls: "bg-sky-500/15 text-sky-400 border border-sky-500/30",
    dot: "bg-sky-500"
  },
  cancelada: {
    label: "Cancelada",
    cls: "bg-red-500/15 text-red-400 border border-red-500/30",
    dot: "bg-red-500"
  }
};