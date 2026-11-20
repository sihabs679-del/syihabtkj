import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  Edit3,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  Users,
  X,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { getAccessToken } from '../../lib/supabase';
import { ROLE_LABELS, type ManagedUser, type UserRole } from '../../types';

interface UserFormState {
  email: string;
  password: string;
  full_name: string;
  nip: string;
  role: UserRole;
  jabatan: string;
}

const EMPTY_USER_FORM: UserFormState = {
  email: '',
  password: '',
  full_name: '',
  nip: '',
  role: 'guru',
  jabatan: '',
};

export default function UserManagementView() {
  const { user: currentUser, config, refreshProfile } = useAuth();

  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [roleFilter, setRoleFilter] = useState<'Semua' | UserRole>('Semua');
  const [search, setSearch] = useState('');

  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(
    null
  );

  // Add / Edit Modal
  const [modalOpen, setModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<ManagedUser | null>(null);
  const [form, setForm] = useState<UserFormState>(EMPTY_USER_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

  // Hard Delete Modal
  const [deletingUser, setDeletingUser] = useState<ManagedUser | null>(null);
  const [deleting, setDeleting] = useState(false);

  const loadUsers = useCallback(async () => {
    setLoading(true);
    try {
      const token = await getAccessToken();
      if (!token) throw new Error('Sesi autentikasi tidak ditemukan.');

      const res = await fetch('/api/admin/users', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const payload = await res.json();
      if (!res.ok) throw new Error(payload.error || 'Gagal memuat daftar user.');

      setUsers((payload.users as ManagedUser[]) || []);
    } catch (err) {
      setFeedback({
        type: 'error',
        message: err instanceof Error ? err.message : 'Gagal memuat daftar user.',
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  const filteredUsers = useMemo(() => {
    const q = search.trim().toLowerCase();
    return users.filter((u) => {
      if (roleFilter !== 'Semua' && u.role !== roleFilter) return false;
      if (!q) return true;
      return (
        u.full_name.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        (u.nip || '').toLowerCase().includes(q) ||
        (u.jabatan || '').toLowerCase().includes(q)
      );
    });
  }, [users, roleFilter, search]);

  const openAddModal = () => {
    setEditingUser(null);
    setForm(EMPTY_USER_FORM);
    setModalError(null);
    setModalOpen(true);
  };

  const openEditModal = (u: ManagedUser) => {
    setEditingUser(u);
    setForm({
      email: u.email,
      password: '',
      full_name: u.full_name,
      nip: u.nip || '',
      role: u.role,
      jabatan: u.jabatan || '',
    });
    setModalError(null);
    setModalOpen(true);
  };

  const handleSaveUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setModalError(null);

    if (!form.full_name.trim() || !form.email.trim()) {
      setModalError('Nama lengkap dan email wajib diisi.');
      return;
    }

    if (!editingUser && form.password.length < 6) {
      setModalError('Password wajib diisi minimal 6 karakter untuk user baru.');
      return;
    }

    if (editingUser && form.password && form.password.length < 6) {
      setModalError('Password baru minimal 6 karakter.');
      return;
    }

    setSubmitting(true);
    try {
      const token = await getAccessToken();
      if (!token) throw new Error('Token autentikasi tidak tersedia.');

      const endpoint = editingUser ? `/api/admin/users/${editingUser.id}` : '/api/admin/users';
      const method = editingUser ? 'PATCH' : 'POST';

      const res = await fetch(endpoint, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          email: form.email.trim(),
          password: form.password ? form.password : undefined,
          full_name: form.full_name.trim(),
          nip: form.nip.trim(),
          role: form.role,
          jabatan: form.jabatan.trim(),
        }),
      });

      const payload = await res.json();
      if (!res.ok) throw new Error(payload.error || 'Gagal menyimpan data user.');

      setFeedback({
        type: 'success',
        message: editingUser
          ? `Data user ${form.full_name} berhasil diperbarui & disinkronkan ke Supabase Authentication.`
          : `User ${form.full_name} berhasil dibuat dan tersinkronisasi penuh dengan Supabase Authentication.`,
      });

      setModalOpen(false);
      await loadUsers();
      if (editingUser && editingUser.id === currentUser?.id) {
        await refreshProfile();
      }
    } catch (err) {
      setModalError(err instanceof Error ? err.message : 'Gagal menyimpan user.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleHardDeleteUser = async () => {
    if (!deletingUser) return;
    setDeleting(true);
    setFeedback(null);

    try {
      const token = await getAccessToken();
      if (!token) throw new Error('Token autentikasi tidak tersedia.');

      const res = await fetch(`/api/admin/users/${deletingUser.id}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const payload = await res.json();
      if (!res.ok) throw new Error(payload.error || 'Gagal menghapus user.');

      setFeedback({
        type: 'success',
        message: `Akun ${deletingUser.full_name} (${deletingUser.email}) berhasil dihapus permanen (hard delete) hingga ke Supabase Authentication.`,
      });
      setDeletingUser(null);
      await loadUsers();
    } catch (err) {
      setFeedback({
        type: 'error',
        message: err instanceof Error ? err.message : 'Gagal menghapus user secara permanen.',
      });
      setDeletingUser(null);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      {config && !config.serviceRoleConfigured && (
        <div className="p-4 rounded-xl border border-amber-300 bg-amber-50 text-sm text-amber-950 flex items-start gap-2.5">
          <AlertCircle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold">SUPABASE_SERVICE_ROLE_KEY Belum Terpasang</p>
            <p className="text-xs text-amber-900 mt-1">
              Fitur sinkronisasi User Management (tambah user, edit metadata auth, dan hard delete ke
              Supabase Authentication) membutuhkan <code className="font-mono">SUPABASE_SERVICE_ROLE_KEY</code> pada
              environment server.
            </p>
          </div>
        </div>
      )}

      {/* Toolbar */}
      <div className="bg-white border border-zinc-200 rounded-xl p-5 flex flex-col lg:flex-row lg:items-end justify-between gap-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 flex-1">
          <div>
            <label htmlFor="usr-role-filter" className="block text-xs font-semibold text-zinc-700 mb-1.5">
              Filter Peran
            </label>
            <select
              id="usr-role-filter"
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value as 'Semua' | UserRole)}
              className="w-full px-3 py-2 text-sm bg-zinc-50 border border-zinc-300 rounded-lg focus:outline-none focus:border-red-700"
            >
              <option value="Semua">Semua Peran ({users.length})</option>
              <option value="admin">Admin</option>
              <option value="guru">Guru</option>
              <option value="tenaga_kependidikan">Tenaga Kependidikan</option>
            </select>
          </div>

          <div>
            <label htmlFor="usr-search" className="block text-xs font-semibold text-zinc-700 mb-1.5">
              Cari Nama / Email / NIP
            </label>
            <div className="relative">
              <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                id="usr-search"
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Cari pengguna..."
                className="w-full pl-9 pr-3 py-2 text-sm bg-zinc-50 border border-zinc-300 rounded-lg focus:outline-none focus:border-red-700"
              />
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={loadUsers}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-3.5 py-2.5 text-xs font-semibold text-zinc-700 bg-zinc-100 hover:bg-zinc-200 rounded-lg transition-colors whitespace-nowrap"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Segarkan
          </button>

          <button
            type="button"
            onClick={openAddModal}
            className="inline-flex items-center gap-2 px-4 py-2.5 text-xs font-semibold text-white bg-red-700 hover:bg-red-800 rounded-lg transition-colors whitespace-nowrap cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Tambah User Baru
          </button>
        </div>
      </div>

      {feedback && (
        <div
          role="status"
          className={`p-3.5 rounded-xl border text-sm flex items-start gap-2.5 ${
            feedback.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-red-50 border-red-200 text-red-800'
          }`}
        >
          {feedback.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
          ) : (
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          )}
          <span>{feedback.message}</span>
        </div>
      )}

      {/* Users Table */}
      <div className="bg-white border border-zinc-200 rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-zinc-200 flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-zinc-900">
              Manajemen User &amp; Sinkronisasi Supabase Authentication
            </h2>
            <p className="text-xs text-zinc-500 mt-0.5">
              Penambahan, pembaruan, dan penghapusan permanen (hard delete) disinkronkan langsung ke{' '}
              <code className="font-mono">auth.users</code> Supabase.
            </p>
          </div>
          <span className="text-xs text-zinc-500 tabular-nums shrink-0">
            {filteredUsers.length} akun
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-zinc-200 bg-zinc-50 text-xs font-semibold text-zinc-600">
                <th className="py-3 px-4">Nama &amp; Email</th>
                <th className="py-3 px-4">NIP</th>
                <th className="py-3 px-4">Peran</th>
                <th className="py-3 px-4">Jabatan</th>
                <th className="py-3 px-4">Login Terakhir</th>
                <th className="py-3 px-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 text-sm">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-10 text-center text-zinc-500">
                    Memuat data pengguna dari Supabase Authentication...
                  </td>
                </tr>
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center">
                    <Users className="w-8 h-8 text-zinc-300 mx-auto mb-2" />
                    <p className="text-sm font-semibold text-zinc-800">Tidak ada user ditemukan</p>
                  </td>
                </tr>
              ) : (
                filteredUsers.map((u) => {
                  const isSelf = u.id === currentUser?.id;
                  return (
                    <tr key={u.id} className="hover:bg-zinc-50/80">
                      <td className="py-3 px-4">
                        <p className="font-semibold text-zinc-900">
                          {u.full_name}
                          {isSelf && (
                            <span className="ml-2 text-xs font-medium text-red-700">(Anda)</span>
                          )}
                        </p>
                        <p className="text-xs text-zinc-500">{u.email}</p>
                      </td>
                      <td className="py-3 px-4 font-mono text-xs text-zinc-700 tabular-nums">
                        {u.nip || '—'}
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`text-xs font-semibold ${
                            u.role === 'admin'
                              ? 'text-red-700'
                              : u.role === 'guru'
                                ? 'text-zinc-900'
                                : 'text-zinc-600'
                          }`}
                        >
                          {ROLE_LABELS[u.role]}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-xs text-zinc-600">{u.jabatan || '—'}</td>
                      <td className="py-3 px-4 font-mono text-xs text-zinc-500 tabular-nums whitespace-nowrap">
                        {u.last_sign_in_at
                          ? new Intl.DateTimeFormat('id-ID', {
                              day: '2-digit',
                              month: 'short',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            }).format(new Date(u.last_sign_in_at))
                          : 'Belum pernah login'}
                      </td>
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => openEditModal(u)}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-zinc-700 hover:text-zinc-900 hover:bg-zinc-100 rounded-md transition-colors mr-1"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                          Edit
                        </button>
                        <button
                          type="button"
                          disabled={isSelf}
                          onClick={() => setDeletingUser(u)}
                          title={isSelf ? 'Tidak dapat menghapus akun yang sedang aktif' : 'Hapus permanen user'}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-red-700 hover:bg-red-50 disabled:opacity-40 disabled:cursor-not-allowed rounded-md transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          Hapus
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create / Edit Modal */}
      {modalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/60 p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-lg bg-white border border-zinc-200 rounded-xl shadow-xl overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-200">
              <h3 className="text-base font-bold text-zinc-900">
                {editingUser ? 'Edit Data User' : 'Tambah User Baru (Sync Supabase Auth)'}
              </h3>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="p-1.5 text-zinc-500 hover:text-zinc-900 rounded-lg"
                aria-label="Tutup"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveUser} className="p-6 space-y-4">
              {modalError && (
                <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-800">
                  {modalError}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="usr-fullname" className="block text-xs font-semibold text-zinc-700 mb-1.5">
                    Nama Lengkap
                  </label>
                  <input
                    id="usr-fullname"
                    type="text"
                    value={form.full_name}
                    onChange={(e) => setForm((f) => ({ ...f, full_name: e.target.value }))}
                    placeholder="Contoh: Siti Rahmawati, S.Pd"
                    required
                    className="w-full px-3.5 py-2 text-sm bg-white border border-zinc-300 rounded-lg focus:outline-none focus:border-red-700"
                  />
                </div>

                <div>
                  <label htmlFor="usr-nip" className="block text-xs font-semibold text-zinc-700 mb-1.5">
                    NIP / ID Karyawan
                  </label>
                  <input
                    id="usr-nip"
                    type="text"
                    value={form.nip}
                    onChange={(e) => setForm((f) => ({ ...f, nip: e.target.value }))}
                    placeholder="Contoh: 199004152019032011"
                    className="w-full px-3.5 py-2 text-sm font-mono bg-white border border-zinc-300 rounded-lg focus:outline-none focus:border-red-700"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="usr-email" className="block text-xs font-semibold text-zinc-700 mb-1.5">
                  Email Login (Supabase Authentication)
                </label>
                <input
                  id="usr-email"
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                  placeholder="nama@smkprimaunggul.sch.id"
                  required
                  className="w-full px-3.5 py-2 text-sm bg-white border border-zinc-300 rounded-lg focus:outline-none focus:border-red-700"
                />
              </div>

              <div>
                <label htmlFor="usr-password" className="block text-xs font-semibold text-zinc-700 mb-1.5">
                  {editingUser ? 'Password Baru (Kosongkan jika tidak diubah)' : 'Password Login'}
                </label>
                <input
                  id="usr-password"
                  type="password"
                  value={form.password}
                  onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                  placeholder="Minimal 6 karakter"
                  required={!editingUser}
                  className="w-full px-3.5 py-2 text-sm bg-white border border-zinc-300 rounded-lg focus:outline-none focus:border-red-700"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="usr-role" className="block text-xs font-semibold text-zinc-700 mb-1.5">
                    Role / Hak Akses
                  </label>
                  <select
                    id="usr-role"
                    value={form.role}
                    onChange={(e) => setForm((f) => ({ ...f, role: e.target.value as UserRole }))}
                    className="w-full px-3 py-2 text-sm bg-white border border-zinc-300 rounded-lg focus:outline-none focus:border-red-700"
                  >
                    <option value="admin">Admin</option>
                    <option value="guru">Guru</option>
                    <option value="tenaga_kependidikan">Tenaga Kependidikan</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="usr-jabatan" className="block text-xs font-semibold text-zinc-700 mb-1.5">
                    Jabatan / Mata Pelajaran
                  </label>
                  <input
                    id="usr-jabatan"
                    type="text"
                    value={form.jabatan}
                    onChange={(e) => setForm((f) => ({ ...f, jabatan: e.target.value }))}
                    placeholder="Contoh: Guru Produktif TKJ"
                    className="w-full px-3.5 py-2 text-sm bg-white border border-zinc-300 rounded-lg focus:outline-none focus:border-red-700"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-zinc-100">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-zinc-700 bg-zinc-100 hover:bg-zinc-200 rounded-lg"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 text-xs font-semibold text-white bg-red-700 hover:bg-red-800 disabled:opacity-50 rounded-lg cursor-pointer"
                >
                  {submitting
                    ? 'Menyinkronkan...'
                    : editingUser
                      ? 'Simpan & Sinkronkan'
                      : 'Buat User di Supabase'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Hard Delete Confirmation Modal */}
      {deletingUser && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/60 p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-md bg-white border border-zinc-200 rounded-xl shadow-xl p-6">
            <h3 className="text-base font-bold text-red-700">
              Hapus User Secara Permanen (Hard Delete)?
            </h3>
            <p className="mt-2 text-sm text-zinc-600 leading-relaxed">
              Akun <strong>{deletingUser.full_name}</strong> ({deletingUser.email}) akan dihapus
              secara permanen dari tabel profil <strong>dan langsung dari Supabase Authentication</strong>.
              Tindakan ini tidak dapat dibatalkan.
            </p>
            <div className="mt-6 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setDeletingUser(null)}
                className="px-4 py-2 text-xs font-semibold text-zinc-700 bg-zinc-100 hover:bg-zinc-200 rounded-lg"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleHardDeleteUser}
                disabled={deleting}
                className="px-4 py-2 text-xs font-semibold text-white bg-red-700 hover:bg-red-800 disabled:opacity-50 rounded-lg cursor-pointer"
              >
                {deleting ? 'Menghapus Permanen...' : 'Ya, Hard Delete User'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
