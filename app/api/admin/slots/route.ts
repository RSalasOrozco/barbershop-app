import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/guard";
import { getAvailableSlots, getServiceDuration } from "@/lib/slots";

// GET /api/admin/slots?barberId=1&date=2026-08-20&serviceId=1&excludeId=0
export async function GET(request: NextRequest) {
  try {
    const guard = await requireAdmin(request);
    if (guard.error) return guard.error;

    const { searchParams } = new URL(request.url);
    const barberId = Number(searchParams.get("barberId"));
    const date = searchParams.get("date");
    const serviceId = Number(searchParams.get("serviceId"));
    const excludeId = Number(searchParams.get("excludeId") || 0);

    if (!barberId || !date || !serviceId) {
      return NextResponse.json(
        { error: "barberId, date y serviceId son requeridos" },
        { status: 400 }
      );
    }

    const duration = getServiceDuration(serviceId);
    const slots = getAvailableSlots(barberId, date, duration, excludeId || undefined);

    return NextResponse.json({ slots, duration });
  } catch (error) {
    console.error("Error en GET /api/admin/slots:", error);
    return NextResponse.json({ error: "Error al consultar horarios" }, { status: 500 });
  }
}