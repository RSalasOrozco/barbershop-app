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

  const closeMenu = () => setIsMenuOpen(false);

  return (
    <nav className="bg-gradient-to-r from-gray-900 to-gray-800 text-white sticky top-0 z-50 shadow-lg">
      <div className="px-4 md:px-8">
        <div className="flex items-center justify-between">
          {/* Logo - Izquierda */}
          <Link
            href={userRole === "admin" ? "/admin" : "/cliente"}
            className="flex items-center space-x-2 py-4 hover:opacity-80 transition-opacity"
            onClick={closeMenu}
          >
            <span className="text-2xl">💈</span>
            <span className="text-xl font-bold tracking-tight">
              BarberTrack
            </span>
          </Link>

          {/* Enlaces de navegación - Desktop (visible en PC) - Centrado/izquierda */}
          <div className="hidden md:flex items-center space-x-1 lg:space-x-2 ml-8">
            {userRole === "admin" && (
              <>
                <Link
                  href="/admin"
                  className="px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors font-medium"
                >
                  📊 Dashboard
                </Link>
                <Link
                  href="/admin/usuarios"
                  className="px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors font-medium"
                >
                  👥 Usuarios
                </Link>
              </>
            )}

            {userRole === "cliente" && (
              <>
                <Link
                  href="/cliente"
                  className="px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors font-medium"
                >
                  📋 Mis Citas
                </Link>
                <Link
                  href="/cliente/agendar"
                  className="px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors font-medium"
                >
                  ✨ Agendar
                </Link>
              </>
            )}
          </div>

          {/* Espacio flexible para empujar usuario y logout a la derecha */}
          <div className="flex-1"></div>

          {/* Botón menú hamburguesa (móvil) */}
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
            <div className="flex items-center space-x-2 px-3 py-1.5 rounded-full bg-gray-700/50">
              <div className="w-7 h-7 rounded-full bg-blue-600 flex items-center justify-center text-sm font-bold">
                {userName?.charAt(0).toUpperCase() || "U"}
              </div>
              <span className="text-sm font-medium">
                {userName}
                <span className="text-gray-400 text-xs ml-1">
                  ({userRole === "admin" ? "Admin" : "Cliente"})
                </span>
              </span>
            </div>
            <button
              onClick={handleLogout}
              className="bg-red-600 hover:bg-red-700 px-4 py-2 rounded-lg text-sm font-medium transition-colors shadow-md"
            >
              Cerrar Sesión
            </button>
          </div>
        </div>

        {/* Menú móvil desplegable */}
        <div
          className={`md:hidden transition-all duration-300 overflow-hidden ${
            isMenuOpen ? "max-h-96 pb-4" : "max-h-0"
          }`}
        >
          <div className="flex flex-col space-y-2">
            {/* Enlaces según rol - Mobile */}
            {userRole === "admin" && (
              <>
                <Link
                  href="/admin"
                  className="px-3 py-3 rounded-lg hover:bg-gray-700 transition-colors font-medium"
                  onClick={closeMenu}
                >
                  📊 Dashboard
                </Link>
                <Link
                  href="/admin/usuarios"
                  className="px-3 py-3 rounded-lg hover:bg-gray-700 transition-colors font-medium"
                  onClick={closeMenu}
                >
                  👥 Usuarios
                </Link>
              </>
            )}

            {userRole === "cliente" && (
              <>
                <Link
                  href="/cliente"
                  className="px-3 py-3 rounded-lg hover:bg-gray-700 transition-colors font-medium"
                  onClick={closeMenu}
                >
                  📋 Mis Citas
                </Link>
                <Link
                  href="/cliente/agendar"
                  className="px-3 py-3 rounded-lg hover:bg-gray-700 transition-colors font-medium"
                  onClick={closeMenu}
                >
                  ✨ Agendar
                </Link>
              </>
            )}

            {/* Línea divisoria */}
            <div className="border-t border-gray-700 my-2"></div>

            {/* Info usuario - Mobile */}
            <div className="flex items-center space-x-3 px-3 py-2">
              <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-sm font-bold">
                {userName?.charAt(0).toUpperCase() || "U"}
              </div>
              <div>
                <p className="font-medium">{userName}</p>
                <p className="text-xs text-gray-400">
                  {userRole === "admin" ? "Administrador" : "Cliente"}
                </p>
              </div>
            </div>

            {/* Logout - Mobile */}
            <button
              onClick={() => {
                handleLogout();
                closeMenu();
              }}
              className="mx-3 bg-red-600 hover:bg-red-700 px-4 py-3 rounded-lg text-sm font-medium transition-colors"
            >
              Cerrar Sesión
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
}
