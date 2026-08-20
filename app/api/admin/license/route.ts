import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/guard";
import { getLicenseStatus } from "@/lib/license";

// GET /api/admin/license — estado de la licencia (solo admin)
export async function GET(request: NextRequest) {
  try {
    const guard = await requireAdmin(request);
    if (guard.error) return guard.error;
    return NextResponse.json({ license: getLicenseStatus() });
  } catch (error) {
    console.error("Error en GET /api/admin/license:", error);
    return NextResponse.json({ error: "Error al consultar la licencia" }, { status: 500 });
  }
}