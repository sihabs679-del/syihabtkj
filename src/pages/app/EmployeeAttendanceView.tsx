import React, { useCallback, useEffect, useState } from 'react';
import { CheckCircle2, Clock, LogIn, LogOut as LogOutIcon, AlertCircle } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import {
  formatDateISO,
  formatIndonesianDate,
  formatTimeShort,
  getSupabaseClient,
} from '../../lib/supabase';
import {
  ROLE_LABELS,
  type EmployeeAttendance,
  type EmployeeAttendanceStatus,
} from '../../types';

const STATUS_OPTIONS: EmployeeAttendanceStatus[] = ['Hadir', 'Izin', 'Sakit'];

export default function EmployeeAttendanceView() {
  const { user, profile } = useAuth();
  const [now, setNow] = useState(() => new Date());
  const [selectedMonth, setSelectedMonth] = useState(() => formatDateISO().slice(0, 7));

  const [todayRecord, setTodayRecord] = useState<EmployeeAttendance | null>(null);
  const [history, setHistory] = useState<EmployeeAttendance[]>([]);
  const [statusInput, setStatusInput] = useState<EmployeeAttendanceStatus>('Hadir');
  const [notesInput, setNotesInput] = useState('');

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(
    null
  );

  const todayISO = formatDateISO();

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const loadData = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const client = await getSupabaseClient();
      if (!client) return;

      const { data: todayRow, error: todayErr } = await client
        .from('employee_attendance')
        .select('*')
        .eq('user_id', user.id)
        .eq('attendance_date', todayISO)
        .maybeSingle();

      if (todayErr) throw todayErr;
      setTodayRecord((todayRow as EmployeeAttendance) || null);

      const monthStart = `${selectedMonth}-01`;
      const [yStr, mStr] = selectedMonth.split('-');
      const lastDay = new Date(Number(yStr), Number(mStr), 0).getDate();
      const monthEnd = `${selectedMonth}-${String(lastDay).padStart(2, '0')}`;

      const { data: histRows, error: histErr } = await client
        .from('employee_attendance')
        .select('*')
        .eq('user_id', user.id)
        .gte('attendance_date', monthStart)
        .lte('attendance_date', monthEnd)
        .order('attendance_date', { ascending: false });

      if (histErr) throw histErr;
      setHistory((histRows as EmployeeAttendance[]) || []);
    } catch (err) {
      setFeedback({
        type: 'error',
        message: err instanceof Error ? err.message : 'Gagal memuat riwayat absensi.',
      });
    } finally {
      setLoading(false);
    }
  }, [user, todayISO, selectedMonth]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleCheckIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setFeedback(null);
    setSubmitting(true);

    try {
      const client = await getSupabaseClient();
      if (!client) throw new Error('Koneksi Supabase belum siap.');

      const nowTime = new Date();
      // Mark Terlambat if checking in Hadir after 07:30 local time
      let finalStatus: EmployeeAttendanceStatus = statusInput;
      if (statusInput === 'Hadir') {
        const minutesSinceMidnight = nowTime.getHours() * 60 + nowTime.getMinutes();
        if (minutesSinceMidnight > 7 * 60 + 30) {
          finalStatus = 'Terlambat';
        }
      }

      const payload = {
        user_id: user.id,
        attendance_date: todayISO,
        status: finalStatus,
        check_in: statusInput === 'Hadir' ? nowTime.toISOString() : null,
        notes: notesInput.trim(),
      };

      const { data, error } = await client
        .from('employee_attendance')
        .upsert(payload, { onConflict: 'user_id,attendance_date' })
        .select('*')
        .single();

      if (error) throw error;
      setTodayRecord(data as EmployeeAttendance);
      setNotesInput('');
      setFeedback({
        type: 'success',
        message:
          finalStatus === 'Terlambat'
            ? 'Absensi masuk berhasil dicatat dengan status Terlambat (lewat 07:30).'
            : `Absensi hari ini berhasil dicatat (${finalStatus}).`,
      });
      await loadData();
    } catch (err) {
      setFeedback({
        type: 'error',
        message: err instanceof Error ? err.message : 'Gagal mencatat absensi.',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleCheckOut = async () => {
    if (!user || !todayRecord) return;
    setFeedback(null);
    setSubmitting(true);

    try {
      const client = await getSupabaseClient();
      if (!client) throw new Error('Koneksi Supabase belum siap.');

      const { data, error } = await client
        .from('employee_attendance')
        .update({
          check_out: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', todayRecord.id)
        .select('*')
        .single();

      if (error) throw error;
      setTodayRecord(data as EmployeeAttendance);
      setFeedback({
        type: 'success',
        message: 'Absen pulang berhasil dicatat.',
      });
      await loadData();
    } catch (err) {
      setFeedback({
        type: 'error',
        message: err instanceof Error ? err.message : 'Gagal mencatat absen pulang.',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const clockDisplay = new Intl.DateTimeFormat('id-ID', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).format(now);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Self Check-In / Check-Out Panel */}
        <div className="lg:col-span-5 bg-white border border-zinc-200 rounded-xl p-6">
          <div className="flex items-start justify-between gap-4 pb-5 border-b border-zinc-200">
            <div>
              <p className="text-xs font-semibold text-red-700">Absensi Mandiri Karyawan</p>
              <h2 className="mt-1 text-xl font-extrabold text-zinc-900">
                {profile?.full_name || user?.email}
              </h2>
              <p className="text-xs text-zinc-500 mt-0.5">
                {ROLE_LABELS[profile?.role || 'tenaga_kependidikan']}
                {profile?.nip ? ` · NIP ${profile.nip}` : ''}
              </p>
            </div>
            <div className="text-right shrink-0">
              <p className="font-mono text-2xl font-bold text-zinc-900 tabular-nums">
                {clockDisplay}
              </p>
              <p className="text-xs text-zinc-500">{formatIndonesianDate(todayISO)}</p>
            </div>
          </div>

          {feedback && (
            <div
              role="status"
              className={`mt-4 p-3.5 rounded-lg border text-xs flex items-start gap-2 ${
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

          {loading ? (
            <div className="py-10 text-center text-sm text-zinc-500">Memeriksa status hari ini...</div>
          ) : todayRecord ? (
            <div className="mt-5 space-y-4">
              <div className="p-4 rounded-lg bg-zinc-50 border border-zinc-200 space-y-2.5">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-zinc-600">Status Hari Ini</span>
                  <span className="font-bold text-red-700">{todayRecord.status}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-zinc-600">Jam Masuk</span>
                  <span className="font-mono font-semibold text-zinc-900 tabular-nums">
                    {formatTimeShort(todayRecord.check_in)}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-zinc-600">Jam Pulang</span>
                  <span className="font-mono font-semibold text-zinc-900 tabular-nums">
                    {formatTimeShort(todayRecord.check_out)}
                  </span>
                </div>
                {todayRecord.notes && (
                  <div className="pt-2 border-t border-zinc-200 text-xs text-zinc-600">
                    Catatan: {todayRecord.notes}
                  </div>
                )}
              </div>

              {(todayRecord.status === 'Hadir' || todayRecord.status === 'Terlambat') &&
                !todayRecord.check_out && (
                  <button
                    type="button"
                    onClick={handleCheckOut}
                    disabled={submitting}
                    className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold text-white bg-zinc-900 hover:bg-zinc-800 disabled:opacity-50 rounded-lg transition-colors cursor-pointer"
                  >
                    <LogOutIcon className="w-4 h-4" />
                    {submitting ? 'Menyimpan...' : 'Catat Absen Pulang'}
                  </button>
                )}

              {todayRecord.check_out && (
                <p className="text-xs text-center text-emerald-700 font-medium">
                  Absensi masuk dan pulang hari ini sudah lengkap.
                </p>
              )}
            </div>
          ) : (
            <form onSubmit={handleCheckIn} className="mt-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-700 mb-2">
                  Pilih Status Kehadiran
                </label>
                <div className="grid grid-cols-3 gap-1.5 p-1 bg-zinc-100 rounded-lg">
                  {STATUS_OPTIONS.map((opt) => (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => setStatusInput(opt)}
                      className={`py-2 px-3 text-xs font-semibold rounded-md transition-colors ${
                        statusInput === opt
                          ? 'bg-red-700 text-white shadow-xs'
                          : 'text-zinc-700 hover:text-zinc-900'
                      }`}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
                <p className="mt-1.5 text-[11px] text-zinc-500">
                  Batas jam masuk tepat waktu: 07:30 WIB.
                </p>
              </div>

              <div>
                <label htmlFor="emp-notes" className="block text-xs font-semibold text-zinc-700 mb-1.5">
                  Keterangan <span className="font-normal text-zinc-500">(Opsional)</span>
                </label>
                <textarea
                  id="emp-notes"
                  rows={2}
                  value={notesInput}
                  onChange={(e) => setNotesInput(e.target.value)}
                  placeholder="Tambahkan keterangan izin/sakit atau catatan tugas..."
                  className="w-full px-3 py-2 text-sm bg-white border border-zinc-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-600/20 focus:border-red-700"
                />
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold text-white bg-red-700 hover:bg-red-800 disabled:opacity-50 rounded-lg transition-colors cursor-pointer"
              >
                <LogIn className="w-4 h-4" />
                {submitting ? 'Menyimpan...' : 'Catat Kehadiran Sekarang'}
              </button>
            </form>
          )}
        </div>

        {/* Personal History Table */}
        <div className="lg:col-span-7 bg-white border border-zinc-200 rounded-xl overflow-hidden flex flex-col">
          <div className="px-6 py-4 border-b border-zinc-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-bold text-zinc-900">Riwayat Kehadiran Pribadi</h3>
              <p className="text-xs text-zinc-500">Catatan absen masuk, pulang, dan izin bulanan.</p>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-zinc-400" />
              <input
                type="month"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                aria-label="Filter bulan"
                className="px-3 py-1.5 text-xs font-mono bg-zinc-50 border border-zinc-300 rounded-lg focus:outline-none focus:border-red-700"
              />
            </div>
          </div>

          <div className="overflow-x-auto flex-1">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-zinc-200 bg-zinc-50 text-xs font-semibold text-zinc-600">
                  <th className="py-3 px-4">Tanggal</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Masuk</th>
                  <th className="py-3 px-4">Pulang</th>
                  <th className="py-3 px-4">Keterangan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 text-sm">
                {loading ? (
                  <tr>
                    <td colSpan={5} className="py-10 text-center text-zinc-500">
                      Memuat riwayat...
                    </td>
                  </tr>
                ) : history.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-10 text-center text-zinc-500">
                      Tidak ada riwayat absensi pada bulan {selectedMonth}.
                    </td>
                  </tr>
                ) : (
                  history.map((item) => (
                    <tr key={item.id} className="hover:bg-zinc-50/80">
                      <td className="py-3 px-4 font-mono text-xs text-zinc-800 tabular-nums whitespace-nowrap">
                        {item.attendance_date}
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`text-xs font-semibold ${
                            item.status === 'Hadir'
                              ? 'text-emerald-700'
                              : item.status === 'Terlambat'
                                ? 'text-amber-700'
                                : 'text-red-700'
                          }`}
                        >
                          {item.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-mono text-xs text-zinc-700 tabular-nums">
                        {formatTimeShort(item.check_in)}
                      </td>
                      <td className="py-3 px-4 font-mono text-xs text-zinc-700 tabular-nums">
                        {formatTimeShort(item.check_out)}
                      </td>
                      <td className="py-3 px-4 text-xs text-zinc-600 max-w-[200px] truncate">
                        {item.notes || '—'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
