import { useCallback, useEffect, useMemo, useState } from 'react';
import { Download, Search } from 'lucide-react';
import { formatDateISO, formatTimeShort, getSupabaseClient } from '../../lib/supabase';
import {
  ROLE_LABELS,
  type EmployeeAttendance,
  type EmployeeAttendanceStatus,
  type UserRole,
} from '../../types';

export default function EmployeeRecapView() {
  const today = formatDateISO();
  const monthStart = `${today.slice(0, 7)}-01`;

  const [startDate, setStartDate] = useState(monthStart);
  const [endDate, setEndDate] = useState(today);
  const [roleFilter, setRoleFilter] = useState<'Semua' | UserRole>('Semua');
  const [statusFilter, setStatusFilter] = useState<'Semua' | EmployeeAttendanceStatus>('Semua');
  const [search, setSearch] = useState('');

  const [records, setRecords] = useState<EmployeeAttendance[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadRecap = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const client = await getSupabaseClient();
      if (!client) return;

      const { data, error: queryErr } = await client
        .from('employee_attendance')
        .select('*, profiles(full_name, email, nip, role, jabatan)')
        .gte('attendance_date', startDate)
        .lte('attendance_date', endDate)
        .order('attendance_date', { ascending: false })
        .order('created_at', { ascending: false });

      if (queryErr) throw queryErr;
      setRecords((data as EmployeeAttendance[]) || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal memuat rekap absensi karyawan.');
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate]);

  useEffect(() => {
    loadRecap();
  }, [loadRecap]);

  const filteredRecords = useMemo(() => {
    const q = search.trim().toLowerCase();
    return records.filter((r) => {
      if (roleFilter !== 'Semua' && r.profiles?.role !== roleFilter) return false;
      if (statusFilter !== 'Semua' && r.status !== statusFilter) return false;
      if (!q) return true;
      return (
        (r.profiles?.full_name || '').toLowerCase().includes(q) ||
        (r.profiles?.nip || '').toLowerCase().includes(q) ||
        (r.profiles?.email || '').toLowerCase().includes(q)
      );
    });
  }, [records, roleFilter, statusFilter, search]);

  const summary = useMemo(() => {
    const counts = { total: filteredRecords.length, Hadir: 0, Terlambat: 0, Izin: 0, Sakit: 0 };
    for (const r of filteredRecords) {
      counts[r.status] += 1;
    }
    return counts;
  }, [filteredRecords]);

  const handleExportCSV = () => {
    const headers = ['Tanggal', 'NIP', 'Nama Karyawan', 'Peran', 'Status', 'Jam Masuk', 'Jam Pulang', 'Catatan'];
    const lines = filteredRecords.map((r) => [
      r.attendance_date,
      r.profiles?.nip || '',
      `"${(r.profiles?.full_name || '').replace(/"/g, '""')}"`,
      r.profiles?.role ? ROLE_LABELS[r.profiles.role] : '',
      r.status,
      formatTimeShort(r.check_in),
      formatTimeShort(r.check_out),
      `"${(r.notes || '').replace(/"/g, '""')}"`,
    ]);
    const csv = [headers.join(','), ...lines.map((l) => l.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `rekap-absensi-karyawan-${startDate}-sd-${endDate}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div className="bg-white border border-zinc-200 rounded-xl p-5 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          <div>
            <label htmlFor="emp-recap-start" className="block text-xs font-semibold text-zinc-700 mb-1.5">
              Dari Tanggal
            </label>
            <input
              id="emp-recap-start"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-3 py-2 text-sm font-mono bg-zinc-50 border border-zinc-300 rounded-lg focus:outline-none focus:border-red-700"
            />
          </div>

          <div>
            <label htmlFor="emp-recap-end" className="block text-xs font-semibold text-zinc-700 mb-1.5">
              Sampai Tanggal
            </label>
            <input
              id="emp-recap-end"
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full px-3 py-2 text-sm font-mono bg-zinc-50 border border-zinc-300 rounded-lg focus:outline-none focus:border-red-700"
            />
          </div>

          <div>
            <label htmlFor="emp-recap-role" className="block text-xs font-semibold text-zinc-700 mb-1.5">
              Peran Karyawan
            </label>
            <select
              id="emp-recap-role"
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value as 'Semua' | UserRole)}
              className="w-full px-3 py-2 text-sm bg-zinc-50 border border-zinc-300 rounded-lg focus:outline-none focus:border-red-700"
            >
              <option value="Semua">Semua Peran</option>
              <option value="admin">Admin</option>
              <option value="guru">Guru</option>
              <option value="tenaga_kependidikan">Tenaga Kependidikan</option>
            </select>
          </div>

          <div>
            <label htmlFor="emp-recap-status" className="block text-xs font-semibold text-zinc-700 mb-1.5">
              Status
            </label>
            <select
              id="emp-recap-status"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as 'Semua' | EmployeeAttendanceStatus)}
              className="w-full px-3 py-2 text-sm bg-zinc-50 border border-zinc-300 rounded-lg focus:outline-none focus:border-red-700"
            >
              <option value="Semua">Semua Status</option>
              <option value="Hadir">Hadir</option>
              <option value="Terlambat">Terlambat</option>
              <option value="Izin">Izin</option>
              <option value="Sakit">Sakit</option>
            </select>
          </div>

          <div>
            <label htmlFor="emp-recap-search" className="block text-xs font-semibold text-zinc-700 mb-1.5">
              Cari Karyawan / NIP
            </label>
            <div className="relative">
              <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                id="emp-recap-search"
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Nama atau NIP..."
                className="w-full pl-9 pr-3 py-2 text-sm bg-zinc-50 border border-zinc-300 rounded-lg focus:outline-none focus:border-red-700"
              />
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between pt-3 border-t border-zinc-100">
          <p className="text-xs text-zinc-500 tabular-nums">
            Menampilkan {filteredRecords.length} catatan kehadiran karyawan
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
          <p className="text-xs text-zinc-500">Total Log</p>
          <p className="mt-1 text-xl font-extrabold text-zinc-900 tabular-nums">{summary.total}</p>
        </div>
        <div className="bg-white border border-zinc-200 rounded-xl p-4">
          <p className="text-xs text-zinc-500">Hadir Tepat Waktu</p>
          <p className="mt-1 text-xl font-extrabold text-emerald-700 tabular-nums">{summary.Hadir}</p>
        </div>
        <div className="bg-white border border-zinc-200 rounded-xl p-4">
          <p className="text-xs text-zinc-500">Terlambat</p>
          <p className="mt-1 text-xl font-extrabold text-amber-700 tabular-nums">{summary.Terlambat}</p>
        </div>
        <div className="bg-white border border-zinc-200 rounded-xl p-4">
          <p className="text-xs text-zinc-500">Izin</p>
          <p className="mt-1 text-xl font-extrabold text-blue-700 tabular-nums">{summary.Izin}</p>
        </div>
        <div className="bg-white border border-zinc-200 rounded-xl p-4 col-span-2 sm:col-span-1">
          <p className="text-xs text-zinc-500">Sakit</p>
          <p className="mt-1 text-xl font-extrabold text-red-700 tabular-nums">{summary.Sakit}</p>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white border border-zinc-200 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-zinc-200 bg-zinc-50 text-xs font-semibold text-zinc-600">
                <th className="py-3 px-4">Tanggal</th>
                <th className="py-3 px-4">Nama Karyawan</th>
                <th className="py-3 px-4">Peran</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Masuk</th>
                <th className="py-3 px-4">Pulang</th>
                <th className="py-3 px-4">Catatan</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 text-sm">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-10 text-center text-zinc-500">
                    Memuat rekap absensi karyawan...
                  </td>
                </tr>
              ) : filteredRecords.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-10 text-center text-zinc-500">
                    Tidak ada catatan absensi karyawan pada periode yang dipilih.
                  </td>
                </tr>
              ) : (
                filteredRecords.map((r) => (
                  <tr key={r.id} className="hover:bg-zinc-50/80">
                    <td className="py-3 px-4 font-mono text-xs text-zinc-700 tabular-nums whitespace-nowrap">
                      {r.attendance_date}
                    </td>
                    <td className="py-3 px-4">
                      <p className="font-semibold text-zinc-900">{r.profiles?.full_name || '—'}</p>
                      <p className="text-xs font-mono text-zinc-500">
                        {r.profiles?.nip ? `NIP ${r.profiles.nip}` : r.profiles?.email}
                      </p>
                    </td>
                    <td className="py-3 px-4 text-xs text-zinc-600 whitespace-nowrap">
                      {r.profiles?.role ? ROLE_LABELS[r.profiles.role] : '—'}
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`text-xs font-semibold ${
                          r.status === 'Hadir'
                            ? 'text-emerald-700'
                            : r.status === 'Terlambat'
                              ? 'text-amber-700'
                              : r.status === 'Izin'
                                ? 'text-blue-700'
                                : 'text-red-700'
                        }`}
                      >
                        {r.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-mono text-xs text-zinc-700 tabular-nums">
                      {formatTimeShort(r.check_in)}
                    </td>
                    <td className="py-3 px-4 font-mono text-xs text-zinc-700 tabular-nums">
                      {formatTimeShort(r.check_out)}
                    </td>
                    <td className="py-3 px-4 text-xs text-zinc-600 max-w-[200px] truncate">
                      {r.notes || '—'}
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
