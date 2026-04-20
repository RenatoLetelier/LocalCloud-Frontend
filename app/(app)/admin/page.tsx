'use client';

export const runtime = 'edge';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Loader2, Plus, Trash2, User, UserCog } from 'lucide-react';
import { useAuth } from '@/providers/AuthProvider';
import { api } from '@/lib/api';
import { showError, showSuccess } from '@/lib/toast';
import type { UserPublic, UserRole } from '@/lib/types';
import { cn } from '@/lib/utils';

const ROLE_LABELS: Record<UserRole, string> = {
  admin: 'Admin',
  user: 'Usuario',
  guest: 'Invitado',
};

const ROLE_COLORS: Record<UserRole, string> = {
  admin: 'bg-purple-100 dark:bg-purple-500/20 text-purple-700 dark:text-purple-300',
  user: 'bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-300',
  guest: 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400',
};

export default function AdminPage() {
  const router = useRouter();
  const { user: me } = useAuth();

  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  // Redirect non-admins
  useEffect(() => {
    if (mounted && me && me.role !== 'admin') {
      router.replace('/');
    }
  }, [mounted, me, router]);

  const [users, setUsers] = useState<UserPublic[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);

  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Create user form
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'user' as UserRole });
  const [creating, setCreating] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    api.users.list()
      .then(setUsers)
      .catch(() => showError('No se pudo cargar la lista de usuarios'))
      .finally(() => setLoadingUsers(false));
  }, []);

  async function handleDelete(id: string) {
    setDeleting(true);
    try {
      await api.users.delete(id);
      setUsers((prev) => prev.filter((u) => u.id !== id));
      setConfirmDeleteId(null);
      showSuccess('Usuario eliminado');
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Error al eliminar usuario');
    } finally {
      setDeleting(false);
    }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    if (!form.name.trim() || !form.email.trim() || !form.password.trim()) {
      setFormError('Todos los campos son obligatorios');
      return;
    }
    setCreating(true);
    try {
      // The backend create-user endpoint (admin only)
      const newUser = await api.users.create({
        name: form.name.trim(),
        email: form.email.trim(),
        password: form.password,
        role: form.role,
      });
      setUsers((prev) => [...prev, newUser]);
      setForm({ name: '', email: '', password: '', role: 'user' });
      setShowCreateForm(false);
      showSuccess('Usuario creado correctamente');
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Error al crear usuario');
    } finally {
      setCreating(false);
    }
  }

  if (!mounted || !me) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
      </div>
    );
  }

  if (me.role !== 'admin') return null;

  return (
    <div className="max-w-3xl mx-auto p-4 sm:p-6 flex flex-col gap-6">

      {/* ── Back button ── */}
      <button
        onClick={() => router.back()}
        className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors w-fit"
      >
        <ArrowLeft className="w-4 h-4" />
        Volver
      </button>

      {/* ── Header ── */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Administración</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Gestiona usuarios y configuración del sistema</p>
        </div>
        <button
          onClick={() => { setShowCreateForm((v) => !v); setFormError(null); }}
          className="flex items-center gap-2 px-4 py-2 text-sm rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Nuevo usuario
        </button>
      </div>

      {/* ── Create user form ── */}
      {showCreateForm && (
        <form
          onSubmit={handleCreate}
          className="flex flex-col gap-4 p-5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50"
        >
          <div className="flex items-center gap-2 mb-1">
            <UserCog className="w-4 h-4 text-indigo-500" />
            <h2 className="text-sm font-semibold text-gray-800 dark:text-gray-200">Crear nuevo usuario</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label="Nombre">
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="Nombre completo"
                className={inputCls}
              />
            </Field>
            <Field label="Email">
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                placeholder="correo@ejemplo.com"
                className={inputCls}
              />
            </Field>
            <Field label="Contraseña">
              <input
                type="password"
                value={form.password}
                onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                placeholder="Mínimo 6 caracteres"
                className={inputCls}
              />
            </Field>
            <Field label="Rol">
              <select
                value={form.role}
                onChange={(e) => setForm((f) => ({ ...f, role: e.target.value as UserRole }))}
                className={inputCls}
              >
                <option value="user">Usuario</option>
                <option value="guest">Invitado</option>
                <option value="admin">Admin</option>
              </select>
            </Field>
          </div>

          {formError && (
            <p className="text-xs text-red-500 dark:text-red-400">{formError}</p>
          )}

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => { setShowCreateForm(false); setFormError(null); }}
              className="px-4 py-2 text-sm rounded-lg text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={creating}
              className="flex items-center gap-2 px-4 py-2 text-sm rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50 transition-colors"
            >
              {creating && <Loader2 className="w-4 h-4 animate-spin" />}
              Crear usuario
            </button>
          </div>
        </form>
      )}

      {/* ── User list ── */}
      <section>
        <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-3">
          Usuarios ({users.length})
        </h2>

        {loadingUsers ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-6 h-6 text-indigo-500 animate-spin" />
          </div>
        ) : users.length === 0 ? (
          <p className="text-sm text-gray-400 dark:text-gray-600 py-8 text-center">No hay usuarios</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {users.map((u) => (
              <li
                key={u.id}
                className="flex items-center gap-3 p-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800"
              >
                {/* Avatar placeholder */}
                <div className="w-9 h-9 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center shrink-0">
                  <User className="w-4 h-4 text-gray-400" />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                      {u.name}
                      {u.id === me.id && (
                        <span className="ml-1.5 text-[10px] font-semibold text-gray-400">(tú)</span>
                      )}
                    </p>
                    <span className={cn('text-[10px] font-semibold px-1.5 py-0.5 rounded-full', ROLE_COLORS[u.role])}>
                      {ROLE_LABELS[u.role]}
                    </span>
                  </div>
                  <p className="text-xs text-gray-400 truncate">{u.email}</p>
                </div>

                {/* Delete — not self */}
                {u.id !== me.id && (
                  confirmDeleteId === u.id ? (
                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className="text-xs text-red-500">¿Eliminar?</span>
                      <button
                        onClick={() => handleDelete(u.id)}
                        disabled={deleting}
                        className="px-2 py-1 text-xs font-semibold rounded bg-red-600 text-white hover:bg-red-700 disabled:opacity-50 transition-colors"
                      >
                        {deleting ? '…' : 'Sí'}
                      </button>
                      <button
                        onClick={() => setConfirmDeleteId(null)}
                        disabled={deleting}
                        className="px-2 py-1 text-xs rounded text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                      >
                        No
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setConfirmDeleteId(u.id)}
                      aria-label={`Eliminar usuario ${u.name}`}
                      className="p-2 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors shrink-0"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

const inputCls = cn(
  'w-full px-3 py-2 text-sm rounded-lg',
  'bg-white dark:bg-gray-800',
  'border border-gray-300 dark:border-gray-600',
  'text-gray-900 dark:text-gray-100 placeholder-gray-400',
  'focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent',
);

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">{label}</label>
      {children}
    </div>
  );
}
