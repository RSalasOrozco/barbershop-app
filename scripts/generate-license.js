/* eslint-disable @typescript-eslint/no-require-imports */
/**
 * Generador de licencias BarberTrack.
 *
 * Uso:
 *   node scripts/generate-license.js "Barbería XYZ" [días] [maxPeluqueros]
 *
 *   node scripts/generate-license.js "Barbería El Rami" 365 4
 *
 * La clave de firma debe coincidir con la de la app:
 *   - por defecto: BarberTrack-Master-Key-2026
 *   - o variable de entorno LICENSE_SECRET (igual en app y generador)
 */
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const DEFAULT_SECRET = "BarberTrack-Master-Key-2026";

function pad(n) {
  return String(n).padStart(2, "0");
}

function toISODate(d) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function main() {
  const business = process.argv[2];
  const days = parseInt(process.argv[3] || "365", 10);
  const maxBarbers = parseInt(process.argv[4] || "5", 10);

  if (!business) {
    console.error("Uso: node scripts/generate-license.js \"Nombre del negocio\" [días=365] [maxPeluqueros=5]");
    process.exit(1);
  }

  const secret = process.env.LICENSE_SECRET || DEFAULT_SECRET;

  const issued = new Date();
  const expires = new Date();
  expires.setDate(expires.getDate() + days);

  const payload = {
    format: "barbertrack-license-v1",
    business,
    issuedAt: toISODate(issued),
    expiresAt: toISODate(expires),
    maxBarbers
  };

  const canonical = `v1|${payload.business}|${payload.issuedAt}|${payload.expiresAt}|${payload.maxBarbers}`;
  const signature = crypto.createHmac("sha256", secret).update(canonical).digest("hex");

  const license = { ...payload, signature };
  const file = path.join(process.cwd(), "license.json");

  fs.writeFileSync(file, JSON.stringify(license, null, 2), "utf8");

  console.log("✅ Licencia generada:");
  console.log(`   Negocio:     ${business}`);
  console.log(`   Emitida:     ${payload.issuedAt}`);
  console.log(`   Vence:       ${payload.expiresAt} (${days} días)`);
  console.log(`   Peluqueros:  ${maxBarbers}`);
  console.log(`   Archivo:     ${file}`);
}

main();