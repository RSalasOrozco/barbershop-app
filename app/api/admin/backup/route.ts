import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { requireAdmin } from "@/lib/guard";

const DB_FILE = path.join(process.cwd(), "barbershop.db");
const BACKUP_DIR = path.join(process.cwd(), "backups");
const KEEP = 30;

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

function ensureBackupDir() {
  if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
  }
}

function listBackups() {
  ensureBackupDir();
  const files = fs
    .readdirSync(BACKUP_DIR)
    .filter((f) => f.startsWith("barbershop-") && f.endsWith(".db"))
    .sort()
    .reverse();
  return files.map((name) => {
    const stat = fs.statSync(path.join(BACKUP_DIR, name));
    return {
      name,
      size: stat.size,
      createdAt: stat.mtime.toISOString()
    };
  });
}

// GET /api/admin/backup?download=nombre — listar backups o descargar uno
export async function GET(request: NextRequest) {
  try {
    const guard = await requireAdmin(request);
    if (guard.error) return guard.error;

    const { searchParams } = new URL(request.url);
    const download = searchParams.get("download");

    if (download) {
      const safe = path.basename(download);
      if (!safe.startsWith("barbershop-") || !safe.endsWith(".db")) {
        return NextResponse.json({ error: "Archivo no válido" }, { status: 400 });
      }
      const full = path.join(BACKUP_DIR, safe);
      if (!fs.existsSync(full)) {
        return NextResponse.json({ error: "Backup no encontrado" }, { status: 404 });
      }
      const buffer = fs.readFileSync(full);
      return new NextResponse(buffer, {
        headers: {
          "Content-Type": "application/octet-stream",
          "Content-Disposition": `attachment; filename="${safe}"`
        }
      });
    }

    return NextResponse.json({ backups: listBackups() });
  } catch (error) {
    console.error("Error en GET /api/admin/backup:", error);
    return NextResponse.json({ error: "Error al listar backups" }, { status: 500 });
  }
}

// POST /api/admin/backup — crear un backup ahora
export async function POST(request: NextRequest) {
  try {
    const guard = await requireAdmin(request);
    if (guard.error) return guard.error;

    if (!fs.existsSync(DB_FILE)) {
      return NextResponse.json({ error: "No se encontró la base de datos" }, { status: 500 });
    }

    ensureBackupDir();

    const d = new Date();
    const stamp =
      `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}-` +
      `${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
    const dest = path.join(BACKUP_DIR, `barbershop-${stamp}.db`);

    fs.copyFileSync(DB_FILE, dest);

    // Conservar solo las últimas KEEP
    const backups = listBackups();
    for (const old of backups.slice(KEEP)) {
      fs.unlinkSync(path.join(BACKUP_DIR, old.name));
    }

    return NextResponse.json({ success: true, filename: `barbershop-${stamp}.db`, backups: listBackups() });
  } catch (error) {
    console.error("Error en POST /api/admin/backup:", error);
    return NextResponse.json({ error: "Error al crear el backup" }, { status: 500 });
  }
}