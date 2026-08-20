import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";
import { requireAdmin } from "@/lib/guard";
import type { FinanceBarberRow } from "@/lib/types";

function addMonths(month: string, delta: number): string {
  const [y, m] = month.split("-").map(Number);
  const total = y * 12 + (m - 1) + delta;
  const ny = Math.floor(total / 12);
  const nm = (total % 12) + 1;
  return `${ny}-${String(nm).padStart(2, "0")}`;
}

function round(n: number): number {
  return Math.round(n);
}

// GET - Finanzas del mes seleccionado
export async function GET(request: NextRequest) {
  try {
    const guard = await requireAdmin(request);
    if (guard.error) return guard.error;

    const { searchParams } = new URL(request.url);
    let month = searchParams.get("month") || "";

    if (!/^\d{4}-\d{2}$/.test(month)) {
      const now = new Date();
      month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    }

    const prevMonth = addMonths(month, -1);
    const startMonth = addMonths(month, -11);
    const startDate = `${startMonth}-01`;

    const sumIncomeFor = (m: string): { income: number; count: number } => {
      const row = db
        .prepare(
          `SELECT COALESCE(SUM(COALESCE(a.paid_amount, s.price)), 0) as income, COUNT(*) as count
           FROM appointments a
           JOIN services s ON a.service_id = s.id
           WHERE a.status = 'completada' AND substr(a.date, 1, 7) = ?`
        )
        .get(m) as { income: number; count: number };
      return { income: row.income, count: row.count };
    };

    const sumExpensesFor = (m: string): number => {
      const row = db
        .prepare(`SELECT COALESCE(SUM(amount), 0) as total FROM expenses WHERE substr(date, 1, 7) = ?`)
        .get(m) as { total: number };
      return row.total;
    };

    const current = sumIncomeFor(month);
    const currentExpenses = sumExpensesFor(month);
    const previous = sumIncomeFor(prevMonth);
    const previousExpenses = sumExpensesFor(prevMonth);

    const byDay = db
      .prepare(
        `SELECT a.date, COUNT(*) as count, COALESCE(SUM(COALESCE(a.paid_amount, s.price)), 0) as income
         FROM appointments a
         JOIN services s ON a.service_id = s.id
         WHERE a.status = 'completada' AND substr(a.date, 1, 7) = ?
         GROUP BY a.date
         ORDER BY a.date`
      )
      .all(month);

    const byService = db
      .prepare(
        `SELECT s.name, COUNT(*) as count, COALESCE(SUM(COALESCE(a.paid_amount, s.price)), 0) as income
         FROM appointments a
         JOIN services s ON a.service_id = s.id
         WHERE a.status = 'completada' AND substr(a.date, 1, 7) = ?
         GROUP BY s.id
         ORDER BY income DESC`
      )
      .all(month);

    const byPaymentMethod = db
      .prepare(
        `SELECT COALESCE(a.payment_method, 'efectivo') as method, COUNT(*) as count, COALESCE(SUM(COALESCE(a.paid_amount, s.price)), 0) as income
         FROM appointments a
         JOIN services s ON a.service_id = s.id
         WHERE a.status = 'completada' AND substr(a.date, 1, 7) = ?
         GROUP BY method
         ORDER BY income DESC`
      )
      .all(month);

    const rawBarbers = db
      .prepare(
        `SELECT
           b.id, b.name, b.color, b.commission_type, b.commission_value,
           COUNT(a.id) as count,
           COALESCE(SUM(COALESCE(a.paid_amount, s.price)), 0) as income
         FROM barbers b
         LEFT JOIN appointments a ON a.barber_id = b.id AND a.status = 'completada' AND substr(a.date, 1, 7) = ?
         LEFT JOIN services s ON a.service_id = s.id
         WHERE b.active = 1
         GROUP BY b.id
         ORDER BY income DESC`
      )
      .all(month) as {
      id: number;
      name: string;
      color: string;
      commission_type: string;
      commission_value: number;
      count: number;
      income: number;
    }[];

    const byBarber: FinanceBarberRow[] = rawBarbers.map((b) => {
      let commission = 0;
      if (b.commission_type === "porcentaje") {
        commission = round((b.income * (b.commission_value || 0)) / 100);
      } else if (b.commission_type === "salario" && b.count > 0) {
        commission = round(b.commission_value || 0);
      }
      return {
        id: b.id,
        name: b.name,
        color: b.color,
        count: b.count,
        income: b.income,
        commission,
        net: round(b.income - commission),
        commission_type: b.commission_type,
        commission_value: b.commission_value
      };
    });

    const expensesList = db
      .prepare(`SELECT * FROM expenses WHERE substr(date, 1, 7) = ? ORDER BY date DESC, id DESC`)
      .all(month);

    const monthSeries = db
      .prepare(
        `SELECT substr(a.date, 1, 7) as month, COALESCE(SUM(COALESCE(a.paid_amount, s.price)), 0) as income
         FROM appointments a
         JOIN services s ON a.service_id = s.id
         WHERE a.status = 'completada' AND a.date >= ?
         GROUP BY month`
      )
      .all(startDate) as { month: string; income: number }[];

    const expenseSeries = db
      .prepare(
        `SELECT substr(date, 1, 7) as month, COALESCE(SUM(amount), 0) as total
         FROM expenses WHERE date >= ?
         GROUP BY month`
      )
      .all(startDate) as { month: string; total: number }[];

    const incomeMap = new Map(monthSeries.map((r) => [r.month, r.income]));
    const expenseMap = new Map(expenseSeries.map((r) => [r.month, r.total]));

    const last12Months: { month: string; income: number; expenses: number; profit: number }[] = [];
    for (let i = 0; i < 12; i++) {
      const m = addMonths(startMonth, i);
      const income = incomeMap.get(m) || 0;
      const expenses = expenseMap.get(m) || 0;
      last12Months.push({ month: m, income, expenses, profit: round(income - expenses) });
    }

    return NextResponse.json({
      month,
      income: current.income,
      expenses: currentExpenses,
      profit: round(current.income - currentExpenses),
      appointmentCount: current.count,
      averageTicket: current.count > 0 ? round(current.income / current.count) : 0,
      previous: {
        income: previous.income,
        expenses: previousExpenses,
        profit: round(previous.income - previousExpenses)
      },
      byDay,
      byService,
      byPaymentMethod,
      byBarber,
      expensesList,
      last12Months
    });
  } catch (error) {
    console.error("Error en GET /api/admin/finances:", error);
    return NextResponse.json({ error: "Error al cargar finanzas" }, { status: 500 });
  }
}