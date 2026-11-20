import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  Calendar,
  CheckCircle2,
  ClipboardCheck,
  Clock,
  GraduationCap,
  UserCheck,
  Users,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import {
  formatDateISO,
  formatIndonesianDate,
  formatTimeShort,
  getSupabaseClient,
} from '../../lib/supabase';
import { ROLE_LABELS, type EmployeeAttendance } from '../../types';

interface DashboardStats {
  totalStudents: number;
  todayStudentPresent: number;
  todayStudentTotalRecorded: number;
  todayEmployeePresent: number;
  totalEmployees: number;
  myMonthlyPresent: number;
}

export default function DashboardView() {
  const { profile, user } = useAuth();
  const [todayMyAttendance, setTodayMyAttendance] = useState<EmployeeAttendance | null>(null);
  const [recentEmployeeLogs, setRecentEmployeeLogs] = useState<EmployeeAttendance[]>([]);
  const [stats, setStats] = useState<DashboardStats>({
    totalStudents: 0,
    todayStudentPresent: 0,
    todayStudentTotalRecorded: 0,
    todayEmployeePresent: 0,
    totalEmployees: 0,
    myMonthlyPresent: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const todayISO = formatDateISO();
  const monthStartISO = `${todayISO.slice(0, 7)}-01`;
  const role = profile?.role || 'tenaga_kependidikan';

  useEffect(() => {
    let active = true;

    async function loadDashboard() {
      if (!user) return;
      setLoading(true);
      setError(null);

      try {
        const client = await getSupabaseClient();
        if (!client) {
          setLoading(false);
          return;
        }

        const { data: myToday, error: myTodayErr } = await client
          .from('employee_attendance')
          .select('*')
          .eq('user_id', user.id)
          .eq('attendance_date', todayISO)
          .maybeSingle();

        if (myTodayErr) throw myTodayErr;

        const { count: myMonthCount } = await client
          .from('employee_attendance')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', user.id)
          .gte('attendance_date', monthStartISO)
          .in('status', ['Hadir', 'Terlambat']);

        let totalStudents = 0;
        let todayStudentPresent = 0;
        let todayStudentTotalRecorded = 0;
        let todayEmployeePresent = 0;
        let totalEmployees = 0;

        if (role === 'admin' || role === 'guru') {
          const { count: stuCount } = await client
            .from('students')
            .select('id', { count: 'exact', head: true });
          totalStudents = stuCount || 0;

          const { data: stuToday } = await client
            .from('student_attendance')
            .select('status')
            .eq('attendance_date', todayISO);

          todayStudentTotalRecorded = stuToday?.length || 0;
          todayStudentPresent = (stuToday || []).filter((r) => r.status === 'Hadir').length;
        }

        if (role === 'admin') {
          const { count: empCount } = await client
            .from('profiles')
            .select('id', { count: 'exact', head: true });
          totalEmployees = empCount || 0;

          const { data: empToday } = await client
            .from('employee_attendance')
            .select('status')
            .eq('attendance_date', todayISO);
          todayEmployeePresent = (empToday || []).filter(
            (r) => r.status === 'Hadir' || r.status === 'Terlambat'
          ).length;

          const { data: logs } = await client
            .from('employee_attendance')
            .select('*, profiles(full_name, email, nip, role, jabatan)')
            .order('attendance_date', { ascending: false })
            .order('created_at', { ascending: false })
            .limit(8);

          if (active) setRecentEmployeeLogs((logs as EmployeeAttendance[]) || []);
        } else {
          const { data: logs } = await client
            .from('employee_attendance')
            .select('*')
            .eq('user_id', user.id)
            .order('attendance_date', { ascending: false })
            .limit(6);

          if (active) setRecentEmployeeLogs((logs as EmployeeAttendance[]) || []);
        }

        if (active) {
          setTodayMyAttendance((myToday as EmployeeAttendance) || null);
          setStats({
            totalStudents,
            todayStudentPresent,
            todayStudentTotalRecorded,
            todayEmployeePresent,
            totalEmployees,
            myMonthlyPresent: myMonthCount || 0,
          });
        }
      } catch (err) {
        if (active) {
          setError(err instanceof Error ? err.message : 'Gagal memuat ringkasan dashboard.');
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    loadDashboard();
    return () => {
      active = false;
    };
  }, [user, role, todayISO, monthStartISO]);

  return (
    <div className="space-y-6">
      {/* Greeting & Date Header */}
      <div className="bg-white border border-zinc-200 rounded-xl p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <p className="text-xs font-semibold text-red-700 flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5" />
            {formatIndonesianDate(todayISO)}
          </p>
          <h2 className="mt-1 text-2xl font-extrabold tracking-tight text-zinc-900">
            Selamat Datang, {profile?.full_name || user?.email}
          </h2>
          <p className="mt-1 text-sm text-zinc-600">
            Peran aktif: <strong className="text-zinc-900">{ROLE_LABELS[role]}</strong>
            {profile?.jabatan ? ` · ${profile.jabatan}` : ''}
          </p>
        </div>

        <Link
          to="/app/absensi-karyawan"
          className="inline-flex items-center justify-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-red-700 hover:bg-red-800 rounded-lg transition-colors whitespace-nowrap shrink-0"
        >
          <UserCheck className="w-4 h-4" />
          {todayMyAttendance ? 'Lihat Absensi Hari Ini' : 'Isi Absensi Karyawan'}
        </Link>
      </div>

      {error && (
        <div className="p-4 rounded-xl border border-red-200 bg-red-50 text-sm text-red-800">
          {error}
        </div>
      )}

      {/* KPI Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-zinc-200 rounded-xl p-5">
          <div className="flex items-center justify-between text-xs font-medium text-zinc-500">
            <span>Status Absen Pribadi</span>
            <Clock className="w-4 h-4 text-red-700" />
          </div>
          <p className="mt-2 text-2xl font-extrabold text-zinc-900">
            {loading ? '...' : todayMyAttendance ? todayMyAttendance.status : 'Belum Absen'}
          </p>
          <p className="mt-1 text-xs text-zinc-500 tabular-nums">
            {todayMyAttendance?.check_in
              ? `Masuk ${formatTimeShort(todayMyAttendance.check_in)} · Pulang ${formatTimeShort(
                  todayMyAttendance.check_out
                )}`
              : 'Silakan catat kehadiran Anda'}
          </p>
        </div>

        <div className="bg-white border border-zinc-200 rounded-xl p-5">
          <div className="flex items-center justify-between text-xs font-medium text-zinc-500">
            <span>Hadir Bulan Ini (Pribadi)</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="mt-2 text-2xl font-extrabold text-zinc-900 tabular-nums">
            {loading ? '...' : `${stats.myMonthlyPresent} Hari`}
          </p>
          <p className="mt-1 text-xs text-zinc-500">Periode bulan berjalan</p>
        </div>

        {(role === 'admin' || role === 'guru') && (
          <>
            <div className="bg-white border border-zinc-200 rounded-xl p-5">
              <div className="flex items-center justify-between text-xs font-medium text-zinc-500">
                <span>Total Siswa Terdaftar</span>
                <GraduationCap className="w-4 h-4 text-red-700" />
              </div>
              <p className="mt-2 text-2xl font-extrabold text-zinc-900 tabular-nums">
                {loading ? '...' : stats.totalStudents}
              </p>
              <p className="mt-1 text-xs text-zinc-500">Seluruh jurusan (TKJ–BD)</p>
            </div>

            <div className="bg-white border border-zinc-200 rounded-xl p-5">
              <div className="flex items-center justify-between text-xs font-medium text-zinc-500">
                <span>Siswa Hadir Hari Ini</span>
                <ClipboardCheck className="w-4 h-4 text-emerald-600" />
              </div>
              <p className="mt-2 text-2xl font-extrabold text-zinc-900 tabular-nums">
                {loading ? '...' : `${stats.todayStudentPresent} / ${stats.todayStudentTotalRecorded}`}
              </p>
              <p className="mt-1 text-xs text-zinc-500">Dari siswa yang sudah diabsen</p>
            </div>
          </>
        )}

        {role === 'admin' && (
          <div className="bg-white border border-zinc-200 rounded-xl p-5 sm:col-span-2 lg:col-span-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-red-50 text-red-700 flex items-center justify-center shrink-0">
                <Users className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-medium text-zinc-500">Ringkasan Karyawan Hari Ini</p>
                <p className="text-base font-bold text-zinc-900 tabular-nums">
                  {stats.todayEmployeePresent} dari {stats.totalEmployees} karyawan telah hadir
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link
                to="/app/rekap/karyawan"
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-zinc-700 bg-zinc-100 hover:bg-zinc-200 rounded-lg transition-colors"
              >
                Rekap Karyawan
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
              <Link
                to="/app/user-management"
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-red-700 bg-red-50 hover:bg-red-100 rounded-lg transition-colors"
              >
                Kelola User
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        )}
      </div>

      {/* Quick Actions & Recent Logs */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-8 bg-white border border-zinc-200 rounded-xl overflow-hidden">
          <div className="px-6 py-4 border-b border-zinc-200 flex items-center justify-between">
            <h3 className="text-base font-bold text-zinc-900">
              {role === 'admin' ? 'Log Absensi Karyawan Terbaru' : 'Riwayat Absensi Pribadi Terbaru'}
            </h3>
            <Link
              to={role === 'admin' ? '/app/rekap/karyawan' : '/app/absensi-karyawan'}
              className="text-xs font-semibold text-red-700 hover:underline"
            >
              Lihat Semua
            </Link>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-zinc-200 bg-zinc-50 text-xs font-semibold text-zinc-600">
                  <th className="py-3 px-4">Tanggal</th>
                  {role === 'admin' && <th className="py-3 px-4">Karyawan</th>}
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Masuk</th>
                  <th className="py-3 px-4">Pulang</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 text-sm">
                {loading ? (
                  <tr>
                    <td colSpan={role === 'admin' ? 5 : 4} className="py-8 text-center text-zinc-500">
                      Memuat data...
                    </td>
                  </tr>
                ) : recentEmployeeLogs.length === 0 ? (
                  <tr>
                    <td colSpan={role === 'admin' ? 5 : 4} className="py-8 text-center text-zinc-500">
                      Belum ada catatan absensi karyawan.
                    </td>
                  </tr>
                ) : (
                  recentEmployeeLogs.map((row) => (
                    <tr key={row.id} className="hover:bg-zinc-50/80">
                      <td className="py-3 px-4 font-mono text-xs text-zinc-700 tabular-nums whitespace-nowrap">
                        {row.attendance_date}
                      </td>
                      {role === 'admin' && (
                        <td className="py-3 px-4 font-medium text-zinc-900">
                          {row.profiles?.full_name || '—'}
                        </td>
                      )}
                      <td className="py-3 px-4">
                        <span
                          className={`text-xs font-semibold ${
                            row.status === 'Hadir'
                              ? 'text-emerald-700'
                              : row.status === 'Terlambat'
                                ? 'text-amber-700'
                                : 'text-red-700'
                          }`}
                        >
                          {row.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-mono text-xs text-zinc-700 tabular-nums">
                        {formatTimeShort(row.check_in)}
                      </td>
                      <td className="py-3 px-4 font-mono text-xs text-zinc-700 tabular-nums">
                        {formatTimeShort(row.check_out)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Shortcut Navigation Panel */}
        <div className="lg:col-span-4 bg-white border border-zinc-200 rounded-xl p-6 flex flex-col justify-between">
          <div>
            <h3 className="text-base font-bold text-zinc-900 mb-1">Akses Cepat Menu</h3>
            <p className="text-xs text-zinc-500 mb-5">
              Menu yang tersedia sesuai peran {ROLE_LABELS[role]}.
            </p>

            <div className="space-y-2.5">
              <Link
                to="/app/absensi-karyawan"
                className="flex items-center justify-between p-3.5 rounded-lg border border-zinc-200 hover:border-red-300 hover:bg-red-50/40 transition-colors"
              >
                <span className="text-sm font-semibold text-zinc-900">Absensi Karyawan Mandiri</span>
                <ArrowRight className="w-4 h-4 text-red-700" />
              </Link>

              {(role === 'admin' || role === 'guru') && (
                <>
                  <Link
                    to="/app/absensi-siswa"
                    className="flex items-center justify-between p-3.5 rounded-lg border border-zinc-200 hover:border-red-300 hover:bg-red-50/40 transition-colors"
                  >
                    <span className="text-sm font-semibold text-zinc-900">Input Absensi Siswa</span>
                    <ArrowRight className="w-4 h-4 text-red-700" />
                  </Link>

                  <Link
                    to="/app/rekap/siswa"
                    className="flex items-center justify-between p-3.5 rounded-lg border border-zinc-200 hover:border-red-300 hover:bg-red-50/40 transition-colors"
                  >
                    <span className="text-sm font-semibold text-zinc-900">Rekap Absensi Siswa</span>
                    <ArrowRight className="w-4 h-4 text-red-700" />
                  </Link>
                </>
              )}

              {role === 'admin' && (
                <>
                  <Link
                    to="/app/data-siswa"
                    className="flex items-center justify-between p-3.5 rounded-lg border border-zinc-200 hover:border-red-300 hover:bg-red-50/40 transition-colors"
                  >
                    <span className="text-sm font-semibold text-zinc-900">Kelola Data Siswa</span>
                    <ArrowRight className="w-4 h-4 text-red-700" />
                  </Link>

                  <Link
                    to="/app/user-management"
                    className="flex items-center justify-between p-3.5 rounded-lg border border-zinc-200 hover:border-red-300 hover:bg-red-50/40 transition-colors"
                  >
                    <span className="text-sm font-semibold text-zinc-900">User Management</span>
                    <ArrowRight className="w-4 h-4 text-red-700" />
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
