import { cookies } from "next/headers";
import { jwtVerify } from "jose";
import Navbar from "@/components/Navbar";
import Link from "next/link";
import db from "@/lib/db";

async function getUserData() {
  const cookieStore = await cookies();
  const token = cookieStore.get("token")?.value;

  if (!token) return null;

  try {
    const secret = new TextEncoder().encode(
      "barbershop-secret-key-2024-change-in-production"
    );
    const { payload } = await jwtVerify(token, secret);
    return payload as any;
  } catch {
    return null;
  }
}

async function getUserAppointments(userId: number) {
  const appointments = db
    .prepare(
      `
    SELECT 
      a.*,
      s.name as service_name,
      s.price as service_price,
      s.duration as service_duration
    FROM appointments a
    JOIN services s ON a.service_id = s.id
    WHERE a.user_id = ?
    ORDER BY a.date DESC, a.time DESC
  `
    )
    .all(userId);

  return appointments;
}

export default async function ClienteDashboard() {
  const user = await getUserData();
  const appointments = user ? await getUserAppointments(user.id) : [];

  return (
    <div>
      <Navbar userName={user?.name} userRole={user?.role} />

      <div className="p-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-800 dark:text-white">
              💈 Mi Panel
            </h1>
            <p className="mt-2 text-gray-600 dark:text-gray-300">
              Bienvenido, {user?.name}
            </p>
          </div>

          <Link
            href="/cliente/agendar"
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition-colors inline-flex items-center"
          >
            <span className="mr-2">📅</span>
            Agendar Nueva Cita
          </Link>
        </div>

        <div className="mt-8">
          <h2 className="text-xl font-semibold mb-4 text-gray-800 dark:text-white">
            📋 Mis Citas
          </h2>

          {appointments.length === 0 ? (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-8 text-center">
              <p className="text-gray-500 dark:text-gray-400">
                No tienes citas programadas. ¡Agenda tu primera visita!
              </p>
            </div>
          ) : (
            <div className="grid gap-4">
              {appointments.map((apt: any) => (
                <div
                  key={apt.id}
                  className="bg-white dark:bg-gray-800 rounded-lg shadow p-6"
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-semibold text-lg text-gray-800 dark:text-white">
                        {apt.service_name}
                      </h3>
                      <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                        📍 ${apt.service_price.toLocaleString()} COP •{" "}
                        {apt.service_duration} min
                      </p>
                      <p className="text-sm text-gray-600 dark:text-gray-300 mt-2">
                        📅{" "}
                        {new Date(apt.date + "T00:00:00").toLocaleDateString(
                          "es-ES",
                          {
                            weekday: "long",
                            year: "numeric",
                            month: "long",
                            day: "numeric"
                          }
                        )}{" "}
                        a las {apt.time}
                      </p>
                      {apt.notes && (
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                          📝 Nota: {apt.notes}
                        </p>
                      )}
                    </div>
                    <span
                      className={`
                      px-3 py-1 rounded-full text-xs font-medium
                      ${apt.status === "pendiente" ? "bg-yellow-100 text-yellow-800" : ""}
                      ${apt.status === "confirmada" ? "bg-green-100 text-green-800" : ""}
                      ${apt.status === "cancelada" ? "bg-red-100 text-red-800" : ""}
                      ${apt.status === "completada" ? "bg-gray-100 text-gray-800" : ""}
                    `}
                    >
                      {apt.status.charAt(0).toUpperCase() + apt.status.slice(1)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
