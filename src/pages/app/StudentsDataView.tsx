import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  AlertCircle,
  CheckCircle2,
  Edit3,
  GraduationCap,
  Plus,
  Search,
  Trash2,
  X,
} from 'lucide-react';
import { getSupabaseClient } from '../../lib/supabase';
import { JURUSAN_LIST, type JurusanCode, type Student } from '../../types';

interface StudentFormState {
  nis: string;
  full_name: string;
  kelas: string;
  jurusan: JurusanCode;
}

const EMPTY_FORM: StudentFormState = {
  nis: '',
  full_name: '',
  kelas: '',
  jurusan: 'TKJ',
};

export default function StudentsDataView() {
  const { kelas: kelasParam } = useParams<{ kelas?: string }>();
  const navigate = useNavigate();

  const [students, setStudents] = useState<Student[]>([]);
  const [selectedKelas, setSelectedKelas] = useState(
    kelasParam ? decodeURIComponent(kelasParam) : ''
  );
  const [jurusanFilter, setJurusanFilter] = useState<'Semua' | JurusanCode>('Semua');
  const [search, setSearch] = useState('');

  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(
    null
  );

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [form, setForm] = useState<StudentFormState>(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

  // Delete confirmation state
  const [deletingStudent, setDeletingStudent] = useState<Student | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (kelasParam) {
      setSelectedKelas(decodeURIComponent(kelasParam));
    }
  }, [kelasParam]);

  const loadStudents = useCallback(async () => {
    setLoading(true);
    try {
      const client = await getSupabaseClient();
      if (!client) return;

      const { data, error } = await client
        .from('students')
        .select('*')
        .order('kelas', { ascending: true })
        .order('full_name', { ascending: true });

      if (error) throw error;
      setStudents((data as Student[]) || []);
    } catch (err) {
      setFeedback({
        type: 'error',
        message: err instanceof Error ? err.message : 'Gagal memuat data siswa.',
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadStudents();
  }, [loadStudents]);

  const classOptions = useMemo(
    () => Array.from(new Set(students.map((s) => s.kelas))).sort(),
    [students]
  );

  const filteredStudents = useMemo(() => {
    const q = search.trim().toLowerCase();
    return students.filter((s) => {
      if (selectedKelas && s.kelas !== selectedKelas) return false;
      if (jurusanFilter !== 'Semua' && s.jurusan !== jurusanFilter) return false;
      if (!q) return true;
      return (
        s.full_name.toLowerCase().includes(q) ||
        s.nis.toLowerCase().includes(q) ||
        s.kelas.toLowerCase().includes(q)
      );
    });
  }, [students, selectedKelas, jurusanFilter, search]);

  const handleClassFilterChange = (val: string) => {
    setSelectedKelas(val);
    if (val) {
      navigate(`/app/data-siswa/${encodeURIComponent(val)}`, { replace: true });
    } else {
      navigate('/app/data-siswa', { replace: true });
    }
  };

  const openAddModal = () => {
    setEditingStudent(null);
    setForm({
      ...EMPTY_FORM,
      kelas: selectedKelas || '',
    });
    setModalError(null);
    setModalOpen(true);
  };

  const openEditModal = (stu: Student) => {
    setEditingStudent(stu);
    setForm({
      nis: stu.nis,
      full_name: stu.full_name,
      kelas: stu.kelas,
      jurusan: stu.jurusan,
    });
    setModalError(null);
    setModalOpen(true);
  };

  const handleSaveStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    setModalError(null);

    if (!form.nis.trim() || !form.full_name.trim() || !form.kelas.trim()) {
      setModalError('NIS, Nama Siswa, dan Kelas wajib diisi.');
      return;
    }

    setSubmitting(true);
    try {
      const client = await getSupabaseClient();
      if (!client) throw new Error('Koneksi Supabase belum tersedia.');

      const payload = {
        nis: form.nis.trim(),
        full_name: form.full_name.trim(),
        kelas: form.kelas.trim().toUpperCase(),
        jurusan: form.jurusan,
        updated_at: new Date().toISOString(),
      };

      if (editingStudent) {
        const { error } = await client
          .from('students')
          .update(payload)
          .eq('id', editingStudent.id);
        if (error) throw error;
        setFeedback({ type: 'success', message: `Data siswa ${payload.full_name} berhasil diperbarui.` });
      } else {
        const { error } = await client.from('students').insert(payload);
        if (error) throw error;
        setFeedback({ type: 'success', message: `Siswa ${payload.full_name} berhasil ditambahkan.` });
      }

      setModalOpen(false);
      await loadStudents();
    } catch (err) {
      setModalError(err instanceof Error ? err.message : 'Gagal menyimpan data siswa.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteStudent = async () => {
    if (!deletingStudent) return;
    setDeleting(true);
    try {
      const client = await getSupabaseClient();
      if (!client) throw new Error('Koneksi Supabase belum tersedia.');

      const { error } = await client.from('students').delete().eq('id', deletingStudent.id);
      if (error) throw error;

      setFeedback({
        type: 'success',
        message: `Data siswa ${deletingStudent.full_name} (${deletingStudent.nis}) berhasil dihapus.`,
      });
      setDeletingStudent(null);
      await loadStudents();
    } catch (err) {
      setFeedback({
        type: 'error',
        message: err instanceof Error ? err.message : 'Gagal menghapus data siswa.',
      });
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Toolbar */}
      <div className="bg-white border border-zinc-200 rounded-xl p-5 flex flex-col lg:flex-row lg:items-end justify-between gap-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 flex-1">
          <div>
            <label htmlFor="stu-filter-jurusan" className="block text-xs font-semibold text-zinc-700 mb-1.5">
              Jurusan
            </label>
            <select
              id="stu-filter-jurusan"
              value={jurusanFilter}
              onChange={(e) => setJurusanFilter(e.target.value as 'Semua' | JurusanCode)}
              className="w-full px-3 py-2 text-sm bg-zinc-50 border border-zinc-300 rounded-lg focus:outline-none focus:border-red-700"
            >
              <option value="Semua">Semua Jurusan (6)</option>
              {JURUSAN_LIST.map((j) => (
                <option key={j.code} value={j.code}>
                  {j.code} — {j.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="stu-filter-kelas" className="block text-xs font-semibold text-zinc-700 mb-1.5">
              Kelas
            </label>
            <select
              id="stu-filter-kelas"
              value={selectedKelas}
              onChange={(e) => handleClassFilterChange(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-zinc-50 border border-zinc-300 rounded-lg focus:outline-none focus:border-red-700"
            >
              <option value="">Semua Kelas</option>
              {classOptions.map((k) => (
                <option key={k} value={k}>
                  {k}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="stu-search" className="block text-xs font-semibold text-zinc-700 mb-1.5">
              Cari NIS / Nama Siswa
            </label>
            <div className="relative">
              <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                id="stu-search"
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Cari NIS atau nama..."
                className="w-full pl-9 pr-3 py-2 text-sm bg-zinc-50 border border-zinc-300 rounded-lg focus:outline-none focus:border-red-700"
              />
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={openAddModal}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-semibold text-white bg-red-700 hover:bg-red-800 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          Tambah Siswa
        </button>
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

      {/* Students Table */}
      <div className="bg-white border border-zinc-200 rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-zinc-200 flex items-center justify-between">
          <h2 className="text-base font-bold text-zinc-900">
            Master Data Siswa SMK Prima Unggul
          </h2>
          <span className="text-xs text-zinc-500 tabular-nums">
            {filteredStudents.length} siswa ditampilkan
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-zinc-200 bg-zinc-50 text-xs font-semibold text-zinc-600">
                <th className="py-3 px-4 w-12">No</th>
                <th className="py-3 px-4">NIS</th>
                <th className="py-3 px-4">Nama Lengkap</th>
                <th className="py-3 px-4">Kelas</th>
                <th className="py-3 px-4">Jurusan</th>
                <th className="py-3 px-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 text-sm">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-10 text-center text-zinc-500">
                    Memuat data siswa...
                  </td>
                </tr>
              ) : filteredStudents.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center">
                    <GraduationCap className="w-8 h-8 text-zinc-300 mx-auto mb-2" />
                    <p className="text-sm font-semibold text-zinc-800">Belum ada data siswa</p>
                    <p className="text-xs text-zinc-500 mt-1">
                      Klik tombol &ldquo;Tambah Siswa&rdquo; untuk mendaftarkan siswa baru.
                    </p>
                  </td>
                </tr>
              ) : (
                filteredStudents.map((stu, idx) => (
                  <tr key={stu.id} className="hover:bg-zinc-50/80">
                    <td className="py-3 px-4 font-mono text-xs text-zinc-500 tabular-nums">
                      {idx + 1}
                    </td>
                    <td className="py-3 px-4 font-mono text-xs font-semibold text-zinc-800 tabular-nums">
                      {stu.nis}
                    </td>
                    <td className="py-3 px-4 font-semibold text-zinc-900">{stu.full_name}</td>
                    <td className="py-3 px-4 text-xs font-medium text-zinc-700">{stu.kelas}</td>
                    <td className="py-3 px-4 font-mono text-xs font-semibold text-red-700">
                      {stu.jurusan}
                    </td>
                    <td className="py-3 px-4 text-right whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => openEditModal(stu)}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-zinc-700 hover:text-zinc-900 hover:bg-zinc-100 rounded-md transition-colors mr-1"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeletingStudent(stu)}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-red-700 hover:bg-red-50 rounded-md transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        Hapus
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Modal */}
      {modalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/60 p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-md bg-white border border-zinc-200 rounded-xl shadow-xl overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-200">
              <h3 className="text-base font-bold text-zinc-900">
                {editingStudent ? 'Edit Data Siswa' : 'Tambah Siswa Baru'}
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

            <form onSubmit={handleSaveStudent} className="p-6 space-y-4">
              {modalError && (
                <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-800">
                  {modalError}
                </div>
              )}

              <div>
                <label htmlFor="form-nis" className="block text-xs font-semibold text-zinc-700 mb-1.5">
                  NIS (Nomor Induk Siswa)
                </label>
                <input
                  id="form-nis"
                  type="text"
                  value={form.nis}
                  onChange={(e) => setForm((f) => ({ ...f, nis: e.target.value }))}
                  placeholder="Contoh: 20261001"
                  required
                  className="w-full px-3.5 py-2 text-sm font-mono bg-white border border-zinc-300 rounded-lg focus:outline-none focus:border-red-700"
                />
              </div>

              <div>
                <label htmlFor="form-stu-name" className="block text-xs font-semibold text-zinc-700 mb-1.5">
                  Nama Lengkap Siswa
                </label>
                <input
                  id="form-stu-name"
                  type="text"
                  value={form.full_name}
                  onChange={(e) => setForm((f) => ({ ...f, full_name: e.target.value }))}
                  placeholder="Contoh: Nadia Putri Maharani"
                  required
                  className="w-full px-3.5 py-2 text-sm bg-white border border-zinc-300 rounded-lg focus:outline-none focus:border-red-700"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="form-jurusan" className="block text-xs font-semibold text-zinc-700 mb-1.5">
                    Jurusan
                  </label>
                  <select
                    id="form-jurusan"
                    value={form.jurusan}
                    onChange={(e) => setForm((f) => ({ ...f, jurusan: e.target.value as JurusanCode }))}
                    className="w-full px-3 py-2 text-sm bg-white border border-zinc-300 rounded-lg focus:outline-none focus:border-red-700"
                  >
                    {JURUSAN_LIST.map((j) => (
                      <option key={j.code} value={j.code}>
                        {j.code}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label htmlFor="form-kelas" className="block text-xs font-semibold text-zinc-700 mb-1.5">
                    Kelas
                  </label>
                  <input
                    id="form-kelas"
                    type="text"
                    value={form.kelas}
                    onChange={(e) => setForm((f) => ({ ...f, kelas: e.target.value }))}
                    placeholder="Contoh: X TKJ 1"
                    required
                    className="w-full px-3.5 py-2 text-sm bg-white border border-zinc-300 rounded-lg focus:outline-none focus:border-red-700"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2">
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
                  {submitting ? 'Menyimpan...' : editingStudent ? 'Simpan Perubahan' : 'Simpan Siswa'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deletingStudent && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/60 p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-sm bg-white border border-zinc-200 rounded-xl shadow-xl p-6">
            <h3 className="text-base font-bold text-zinc-900">Hapus Data Siswa?</h3>
            <p className="mt-2 text-sm text-zinc-600 leading-relaxed">
              Siswa <strong>{deletingStudent.full_name}</strong> (NIS{' '}
              <span className="font-mono">{deletingStudent.nis}</span>) beserta riwayat absensinya
              akan dihapus dari database.
            </p>
            <div className="mt-6 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setDeletingStudent(null)}
                className="px-4 py-2 text-xs font-semibold text-zinc-700 bg-zinc-100 hover:bg-zinc-200 rounded-lg"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleDeleteStudent}
                disabled={deleting}
                className="px-4 py-2 text-xs font-semibold text-white bg-red-700 hover:bg-red-800 disabled:opacity-50 rounded-lg cursor-pointer"
              >
                {deleting ? 'Menghapus...' : 'Ya, Hapus Siswa'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
