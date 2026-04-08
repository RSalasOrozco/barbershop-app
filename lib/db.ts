import Database from "better-sqlite3";
import path from "path";
import bcrypt from "bcryptjs";

// Determinar ruta absoluta (compatible Windows)
const dbPath = path.join(process.cwd(), "barbershop.db");
console.log("📁 DB Path:", dbPath);

const db = new Database(dbPath);
db.pragma("foreign_keys = ON");

// Crear Tablas si no existen
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
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
    user_id INTEGER NOT NULL,
    service_id INTEGER NOT NULL,
    date TEXT NOT NULL,
    time TEXT NOT NULL,
    status TEXT DEFAULT 'pendiente' CHECK(status IN ('pendiente', 'confirmada', 'cancelada', 'completada')),
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (service_id) REFERENCES services(id)
  );
`);

// Datos Iniciales (Servicios)
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

// Datos Iniciales (Admin)
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
