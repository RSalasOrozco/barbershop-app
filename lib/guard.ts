import { NextRequest, NextResponse } from "next/server";
import { getSession, type JwtPayload } from "@/lib/auth";
import { getLicenseStatus } from "@/lib/license";

type GuardResult =
  | { user: JwtPayload; error?: never }
  | { user?: never; error: NextResponse };

export async function requireAdmin(request: NextRequest): Promise<GuardResult> {
  const license = getLicenseStatus();
  if (!license.valid) {
    return {
      error: NextResponse.json(
        { error: license.reason || "Licencia no válida", license: license.status },
        { status: 403 }
      )
    };
  }

  const user = await getSession(request);
  if (!user) {
    return { error: NextResponse.json({ error: "No autorizado" }, { status: 401 }) };
  }
  if (user.role !== "admin") {
    return { error: NextResponse.json({ error: "Acceso denegado" }, { status: 403 }) };
  }
  return { user };
}

export async function requireAuth(request: NextRequest): Promise<GuardResult> {
  const user = await getSession(request);
  if (!user) {
    return { error: NextResponse.json({ error: "No autorizado" }, { status: 401 }) };
  }
  return { user };
}