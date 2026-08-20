"use client";

import { useCallback, useEffect, useState } from "react";
import Sidebar from "@/components/Sidebar";
import { toast } from "sonner";
import type { SessionUser, User } from "@/lib/types";
import { formatCurrency } from "@/lib/types";

export default function AdminUsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [user, setUser] = useState<SessionUser | null>(null);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [stats, setStats] = useState<{ total: number; admins: number; withAppointments: number }>({
    total: 0,
    admins: 0,
    withAppointments: 0
  });

  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [deleteUser, setDeleteUser] = useState<User | null>(null);
  const [newPassword, setNewPassword] = useState("");

  const fetchAll = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (search.trim()) params.set("search", search.trim());
      params.set("page", String(page));
      params.set("limit", String(pageSize));

      const [u, us] = await Promise.all([
        fetch("/api/auth/me"),
        fetch(`/api/admin/users?${params.toString()}`)
      ]);
      const ud = await u.json();
      const usd = await us.json();
      setUser(ud.user || null);
      setUsers(usd.users || []);
      setTotal(usd.pagination?.total ?? 0);
      setTotalPages(usd.pagination?.totalPages ?? 1);
      setStats(usd.stats || { total: 0, admins: 0, withAppointments: 0 });
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, [search, page, pageSize]);

  // Cargar con debounce al buscar
  useEffect(() => {
    const t = setTimeout(() => {
      fetchAll();
    }, 250);
    return () => clearTimeout(t);
  }, [fetchAll]);

  // Reiniciar página al cambiar la búsqueda o el tamaño de página
  useEffect(() => {
    setPage(1);
  }, [search, pageSize]);

  const handleUpdateUser = async () => {
    if (!editingUser) return;
    try {
      const res = await fetch("/api/admin/users", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: editingUser.id,
          name: editingUser.name,
          email: editingUser.email,
          phone: editingUser.phone,
          role: editingUser.role
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error al actualizar");
      setShowModal(false);
      fetchAll();
      toast.success("Usuario actualizado");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al actualizar");
    }
  };

  const handleResetPassword = async () => {
    if (!selectedUser || !newPassword) return;
    if (newPassword.length < 6) {
      toast.warning("La contraseña debe tener al menos 6 caracteres");
      return;
    }
    try {
      const res = await fetch("/api/admin/users/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: selectedUser.id, newPassword })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error al resetear contraseña");
      toast.success(`Contraseña de "${selectedUser.name}" actualizada`);
      setShowPasswordModal(false);
      setNewPassword("");
      setSelectedUser(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al resetear contraseña");
    }
  };

  const handleDeleteUser = async (id: number, name: string) => {
    try {
      const res = await fetch(`/api/admin/users?id=${id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error al eliminar");
      fetchAll();
      toast.success(`Usuario "${name}" eliminado`);
      setDeleteUser(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al eliminar");
      setDeleteUser(null);
    }
  };

  const admins = stats.admins;
  const activeClients = stats.withAppointments;

  if (loading) {
    return (
      <div className="min-h-screen">
        <Sidebar userName={user?.name} userRole={user?.role} />
        <main className="md:pl-60 p-8 text-stone-500">Cargando usuarios...</main>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <Sidebar userName={user?.name} userRole={user?.role} />
      <main className="md:pl-60">
        <div className="p-4 md:p-8 max-w-6xl mx-auto">
          <div className="mb-6">
            <h1 className="text-2xl md:text-3xl font-bold text-stone-50">👥 Usuarios</h1>
            <p className="text-stone-500 mt-1 text-sm">Administradores y clientes registrados en el sistema</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="stat-card">
              <p className="stat-label">Total Usuarios</p>
              <p className="stat-value text-stone-50">{stats.total}</p>
            </div>
            <div className="stat-card">
              <p className="stat-label">Administradores</p>
              <p className="stat-value text-amber-400">{admins}</p>
            </div>
            <div className="stat-card">
              <p className="stat-label">Clientes con citas</p>
              <p className="stat-value text-emerald-400">{activeClients}</p>
            </div>
          </div>

          <div className="card overflow-hidden">
            <div className="p-4 border-b border-stone-800">
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex-1 min-w-40">
                  <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="🔍 Buscar por nombre, correo o teléfono..."
                    className="input"
                  />
                </div>
                <button onClick={() => { setSearch(""); setPage(1); }} className="btn btn-ghost">
                  Limpiar
                </button>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-stone-800/60">
                  <tr>
                    <th className="table-header">Usuario</th>
                    <th className="table-header">Rol</th>
                    <th className="table-header">Registro</th>
                    <th className="table-header">Citas</th>
                    <th className="table-header">Total Gastado</th>
                    <th className="table-header">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-800">
                  {users.length > 0 ? (
                    users.map((u) => (
                    <tr key={u.id} className="hover:bg-stone-800/40 transition-colors">
                      <td className="table-cell">
                        <div className="text-sm font-medium text-stone-100">{u.name}</div>
                        <div className="text-xs text-stone-500">{u.email}</div>
                        {u.phone && <div className="text-xs text-stone-500">📱 {u.phone}</div>}
                      </td>
                      <td className="table-cell">
                        <span className={`badge ${u.role === "admin" ? "bg-amber-500/15 text-amber-400 border border-amber-500/30" : "bg-sky-500/15 text-sky-400 border border-sky-500/30"}`}>
                          {u.role === "admin" ? "👑 Admin" : "👤 Cliente"}
                        </span>
                      </td>
                      <td className="table-cell text-sm text-stone-400">
                        {new Date(u.created_at).toLocaleDateString("es-ES", { day: "numeric", month: "short", year: "numeric" })}
                      </td>
                      <td className="table-cell text-sm text-stone-200">{u.total_appointments || 0}</td>
                      <td className="table-cell text-sm text-emerald-400 font-medium">{formatCurrency(u.total_spent)}</td>
                      <td className="table-cell">
                        <div className="flex gap-2">
                          <button
                            onClick={() => { setEditingUser({ ...u }); setShowModal(true); }}
                            className="p-1.5 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-400 hover:bg-amber-500 hover:text-stone-950 transition-colors"
                            title="Editar"
                          >
                            ✏️
                          </button>
                          <button
                            onClick={() => { setSelectedUser(u); setShowPasswordModal(true); }}
                            className="p-1.5 rounded-lg bg-sky-500/10 border border-sky-500/30 text-sky-400 hover:bg-sky-500 hover:text-white transition-colors"
                            title="Resetear contraseña"
                          >
                            🔑
                          </button>
                          {u.role !== "admin" && (
                            <button
                              onClick={() => setDeleteUser(u)}
                              className="p-1.5 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 hover:bg-red-500 hover:text-white transition-colors"
                              title="Eliminar"
                            >
                              🗑️
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                  ) : (
                    <tr>
                      <td colSpan={6} className="px-4 py-10 text-center text-stone-500">
                        No hay usuarios que coincidan con la búsqueda.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Paginación */}
            <div className="flex flex-wrap items-center justify-between gap-3 p-4 border-t border-stone-800">
              <div className="flex items-center gap-2">
                <p className="text-sm text-stone-500">
                  {total > 0 ? `Mostrando ${users.length} de ${total} usuarios` : "Sin resultados"}
                </p>
                <select
                  value={pageSize}
                  onChange={(e) => setPageSize(Number(e.target.value))}
                  className="input !w-auto !py-1.5 text-sm"
                  title="Usuarios por página"
                >
                  {[15, 25, 50, 100].map((n) => (
                    <option key={n} value={n}>{n} / pág.</option>
                  ))}
                </select>
              </div>
              {totalPages > 1 && (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page <= 1}
                    className="btn btn-ghost !px-3 !py-1.5 text-sm"
                  >
                    ← Anterior
                  </button>
                  <span className="text-sm text-stone-400">
                    Página {page} de {totalPages}
                  </span>
                  <button
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page >= totalPages}
                    className="btn btn-ghost !px-3 !py-1.5 text-sm"
                  >
                    Siguiente →
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Modal editar */}
      {showModal && editingUser && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="p-5 border-b border-stone-800">
              <h3 className="text-lg font-bold text-stone-50">Editar Usuario</h3>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="label">Nombre</label>
                <input
                  type="text"
                  value={editingUser.name}
                  onChange={(e) => setEditingUser({ ...editingUser, name: e.target.value })}
                  className="input"
                />
              </div>
              <div>
                <label className="label">Email</label>
                <input
                  type="email"
                  value={editingUser.email}
                  onChange={(e) => setEditingUser({ ...editingUser, email: e.target.value })}
                  className="input"
                />
              </div>
              <div>
                <label className="label">Teléfono</label>
                <input
                  type="tel"
                  inputMode="numeric"
                  value={editingUser.phone || ""}
                  onChange={(e) => setEditingUser({ ...editingUser, phone: e.target.value.replace(/\D/g, "").slice(0, 10) })}
                  className="input"
                  placeholder="3001234567"
                />
              </div>
              <div>
                <label className="label">Rol</label>
                <select
                  value={editingUser.role}
                  onChange={(e) => setEditingUser({ ...editingUser, role: e.target.value as "admin" | "cliente" })}
                  className="input"
                >
                  <option value="cliente">Cliente</option>
                  <option value="admin">Administrador</option>
                </select>
              </div>
            </div>
            <div className="flex gap-3 p-5 border-t border-stone-800">
              <button onClick={() => setShowModal(false)} className="btn btn-ghost flex-1">Cancelar</button>
              <button onClick={handleUpdateUser} className="btn btn-primary flex-1">Guardar</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal reset password */}
      {showPasswordModal && selectedUser && (
        <div className="modal-overlay" onClick={() => setShowPasswordModal(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="p-5 border-b border-stone-800">
              <h3 className="text-lg font-bold text-stone-50">🔐 Resetear Contraseña</h3>
            </div>
            <div className="p-5 space-y-4">
              <p className="text-sm text-stone-400">
                Usuario: <strong className="text-stone-100">{selectedUser.name}</strong> ({selectedUser.email})
              </p>
              <div>
                <label className="label">Nueva contraseña</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="input"
                  placeholder="Mínimo 6 caracteres"
                />
              </div>
            </div>
            <div className="flex gap-3 p-5 border-t border-stone-800">
              <button onClick={() => setShowPasswordModal(false)} className="btn btn-ghost flex-1">Cancelar</button>
              <button onClick={handleResetPassword} className="btn btn-primary flex-1">Actualizar</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal eliminar */}
      {deleteUser && (
        <div className="modal-overlay" onClick={() => setDeleteUser(null)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="p-5 border-b border-stone-800">
              <h3 className="text-lg font-bold text-red-400">Eliminar Usuario</h3>
            </div>
            <div className="p-5">
              <p className="text-stone-300">
                ¿Eliminar al usuario <strong className="text-stone-100">{deleteUser.name}</strong>?
              </p>
              <p className="text-xs text-red-400/80 mt-2">También se eliminarán sus citas. No se puede deshacer.</p>
            </div>
            <div className="flex gap-3 p-5 border-t border-stone-800">
              <button onClick={() => setDeleteUser(null)} className="btn btn-ghost flex-1">Cancelar</button>
              <button onClick={() => handleDeleteUser(deleteUser.id, deleteUser.name)} className="btn btn-danger flex-1">Eliminar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}