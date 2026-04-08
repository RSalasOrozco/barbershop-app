"use client";

import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";

interface NavbarProps {
  userName?: string;
  userRole?: string;
}

export default function Navbar({ userName, userRole }: NavbarProps) {
  const router = useRouter();
  const pathname = usePathname();

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      router.push("/login");
      router.refresh();
    } catch (error) {
      console.error("Error al cerrar sesión:", error);
    }
  };

  // No mostrar navbar en páginas públicas
  if (pathname === "/login" || pathname === "/register") {
    return null;
  }

  return (
    <nav className="bg-gray-800 text-white p-4">
      <div className="container mx-auto flex justify-between items-center">
        <div className="flex items-center space-x-4">
          <Link
            href={userRole === "admin" ? "/admin" : "/cliente"}
            className="text-xl font-bold"
          >
            💈 BarberTrack
          </Link>

          {userRole === "admin" && (
            <div className="hidden md:flex space-x-4">
              <Link href="/admin" className="hover:text-gray-300">
                Dashboard
              </Link>
              <Link href="/admin/usuarios" className="hover:text-gray-300">
                Usuarios
              </Link>
            </div>
          )}

          {userRole === "cliente" && (
            <div className="hidden md:flex space-x-4">
              <Link href="/cliente" className="hover:text-gray-300">
                Mis Citas
              </Link>
              <Link href="/cliente/agendar" className="hover:text-gray-300">
                Agendar
              </Link>
            </div>
          )}
        </div>

        <div className="flex items-center space-x-4">
          <span className="text-sm text-gray-300">
            {userName} ({userRole === "admin" ? "Admin" : "Cliente"})
          </span>
          <button
            onClick={handleLogout}
            className="bg-red-600 hover:bg-red-700 px-3 py-1 rounded text-sm transition-colors"
          >
            Cerrar Sesión
          </button>
        </div>
      </div>
    </nav>
  );
}
