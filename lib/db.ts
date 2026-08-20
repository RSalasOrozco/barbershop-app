import Database from "better-sqlite3";
import path from "path";
import bcrypt from "bcryptjs";

const dbPath = path.join(process.cwd(), "barbershop.db");
console.log("📁 DB Path:", dbPath);

const db = new Database(dbPath);
db.pragma("foreign_keys = ON");

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    phone TEXT,
    role TEXT DEFAULT 'cliente' CHECK(role IN ('cliente', 'admin')),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS services (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    price REAL NOT NULL,
    duration INTEGER DEFAULT 30
  );

  CREATE TABLE IF NOT EXISTS appointments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    service_id INTEGER NOT NULL,
    barber_id INTEGER,
    date TEXT NOT NULL,
    time TEXT NOT NULL,
    status TEXT DEFAULT 'pendiente' CHECK(status IN ('pendiente', 'confirmada', 'cancelada', 'completada')),
    notes TEXT,
    client_name TEXT,
    client_phone TEXT,
    confirmation_code TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (service_id) REFERENCES services(id),
    FOREIGN KEY (barber_id) REFERENCES barbers(id) ON DELETE SET NULL
  );

  CREATE TABLE IF NOT EXISTS barbers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    phone TEXT,
    color TEXT DEFAULT '#f59e0b',
    active INTEGER DEFAULT 1,
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS barber_schedules (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    barber_id INTEGER NOT NULL,
    day_of_week INTEGER NOT NULL CHECK(day_of_week BETWEEN 0 AND 6),
    is_working INTEGER DEFAULT 0,
    start_time TEXT,
    end_time TEXT,
    break_start TEXT,
    break_end TEXT,
    UNIQUE(barber_id, day_of_week),
    FOREIGN KEY (barber_id) REFERENCES barbers(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS barber_absences (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    barber_id INTEGER NOT NULL,
    date TEXT NOT NULL,
    end_date TEXT,
    reason TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (barber_id) REFERENCES barbers(id) ON DELETE CASCADE
  );
`);

function columnNames(table: string): string[] {
  return (
    db.prepare(`PRAGMA table_info(${table})`).all() as { name: string }[]
  ).map((c) => c.name);
}

const userColumns = columnNames("users");
if (!userColumns.includes("phone")) {
  db.exec("ALTER TABLE users ADD COLUMN phone TEXT");
  console.log("✅ Columna phone agregada a users");
}

const apptColumns = columnNames("appointments");
if (!apptColumns.includes("barber_id")) {
  db.exec("ALTER TABLE appointments ADD COLUMN barber_id INTEGER REFERENCES barbers(id) ON DELETE SET NULL");
  console.log("✅ Columna barber_id agregada a appointments");
}
if (!apptColumns.includes("client_name")) {
  db.exec("ALTER TABLE appointments ADD COLUMN client_name TEXT");
  console.log("✅ Columna client_name agregada a appointments");
}
if (!apptColumns.includes("client_phone")) {
  db.exec("ALTER TABLE appointments ADD COLUMN client_phone TEXT");
  console.log("✅ Columna client_phone agregada a appointments");
}

// Datos iniciales: servicios
const serviceCount = db
  .prepare("SELECT COUNT(*) as count FROM services")
  .get() as { count: number };
if (serviceCount.count === 0) {
  const insert = db.prepare(
    "INSERT INTO services (name, price, duration) VALUES (?, ?, ?)"
  );
  insert.run("Corte Clásico", 15000, 30);
  insert.run("Corte + Barba", 25000, 45);
  insert.run("Afeitado Premium", 20000, 30);
  insert.run("Diseño / Degradado", 18000, 40);
  console.log("✅ Servicios creados");
}

// Datos iniciales: barberos
const BARBER_COLORS = ["#f59e0b", "#ef4444", "#3b82f6", "#10b981", "#8b5cf6", "#ec4899", "#14b8a6", "#f97316"];
const barberCount = db
  .prepare("SELECT COUNT(*) as count FROM barbers")
  .get() as { count: number };

let defaultBarberId: number | null = null;

if (barberCount.count === 0) {
  const insert = db.prepare(
    "INSERT INTO barbers (name, phone, color, active, notes) VALUES (?, ?, ?, 1, ?)"
  );
  const result = insert.run("Barbero Principal", "", BARBER_COLORS[0], "");
  defaultBarberId = result.lastInsertRowid as number;
  console.log("✅ Barbero principal creado");

  const scheduleInsert = db.prepare(
    `INSERT INTO barber_schedules (barber_id, day_of_week, is_working, start_time, end_time, break_start, break_end)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  );
  for (let dow = 1; dow <= 6; dow++) {
    scheduleInsert.run(defaultBarberId, dow, 1, "09:00", "18:00", "12:00", "14:00");
  }
  scheduleInsert.run(defaultBarberId, 0, 1, "09:00", "14:00", null, null);
  console.log("✅ Horario semanal creado para el barbero principal");
} else {
  const first = db.prepare("SELECT id FROM barbers ORDER BY id LIMIT 1").get() as { id: number };
  defaultBarberId = first.id;
}

// Migración de datos existentes: backfill de citas sin barbero/cliente
const anyAppt = db.prepare("SELECT COUNT(*) as count FROM appointments").get() as { count: number };
if (anyAppt.count > 0) {
  db.prepare("UPDATE appointments SET barber_id = ? WHERE barber_id IS NULL").run(defaultBarberId);
  db.prepare(
    `UPDATE appointments
     SET client_name = COALESCE(client_name, (SELECT name FROM users WHERE users.id = appointments.user_id)),
         client_phone = COALESCE(client_phone, (SELECT phone FROM users WHERE users.id = appointments.user_id))
     WHERE client_name IS NULL`
  ).run();
  console.log("✅ Citas existentes vinculadas al barbero principal");
}

// Datos iniciales: admin
const adminExists = db
  .prepare("SELECT id FROM users WHERE email = ?")
  .get("admin@barber.com");
if (!adminExists) {
  const hashedPassword = bcrypt.hashSync("admin123", 10);
  db.prepare(
    "INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)"
  ).run("Administrador", "admin@barber.com", hashedPassword, "admin");
  console.log("✅ Admin creado: admin@barber.com / admin123");
}

export default db;