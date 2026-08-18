import { jwtVerify, SignJWT } from "jose";
import type { NextRequest } from "next/server";

export const JWT_SECRET =
  process.env.JWT_SECRET || "barbershop-secret-key-2024-change-in-production";

export interface JwtPayload {
  id: number;
  email: string;
  name: string;
  role: "admin" | "cliente";
}

const secret = () => new TextEncoder().encode(JWT_SECRET);

export async function signToken(payload: JwtPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(secret());
}

export async function verifyToken(token: string): Promise<JwtPayload | null> {
  try {
    const { payload } = await jwtVerify(token, secret());
    return payload as unknown as JwtPayload;
  } catch {
    return null;
  }
}

export async function getSession(
  request: NextRequest
): Promise<JwtPayload | null> {
  const token = request.cookies.get("token")?.value;
  if (!token) return null;
  return verifyToken(token);
}