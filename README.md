# 💈 BarberTrack

Sistema completo de gestión de citas para barberías y peluquerías, **pensado para uso local del negocio (solo administrador)**. Corres sobre tu red local y gestionas tu equipo, horarios, servicios y citas desde un panel oscuro premium.

![Next.js](https://img.shields.io/badge/Next.js-16.2-black) ![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue) ![Tailwind](https://img.shields.io/badge/Tailwind-4.x-38bdf8) ![SQLite](https://img.shields.io/badge/SQLite-3.x-003b57)

---

## 🚀 Instalación rápida

```bash
# 1. Instalar dependencias
npm install

# 2. Crear variables de entorno (.env.local)
JWT_SECRET=cambia-esta-clave-por-una-segura

# 3. Ejecutar en desarrollo
npm run dev

# 4. Abrir http://localhost:3000
```

> La base de datos `barbershop.db` se crea automáticamente en la primera ejecución, junto con el administrador inicial, los servicios de ejemplo y el barbero principal con su horario semanal.

---

## 🔑 Acceso inicial

| Rol   | Email            | Contraseña |
| ----- | ---------------- | ---------- |
| Admin | `admin@barber.com` | `admin123` |

⚠️ **Cambia la contraseña del admin en `Usuarios`** antes de entregar el sistema.

---

## ✨ ¿Qué hace la app? (Panel del administrador)

### 📅 Citas
- Crea citas eligiendo **peluquero, servicio, fecha y hora** (solo se muestran los turnos realmente disponibles del peluquero).
- Registro de **clientes de mostrador (walk-in)**: nombre y teléfono sin necesidad de cuenta.
- Filtra por estado y por peluquero; cambia estados (Pendiente → Confirmada → Completada / No asistió / Cancelada) y elimina citas.
- **Novedad + reasignación**: si un peluquero no puede asistir, registras la ausencia, eliges a qué peluquero/fecha reasignar y el sistema actualiza la cita.
- **WhatsApp integrado**: botón que abre `wa.me` con un mensaje prellenado para confirmar, notificar novedades o preguntar al cliente si quiere reasignar peluquero o cambiar de fecha.

### 💈 Peluqueros
- CRUD completo de peluqueros (nombre, teléfono, color).
- **Horario semanal por peluquero** (día a día, con descansos). La disponibilidad se calcula automáticamente según la duración de cada servicio.
- **Novedades (ausencias)**: registra qué peluquero no trabaja un día y el sistema bloquea sus turnos; además muestra las citas afectadas para reasignarlas.
- Un peluquero no se puede eliminar si tiene citas activas.

### ✂️ Servicios
- CRUD completo de servicios (nombre, precio, duración).
- Muestra cuántas citas tiene cada servicio; no se puede eliminar un servicio con citas asociadas.

### 📊 Estadísticas
- Totales (citas, citas de hoy, ingresos), citas por día, servicios más populares, ingresos por día y desglose **por peluquero**.

### 👥 Usuarios
- Gestiona el acceso: editar datos, resetear contraseña y eliminar usuarios.

---

## 🧱 Stack técnico

- **Next.js 16** (App Router + Turbopack) · **React 19** · **TypeScript**
- **Tailwind CSS 4** (tema oscuro premium, acentos ámbar)
- **better-sqlite3** (base de datos local, un solo archivo)
- Autenticación con **JWT** (cookie httpOnly) + contraseñas con **bcrypt**
- `react-datepicker`, `sonner` (notificaciones)

## 📁 Estructura

```
app/api/admin/       → API interna (barbers, schedules, absences, slots, appointments, stats, users)
app/api/services/    → API de servicios
app/(dashboard)/admin/ → Panel (citas, peluqueros, servicios, usuarios)
components/admin/    → Modales (nueva cita, reasignar)
lib/                 → db, slots, whatsapp, auth, guard, types
proxy.ts             → Middleware: solo admin (sin acceso cliente público)
```

---

## 🖥️ Puesta en producción local

```bash
npm run build
npm run start
```

La app corre en `http://localhost:3000` y queda accesible desde **cualquier dispositivo de tu red local** usando la IP del equipo (p. ej. `http://192.168.1.10:3000`). La cookie de sesión se adapta automáticamente a HTTP (LAN) o HTTPS.

> Para acceso a Internet externo, puedes exponerla con un túnel o un reverse proxy con HTTPS.

---

## 📄 Licencia

MIT

---

## 🔑 Sistema de licencias (para distribuidores)

La app incluye un sistema de licencias firmadas (HMAC-SHA256) pensado para venderla negocio por negocio.

### Generar una licencia para un cliente

```bash
node scripts/generate-license.js "Nombre del Negocio" [días=365] [maxPeluqueros=5]
# ejemplo:
node scripts/generate-license.js "Barbería El Rami" 365 4
```

Esto crea el archivo `license.json` (en la raíz del proyecto) que **se entrega junto con la app**. Contiene: negocio, fechas de emisión/vencimiento, máximo de peluqueros y una firma.

### Preparar la carpeta de entrega (una sola herramienta)

En la raíz del proyecto hay dos accesos rápidos:

- **`preparar-entrega.bat`**: te pregunta nombre del negocio, días y máximo de peluqueros, y automáticamente:
  - copia el proyecto a `entregas\<Negocio>\`,
  - **quita los datos de prueba** (`barbershop.db`, `backups/`),
  - **quita la carpeta `scripts/`** (para que el cliente no pueda generar sus propias licencias),
  - genera la `license.json` del cliente dentro.
  Esa carpeta queda **lista para el USB**.

- **`renovar-licencia.bat`**: regenera la licencia de un cliente en `licencias\<Negocio>\license.json`. Ese archivo se envía al cliente (WhatsApp/email) y este **solo reemplaza** su `license.json` (la app la relee automáticamente; si acaso, reinicia con `Iniciar BarberTrack.bat`).

### Qué hace la app con la licencia

- Si falta el archivo, es inválido o **venció**: bloquea el acceso al panel y a las APIs, y muestra una pantalla de aviso en `/license`.
- Avisa en el panel **30 días antes de vencer** (banner ámbar) para recordar la renovación.
- Limita la cantidad de peluqueros según lo contratado (se puede ampliar regenerando la licencia).
- El vencimiento se lee en cada petición: basta regenerar el `license.json` del cliente para renovar.

> Clave de firma: usa `LICENSE_SECRET` en `.env.local` (debe ser la misma en generador y app). La clave por defecto es `BarberTrack-Master-Key-2026`. Cámbiala si vendes a escala.

---

## 💾 Respaldo de datos

La base de datos es **un solo archivo** (`barbershop.db`), por lo que respaldar es copiarlo.

- **Desde el panel**: `Sistema` → `Crear backup ahora` (guarda en `backups/` y conserva las últimas 30) y puedes descargar cualquiera.
- **Desde terminal**: `node scripts/backup.js` o ejecutar `backup.bat`.
- **Automatizado**: programa `backup.bat` en el Programador de Windows para que corra a diario.

---

## 📦 Entrega al cliente (instalación local)

1. En el equipo del cliente: copiar la carpeta del proyecto, ejecutar **`instalar.bat`** (instala dependencias y compila) y luego **`Iniciar BarberTrack.bat`** (levanta el servidor y abre el navegador en `http://localhost:3000`).
2. Copiar el `license.json` del cliente junto a la app.
3. Acceso inicial: `admin@barber.com` / `admin123` (cambiar en Usuarios).

Para acceso por red local: desde otro dispositivo abrir `http://IP-del-equipo:3000`.
