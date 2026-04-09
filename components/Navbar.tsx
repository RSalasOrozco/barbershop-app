"use client";

import { useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";

interface NavbarProps {
  userName?: string;
  userRole?: string;
}

export default function Navbar({ userName, userRole }: NavbarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

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

  // Cerrar menú al hacer clic en un enlace
  const closeMenu = () => setIsMenuOpen(false);

  return (
    <nav className="bg-gray-800 text-white sticky top-0 z-50">
      <div className="container mx-auto px-4 py-3">
        {/* Barra superior */}
        <div className="flex justify-between items-center">
          {/* Logo */}
          <Link
            href={userRole === "admin" ? "/admin" : "/cliente"}
            className="text-xl font-bold hover:text-gray-300 transition-colors"
            onClick={closeMenu}
          >
            💈 BarberTrack
          </Link>

          {/* Botón menú hamburguesa (solo visible en móvil) */}
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="md:hidden p-2 rounded-lg hover:bg-gray-700 transition-colors focus:outline-none focus:ring-2 focus:ring-gray-500"
            aria-label="Menú"
          >
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              {isMenuOpen ? (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              ) : (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 6h16M4 12h16M4 18h16"
                />
              )}
            </svg>
          </button>

          {/* Info usuario y logout - Desktop */}
          <div className="hidden md:flex items-center space-x-4">
            <span className="text-sm text-gray-300">
              👤 {userName} ({userRole === "admin" ? "Admin" : "Cliente"})
            </span>
            <button
              onClick={handleLogout}
              className="bg-red-600 hover:bg-red-700 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
            >
              Cerrar Sesión
            </button>
          </div>
        </div>

        {/* Menú móvil desplegable */}
        <div
          className={`md:hidden transition-all duration-300 overflow-hidden ${
            isMenuOpen ? "max-h-96 mt-4" : "max-h-0"
          }`}
        >
          <div className="flex flex-col space-y-3 pb-3">
            {/* Enlaces según rol - Mobile */}
            {userRole === "admin" && (
              <Link
                href="/admin"
                className="px-3 py-2 rounded-lg hover:bg-gray-700 transition-colors"
                onClick={closeMenu}
              >
                📊 Dashboard
              </Link>
            )}

            {userRole === "admin" && (
              <Link
                href="/admin/usuarios"
                className="px-3 py-2 rounded-lg hover:bg-gray-700 transition-colors"
                onClick={closeMenu}
              >
                👥 Usuarios
              </Link>
            )}

            {userRole === "cliente" && (
              <Link
                href="/cliente"
                className="px-3 py-2 rounded-lg hover:bg-gray-700 transition-colors"
                onClick={closeMenu}
              >
                📋 Mis Citas
              </Link>
            )}

            {userRole === "cliente" && (
              <Link
                href="/cliente/agendar"
                className="px-3 py-2 rounded-lg hover:bg-gray-700 transition-colors"
                onClick={closeMenu}
              >
                ✨ Agendar
              </Link>
            )}

            {/* Enlaces para admin (versión desktop ya los tiene) */}
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

            {/* Línea divisoria */}
            <div className="border-t border-gray-700 my-2"></div>

            {/* Info usuario y logout - Mobile */}
            <div className="px-3 py-2 text-gray-300">
              👤 {userName} ({userRole === "admin" ? "Admin" : "Cliente"})
            </div>
            <button
              onClick={() => {
                handleLogout();
                closeMenu();
              }}
              className="mx-3 bg-red-600 hover:bg-red-700 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
            >
              Cerrar Sesión
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
}
