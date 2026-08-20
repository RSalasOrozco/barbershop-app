"use client";

import { useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";

interface SidebarProps {
  userName?: string;
  userRole?: string;
}

const NAV_ITEMS = [
  { href: "/admin", label: "Dashboard", icon: "📊" },
  { href: "/admin/peluqueros", label: "Peluqueros", icon: "💈" },
  { href: "/admin/servicios", label: "Servicios", icon: "✂️" },
  { href: "/admin/usuarios", label: "Usuarios", icon: "👥" },
  { href: "/admin/sistema", label: "Sistema", icon: "⚙️" }
];

export default function Sidebar({ userName }: SidebarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);

  const isActive = (href: string) => {
    if (href === "/admin") return pathname === "/admin";
    return pathname.startsWith(href);
  };

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      router.push("/login");
      router.refresh();
    } catch (error) {
      console.error("Error al cerrar sesión:", error);
    }
  };

  const nav = (
    <nav className="flex-1 space-y-1 px-3 mt-4">
      {NAV_ITEMS.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          onClick={() => setIsOpen(false)}
          className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
            isActive(item.href)
              ? "bg-amber-500/15 text-amber-400 border border-amber-500/30"
              : "text-stone-300 hover:bg-stone-800 hover:text-white border border-transparent"
          }`}
        >
          <span className="text-lg">{item.icon}</span>
          {item.label}
        </Link>
      ))}
    </nav>
  );

  const userCard = (
    <div className="p-4 border-t border-stone-800">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-amber-500 to-amber-700 flex items-center justify-center text-sm font-bold text-stone-950 shrink-0">
          {userName?.charAt(0).toUpperCase() || "A"}
        </div>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-stone-100 truncate">{userName || "Administrador"}</p>
          <p className="text-xs text-stone-500">Admin</p>
        </div>
      </div>
      <button
        onClick={handleLogout}
        className="mt-3 w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-red-600/15 border border-red-600/30 text-red-400 hover:bg-red-600 hover:text-white text-sm font-medium transition-colors"
      >
        <span>⎋</span> Cerrar Sesión
      </button>
    </div>
  );

  return (
    <>
      {/* Barra superior móvil */}
      <header className="md:hidden sticky top-0 z-40 bg-stone-950/95 backdrop-blur border-b border-stone-800">
        <div className="flex items-center justify-between px-4 h-14">
          <Link href="/admin" className="flex items-center gap-2">
            <span className="text-xl">💈</span>
            <span className="font-bold tracking-tight">BarberTrack</span>
          </Link>
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="p-2 rounded-lg hover:bg-stone-800 transition-colors"
            aria-label="Menú"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              {isOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
        </div>
        {isOpen && (
          <div className="flex flex-col">
            {nav}
            {userCard}
          </div>
        )}
      </header>

      {/* Sidebar desktop */}
      <aside className="hidden md:flex fixed inset-y-0 left-0 w-60 flex-col bg-stone-950 border-r border-stone-800 z-30">
        <Link href="/admin" className="flex items-center gap-2 px-5 py-5 border-b border-stone-800">
          <span className="text-2xl">💈</span>
          <div>
            <span className="text-lg font-bold tracking-tight text-stone-50">BarberTrack</span>
            <span className="block text-[10px] uppercase tracking-widest text-amber-500">Gestión Local</span>
          </div>
        </Link>
        {nav}
        {userCard}
      </aside>
    </>
  );
}