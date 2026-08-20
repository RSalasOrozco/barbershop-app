import fs from "fs";
import path from "path";
import crypto from "crypto";

/**
 * Sistema de licencias BarberTrack.
 * La licencia es un archivo license.json firmado con HMAC-SHA256.
 * Se genera con scripts/generate-license.js (clave = LICENSE_SECRET o la por defecto).
 */

export const LICENSE_FILE = "license.json";

const DEFAULT_SECRET = "BarberTrack-Master-Key-2026";

function getSecret(): string {
  return process.env.LICENSE_SECRET || DEFAULT_SECRET;
}

export interface LicenseData {
  format: string;
  business: string;
  issuedAt: string;
  expiresAt: string;
  maxBarbers: number;
  signature: string;
}

export interface LicenseStatus {
  status: "valid" | "expired" | "invalid" | "missing";
  valid: boolean;
  business?: string;
  issuedAt?: string;
  expiresAt?: string;
  maxBarbers?: number;
  daysLeft?: number;
  reason?: string;
}

function licensePath(): string {
  return path.join(process.cwd(), LICENSE_FILE);
}

export function readLicense(): LicenseData | null {
  try {
    const full = licensePath();
    if (!fs.existsSync(full)) return null;
    const raw = JSON.parse(fs.readFileSync(full, "utf8"));
    if (!raw || typeof raw !== "object") return null;
    return raw as LicenseData;
  } catch {
    return null;
  }
}

function canonicalString(data: Omit<LicenseData, "signature">): string {
  return `v1|${data.business}|${data.issuedAt}|${data.expiresAt}|${data.maxBarbers}`;
}

export function signLicense(data: Omit<LicenseData, "signature">): string {
  return crypto.createHmac("sha256", getSecret()).update(canonicalString(data)).digest("hex");
}

export function verifyLicense(data: LicenseData): boolean {
  if (!data || data.format !== "barbertrack-license-v1") return false;
  const { signature, ...rest } = data;
  return signLicense(rest) === signature;
}

export function getLicenseStatus(): LicenseStatus {
  const data = readLicense();
  if (!data) {
    return { status: "missing", valid: false, reason: "No hay archivo de licencia (license.json)" };
  }
  if (!verifyLicense(data)) {
    return { status: "invalid", valid: false, reason: "Licencia no válida (firma incorrecta)" };
  }

  const expires = new Date(`${data.expiresAt}T23:59:59`);
  const now = new Date();
  const daysLeft = Math.floor((expires.getTime() - now.getTime()) / 86400000);

  if (now > expires) {
    return {
      status: "expired",
      valid: false,
      business: data.business,
      expiresAt: data.expiresAt,
      maxBarbers: data.maxBarbers,
      reason: "La licencia ha expirado"
    };
  }

  return {
    status: "valid",
    valid: true,
    business: data.business,
    issuedAt: data.issuedAt,
    expiresAt: data.expiresAt,
    maxBarbers: data.maxBarbers,
    daysLeft
  };
}

/** Alerta de renovación: cuántos días antes se avisa (0 = solo al expirar). */
export const LICENSE_RENEWAL_WARNING_DAYS = 30;

export function isNearExpiry(status: LicenseStatus): boolean {
  if (!status.valid || status.daysLeft === undefined) return false;
  return status.daysLeft <= LICENSE_RENEWAL_WARNING_DAYS;
}