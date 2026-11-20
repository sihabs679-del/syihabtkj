import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Download, Search } from 'lucide-react';
import { formatDateISO, getSupabaseClient } from '../../lib/supabase';
import type { StudentAttendance, StudentAttendanceStatus } from '../../types';

export default function StudentRecapView() {
  const { kelas: kelasParam } = useParams<{ kelas?: string }>();
  const navigate = useNavigate();

  const today = formatDateISO();
  const monthStart = `${today.slice(0, 7)}-01`;

  const [startDate, setStartDate] = useState(monthStart);
  const [endDate, setEndDate] = useState(today);
  const [selectedKelas, setSelectedKelas] = useState(
    kelasParam ? decodeURIComponent(kelasParam) : ''
  );
  const [statusFilter, setStatusFilter] = useState<'Semua' | StudentAttendanceStatus>('Semua');
  const [search, setSearch] = useState('');

  const [records, setRecords] = useState<StudentAttendance[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (kelasParam) {
      setSelectedKelas(decodeURIComponent(kelasParam));
    }
  }, [kelasParam]);

  const loadRecap = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const client = await getSupabaseClient();
      if (!client) return;

      const { data, error: queryErr } = await client
        .from('student_attendance')
        .select(
          '*, students(nis, full_name, kelas, jurusan), recorder:profiles!student_attendance_recorded_by_fkey(full_name)'
        )
        .gte('attendance_date', startDate)
        .lte('attendance_date', endDate)
        .order('attendance_date', { ascending: false });

      if (queryErr) throw queryErr;
      setRecords((data as StudentAttendance[]) || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal memuat rekap absensi siswa.');
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate]);

  useEffect(() => {
    loadRecap();
  }, [loadRecap]);

  const classOptions = useMemo(() => {
    const set = new Set<string>();
    for (const r of records) {
      if (r.students?.kelas) set.add(r.students.kelas);
    }
    return Array.from(set).sort();
  }, [records]);

  const filteredRecords = useMemo(() => {
    const q = search.trim().toLowerCase();
    return records.filter((r) => {
      if (selectedKelas && r.students?.kelas !== selectedKelas) return false;
      if (statusFilter !== 'Semua' && r.status !== statusFilter) return false;
      if (!q) return true;
      return (
        (r.students?.full_name || '').toLowerCase().includes(q) ||
        (r.students?.nis || '').toLowerCase().includes(q) ||
        (r.students?.kelas || '').toLowerCase().includes(q)
      );
    });
  }, [records, selectedKelas, statusFilter, search]);

  const summary = useMemo(() => {
    const counts = { total: filteredRecords.length, Hadir: 0, Sakit: 0, Izin: 0, Alpa: 0 };
    for (const r of filteredRecords) {
      counts[r.status] += 1;
    }
    const pct = counts.total > 0 ? Math.round((counts.Hadir / counts.total) * 100) : 0;
    return { ...counts, pct };
  }, [filteredRecords]);

  const handleClassFilter = (val: string) => {
    setSelectedKelas(val);
    if (val) {
      navigate(`/app/rekap/siswa/${encodeURIComponent(val)}`, { replace: true });
    } else {
      navigate('/app/rekap/siswa', { replace: true });
    }
  };

  const handleExportCSV = () => {
    const headers = ['Tanggal', 'NIS', 'Nama Siswa', 'Kelas', 'Jurusan', 'Status', 'Catatan', 'Dicatat Oleh'];
    const lines = filteredRecords.map((r) => [
      r.attendance_date,
      r.students?.nis || '',
      `"${(r.students?.full_name || '').replace(/"/g, '""')}"`,
      r.students?.kelas || '',
      r.students?.jurusan || '',
      r.status,
      `"${(r.notes || '').replace(/"/g, '""')}"`,
      `"${(r.recorder?.full_name || '').replace(/"/g, '""')}"`,
    ]);
    const csv = [headers.join(','), ...lines.map((l) => l.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `rekap-absensi-siswa-${startDate}-sd-${endDate}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Filter Toolbar */}
      <div className="bg-white border border-zinc-200 rounded-xl p-5 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          <div>
            <label htmlFor="recap-start" className="block text-xs font-semibold text-zinc-700 mb-1.5">
              Dari Tanggal
            </label>
            <input
              id="recap-start"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-3 py-2 text-sm font-mono bg-zinc-50 border border-zinc-300 rounded-lg focus:outline-none focus:border-red-700"
            />
          </div>

          <div>
            <label htmlFor="recap-end" className="block text-xs font-semibold text-zinc-700 mb-1.5">
              Sampai Tanggal
            </label>
            <input
              id="recap-end"
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full px-3 py-2 text-sm font-mono bg-zinc-50 border border-zinc-300 rounded-lg focus:outline-none focus:border-red-700"
            />
          </div>

          <div>
            <label htmlFor="recap-kelas" className="block text-xs font-semibold text-zinc-700 mb-1.5">
              Kelas
            </label>
            <select
              id="recap-kelas"
              value={selectedKelas}
              onChange={(e) => handleClassFilter(e.target.value)}
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
            <label htmlFor="recap-status" className="block text-xs font-semibold text-zinc-700 mb-1.5">
              Status
            </label>
            <select
              id="recap-status"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as 'Semua' | StudentAttendanceStatus)}
              className="w-full px-3 py-2 text-sm bg-zinc-50 border border-zinc-300 rounded-lg focus:outline-none focus:border-red-700"
            >
              <option value="Semua">Semua Status</option>
              <option value="Hadir">Hadir</option>
              <option value="Sakit">Sakit</option>
              <option value="Izin">Izin</option>
              <option value="Alpa">Alpa</option>
            </select>
          </div>

          <div>
            <label htmlFor="recap-search" className="block text-xs font-semibold text-zinc-700 mb-1.5">
              Cari Siswa / NIS
            </label>
            <div className="relative">
              <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                id="recap-search"
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Nama atau NIS..."
                className="w-full pl-9 pr-3 py-2 text-sm bg-zinc-50 border border-zinc-300 rounded-lg focus:outline-none focus:border-red-700"
              />
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between pt-3 border-t border-zinc-100">
          <p className="text-xs text-zinc-500 tabular-nums">
            Menampilkan {filteredRecords.length} catatan kehadiran siswa
          </p>
          <button
            type="button"
            onClick={handleExportCSV}
            disabled={filteredRecords.length === 0}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-red-700 hover:bg-red-800 disabled:opacity-50 rounded-lg transition-colors whitespace-nowrap"
          >
            <Download className="w-3.5 h-3.5" />
            Unduh CSV
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl border border-red-200 bg-red-50 text-sm text-red-800">
          {error}
        </div>
      )}

      {/* Summary KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
        <div className="bg-white border border-zinc-200 rounded-xl p-4">
          <p className="text-xs text-zinc-500">Kehadiran</p>
          <p className="mt-1 text-xl font-extrabold text-zinc-900 tabular-nums">{summary.pct}%</p>
        </div>
        <div className="bg-white border border-zinc-200 rounded-xl p-4">
          <p className="text-xs text-zinc-500">Hadir</p>
          <p className="mt-1 text-xl font-extrabold text-emerald-700 tabular-nums">{summary.Hadir}</p>
        </div>
        <div className="bg-white border border-zinc-200 rounded-xl p-4">
          <p className="text-xs text-zinc-500">Sakit</p>
          <p className="mt-1 text-xl font-extrabold text-amber-700 tabular-nums">{summary.Sakit}</p>
        </div>
        <div className="bg-white border border-zinc-200 rounded-xl p-4">
          <p className="text-xs text-zinc-500">Izin</p>
          <p className="mt-1 text-xl font-extrabold text-blue-700 tabular-nums">{summary.Izin}</p>
        </div>
        <div className="bg-white border border-zinc-200 rounded-xl p-4 col-span-2 sm:col-span-1">
          <p className="text-xs text-zinc-500">Alpa</p>
          <p className="mt-1 text-xl font-extrabold text-red-700 tabular-nums">{summary.Alpa}</p>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white border border-zinc-200 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-zinc-200 bg-zinc-50 text-xs font-semibold text-zinc-600">
                <th className="py-3 px-4">Tanggal</th>
                <th className="py-3 px-4">NIS</th>
                <th className="py-3 px-4">Nama Siswa</th>
                <th className="py-3 px-4">Kelas · Jurusan</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Catatan</th>
                <th className="py-3 px-4">Dicatat Oleh</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 text-sm">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-10 text-center text-zinc-500">
                    Memuat rekap absensi siswa...
                  </td>
                </tr>
              ) : filteredRecords.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-10 text-center text-zinc-500">
                    Tidak ada catatan absensi siswa pada periode yang dipilih.
                  </td>
                </tr>
              ) : (
                filteredRecords.map((r) => (
                  <tr key={r.id} className="hover:bg-zinc-50/80">
                    <td className="py-3 px-4 font-mono text-xs text-zinc-700 tabular-nums whitespace-nowrap">
                      {r.attendance_date}
                    </td>
                    <td className="py-3 px-4 font-mono text-xs text-zinc-700 tabular-nums whitespace-nowrap">
                      {r.students?.nis || '—'}
                    </td>
                    <td className="py-3 px-4 font-semibold text-zinc-900">
                      {r.students?.full_name || '—'}
                    </td>
                    <td className="py-3 px-4 text-xs text-zinc-600 whitespace-nowrap">
                      {r.students?.kelas || '—'} ·{' '}
                      <span className="font-mono font-semibold">{r.students?.jurusan || ''}</span>
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`text-xs font-semibold ${
                          r.status === 'Hadir'
                            ? 'text-emerald-700'
                            : r.status === 'Sakit'
                              ? 'text-amber-700'
                              : r.status === 'Izin'
                                ? 'text-blue-700'
                                : 'text-red-700'
                        }`}
                      >
                        {r.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-xs text-zinc-600 max-w-[180px] truncate">
                      {r.notes || '—'}
                    </td>
                    <td className="py-3 px-4 text-xs text-zinc-500">
                      {r.recorder?.full_name || '—'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
