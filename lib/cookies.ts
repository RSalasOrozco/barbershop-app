import type { NextRequest } from "next/server";

/**
 * Detecta si la petición viaja por HTTPS.
 * Permite marcar la cookie como Secure solo cuando corresponde,
 * para que funcione por HTTP en redes locales (localhost / LAN).
 */
export function isSecureRequest(request: NextRequest): boolean {
  const forwarded = request.headers.get("x-forwarded-proto");
  if (forwarded) {
    return forwarded.split(",")[0].trim() === "https";
  }
  return request.nextUrl.protocol === "https:";
}