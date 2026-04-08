💈 BarberTrack
Sistema completo de gestión de citas para barberías y peluquerías

https://img.shields.io/badge/Next.js-16.2-black
https://img.shields.io/badge/TypeScript-5.x-blue
https://img.shields.io/badge/Tailwind-3.x-38bdf8
https://img.shields.io/badge/SQLite-3.x-003b57
https://img.shields.io/badge/Licencia-MIT-yellow

🚀 Instalación Rápida
bash

# 1. Clonar

git clone https://github.com/tuusuario/barbershop-app.git
cd barbershop-app

# 2. Instalar

npm install

# 3. Ejecutar

npm run dev

# 4. Abrir http://localhost:3000

🔑 Acceso Inicial
Rol Email Contraseña
Admin admin@barber.com admin123
Cliente Regístrate -
✨ ¿Qué hace esta app?
Para el Cliente:
✅ Se registra con su nombre y email

✅ Agenda citas eligiendo servicio, fecha y hora

✅ Ve el historial de sus citas y su estado

Para el Dueño (Admin):
✅ Ve TODAS las citas en una tabla

✅ Cambia el estado: Pendiente → Confirmada → Completada

✅ Elimina citas

✅ Ve estadísticas:

Días con más clientes

Servicios más populares

Ingresos totales y por día

✅ Gestiona usuarios (editar, resetear contraseña, eliminar)

📸 Capturas de Pantalla
Panel de Administrador
text
📊 Dashboard con pestañas:
├── 📋 Gestión de Citas (tabla CRUD)
└── 📈 Estadísticas (gráficos)
Panel de Cliente
text
👤 Mi Panel:
├── 📅 Agendar nueva cita
└── 📋 Historial de mis citas
🛠️ Tecnologías Principales
Next.js 16 - Framework React

TypeScript - Código más seguro

Tailwind CSS - Diseño responsive

SQLite - Base de datos en un archivo

JWT - Autenticación segura

📁 Estructura Importante
text
app/
├── api/ # Backend (endpoints)
├── (auth)/ # Login y Registro
├── (dashboard)/  
│ ├── admin/ # Panel del dueño
│ └── cliente/ # Panel del cliente
├── lib/db.ts # Base de datos
└── middleware.ts # Protección de rutas
🔒 Seguridad Implementada
✅ Contraseñas hasheadas con bcrypt

✅ Cookies HTTP-only (protege contra XSS)

✅ Validación de email y nombre real

✅ Protección de rutas por rol (admin/cliente)

✅ SQL Injection prevenido (consultas parametrizadas)

📦 Dependencias Clave
json
{
"next": "16.2.2",
"better-sqlite3": "9.x",
"bcryptjs": "2.x",
"jsonwebtoken": "9.x",
"tailwindcss": "3.x",
"react-datepicker": "6.x",
"recharts": "2.x"
}
🚢 Deploy en Vercel (Gratis)
bash

# 1. Subir a GitHub

git add .
git commit -m "Versión 1.0"
git push

# 2. Conectar en vercel.com

# 3. ¡Listo! Tu app online

⚙️ Configuración Adicional
Cambiar puerto:
bash
npm run dev -- -p 3001
Ver base de datos:
bash

# Instalar DB Browser for SQLite y abrir barbershop.db

Crear más admins:
sql
-- En barbershop.db
UPDATE users SET role = 'admin' WHERE email = 'nuevo@admin.com';
🐛 Solución de Problemas Comunes
Error Solución
Module not found: better-sqlite3 npm install better-sqlite3
Error 404 en APIs Verificar nombres de archivo route.ts (singular)
No carga citas Revisar consola F12, verificar token
✅ Estado del Proyecto
Autenticación completa

CRUD de citas

Panel de administrador

Panel de cliente

Estadísticas

Gestión de usuarios

Validaciones de seguridad

Pagos en línea (próximamente)

Notificaciones email (próximamente)

📝 Licencia
MIT - Usa este código como quieras, solo menciona la fuente.

👨‍💻 Créditos
Desarrollado con 💈 por [Tu Nombre]

¿Preguntas? Abre un issue en GitHub.

¿Te sirvió este proyecto? ⭐ Dale estrella en GitHub para apoyar.
