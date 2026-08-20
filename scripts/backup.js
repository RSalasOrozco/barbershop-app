/* eslint-disable @typescript-eslint/no-require-imports */
/**
 * Backup de la base de datos BarberTrack.
 * Copia barbershop.db a backups/ con sello de tiempo y conserva las últimas 30.
 *
 * Uso:
 *   node scripts/backup.js
 */
const fs = require("fs");
const path = require("path");

const DB_FILE = path.join(process.cwd(), "barbershop.db");
const BACKUP_DIR = path.join(process.cwd(), "backups");
const KEEP = 30;

function pad(n) {
  return String(n).padStart(2, "0");
}

function main() {
  if (!fs.existsSync(DB_FILE)) {
    console.error("No se encontró barbershop.db");
    process.exit(1);
  }

  if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
  }

  const d = new Date();
  const stamp =
    `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}-` +
    `${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
  const dest = path.join(BACKUP_DIR, `barbershop-${stamp}.db`);

  fs.copyFileSync(DB_FILE, dest);
  console.log(`✅ Backup creado: ${dest}`);

  // Conservar solo las últimas KEEP
  const files = fs
    .readdirSync(BACKUP_DIR)
    .filter((f) => f.startsWith("barbershop-") && f.endsWith(".db"))
    .sort()
    .reverse();

  for (const old of files.slice(KEEP)) {
    fs.unlinkSync(path.join(BACKUP_DIR, old));
    console.log(`🧹 Backup antiguo eliminado: ${old}`);
  }

  console.log(`Backups disponibles: ${Math.min(files.length, KEEP)}`);
}

main();