import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  AlertCircle,
  CheckCheck,
  CheckCircle2,
  Save,
  Search,
  Users,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { formatDateISO, getSupabaseClient } from '../../lib/supabase';
import type { Student, StudentAttendanceStatus } from '../../types';

const STATUS_CHOICES: StudentAttendanceStatus[] = ['Hadir', 'Sakit', 'Izin', 'Alpa'];

interface DraftAttendance {
  status: StudentAttendanceStatus;
  notes: string;
}

export default function StudentAttendanceView() {
  const { user, profile } = useAuth();
  const { kelas: kelasParam } = useParams<{ kelas?: string }>();
  const navigate = useNavigate();

  const [attendanceDate, setAttendanceDate] = useState(() => formatDateISO());
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedKelas, setSelectedKelas] = useState<string>(
    kelasParam ? decodeURIComponent(kelasParam) : ''
  );
  const [search, setSearch] = useState('');
  const [drafts, setDrafts] = useState<Record<string, DraftAttendance>>({});

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(
    null
  );

  // Sync URL param changes
  useEffect(() => {
    if (kelasParam) {
      setSelectedKelas(decodeURIComponent(kelasParam));
    }
  }, [kelasParam]);

  const loadStudentsAndAttendance = useCallback(async () => {
    setLoading(true);
    setFeedback(null);

    try {
      const client = await getSupabaseClient();
      if (!client) {
        setLoading(false);
        return;
      }

      const { data: studentRows, error: stuErr } = await client
        .from('students')
        .select('*')
        .order('kelas', { ascending: true })
        .order('full_name', { ascending: true });

      if (stuErr) throw stuErr;
      const list = (studentRows as Student[]) || [];
      setStudents(list);

      const availableClasses = Array.from(new Set(list.map((s) => s.kelas))).sort();
      let activeClass = selectedKelas;
      if (!activeClass && availableClasses.length > 0) {
        activeClass = availableClasses[0];
        setSelectedKelas(activeClass);
      }

      const { data: attRows, error: attErr } = await client
        .from('student_attendance')
        .select('student_id, status, notes')
        .eq('attendance_date', attendanceDate);

      if (attErr) throw attErr;

      const attMap = new Map(
        (attRows || []).map((r) => [
          r.student_id as string,
          { status: r.status as StudentAttendanceStatus, notes: (r.notes as string) || '' },
        ])
      );

      const nextDrafts: Record<string, DraftAttendance> = {};
      for (const stu of list) {
        nextDrafts[stu.id] = attMap.get(stu.id) || { status: 'Hadir', notes: '' };
      }
      setDrafts(nextDrafts);
    } catch (err) {
      setFeedback({
        type: 'error',
        message: err instanceof Error ? err.message : 'Gagal memuat daftar siswa.',
      });
    } finally {
      setLoading(false);
    }
  }, [attendanceDate, selectedKelas]);

  useEffect(() => {
    loadStudentsAndAttendance();
  }, [loadStudentsAndAttendance]);

  const classOptions = useMemo(
    () => Array.from(new Set(students.map((s) => s.kelas))).sort(),
    [students]
  );

  const visibleStudents = useMemo(() => {
    const q = search.trim().toLowerCase();
    return students.filter((s) => {
      if (selectedKelas && s.kelas !== selectedKelas) return false;
      if (!q) return true;
      return (
        s.full_name.toLowerCase().includes(q) ||
        s.nis.toLowerCase().includes(q) ||
        s.jurusan.toLowerCase().includes(q)
      );
    });
  }, [students, selectedKelas, search]);

  const handleClassChange = (nextClass: string) => {
    setSelectedKelas(nextClass);
    if (nextClass) {
      navigate(`/app/absensi-siswa/${encodeURIComponent(nextClass)}`, { replace: true });
    } else {
      navigate('/app/absensi-siswa', { replace: true });
    }
  };

  const setStudentStatus = (studentId: string, status: StudentAttendanceStatus) => {
    setDrafts((prev) => ({
      ...prev,
      [studentId]: {
        status,
        notes: prev[studentId]?.notes || '',
      },
    }));
  };

  const setStudentNotes = (studentId: string, notes: string) => {
    setDrafts((prev) => ({
      ...prev,
      [studentId]: {
        status: prev[studentId]?.status || 'Hadir',
        notes,
      },
    }));
  };

  const markAllPresent = () => {
    setDrafts((prev) => {
      const updated = { ...prev };
      for (const stu of visibleStudents) {
        updated[stu.id] = {
          status: 'Hadir',
          notes: updated[stu.id]?.notes || '',
        };
      }
      return updated;
    });
  };

  const handleSaveBatch = async () => {
    if (!user || visibleStudents.length === 0) return;
    setSaving(true);
    setFeedback(null);

    try {
      const client = await getSupabaseClient();
      if (!client) throw new Error('Koneksi Supabase belum tersedia.');

      const rows = visibleStudents.map((stu) => ({
        student_id: stu.id,
        attendance_date: attendanceDate,
        status: drafts[stu.id]?.status || 'Hadir',
        notes: drafts[stu.id]?.notes?.trim() || '',
        recorded_by: user.id,
        updated_at: new Date().toISOString(),
      }));

      const { error } = await client
        .from('student_attendance')
        .upsert(rows, { onConflict: 'student_id,attendance_date' });

      if (error) throw error;

      setFeedback({
        type: 'success',
        message: `Absensi ${visibleStudents.length} siswa kelas ${
          selectedKelas || 'terpilih'
        } pada ${attendanceDate} berhasil disimpan.`,
      });
    } catch (err) {
      setFeedback({
        type: 'error',
        message: err instanceof Error ? err.message : 'Gagal menyimpan absensi siswa.',
      });
    } finally {
      setSaving(false);
    }
  };

  const summaryCounts = useMemo(() => {
    const counts = { Hadir: 0, Sakit: 0, Izin: 0, Alpa: 0 };
    for (const stu of visibleStudents) {
      const st = drafts[stu.id]?.status || 'Hadir';
      counts[st] += 1;
    }
    return counts;
  }, [visibleStudents, drafts]);

  return (
    <div className="space-y-6">
      {/* Filter & Controls Toolbar */}
      <div className="bg-white border border-zinc-200 rounded-xl p-5 flex flex-col lg:flex-row lg:items-end justify-between gap-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 flex-1">
          <div>
            <label htmlFor="stu-att-date" className="block text-xs font-semibold text-zinc-700 mb-1.5">
              Tanggal Absensi
            </label>
            <input
              id="stu-att-date"
              type="date"
              value={attendanceDate}
              onChange={(e) => setAttendanceDate(e.target.value)}
              className="w-full px-3 py-2 text-sm font-mono bg-zinc-50 border border-zinc-300 rounded-lg focus:outline-none focus:border-red-700"
            />
          </div>

          <div>
            <label htmlFor="stu-att-kelas" className="block text-xs font-semibold text-zinc-700 mb-1.5">
              Pilih Kelas
            </label>
            <select
              id="stu-att-kelas"
              value={selectedKelas}
              onChange={(e) => handleClassChange(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-zinc-50 border border-zinc-300 rounded-lg focus:outline-none focus:border-red-700"
            >
              {classOptions.length === 0 ? (
                <option value="">Belum ada kelas</option>
              ) : (
                <>
                  <option value="">Semua Kelas ({students.length})</option>
                  {classOptions.map((k) => (
                    <option key={k} value={k}>
                      {k}
                    </option>
                  ))}
                </>
              )}
            </select>
          </div>

          <div>
            <label htmlFor="stu-att-search" className="block text-xs font-semibold text-zinc-700 mb-1.5">
              Cari Siswa / NIS
            </label>
            <div className="relative">
              <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                id="stu-att-search"
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Nama atau NIS..."
                className="w-full pl-9 pr-3 py-2 text-sm bg-zinc-50 border border-zinc-300 rounded-lg focus:outline-none focus:border-red-700"
              />
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={markAllPresent}
            disabled={visibleStudents.length === 0}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-zinc-700 bg-zinc-100 hover:bg-zinc-200 disabled:opacity-50 rounded-lg transition-colors whitespace-nowrap"
          >
            <CheckCheck className="w-4 h-4" />
            Tandai Semua Hadir
          </button>

          <button
            type="button"
            onClick={handleSaveBatch}
            disabled={saving || visibleStudents.length === 0}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-red-700 hover:bg-red-800 disabled:opacity-50 rounded-lg transition-colors whitespace-nowrap cursor-pointer"
          >
            <Save className="w-4 h-4" />
            {saving ? 'Menyimpan...' : 'Simpan Absensi'}
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

      {/* Live Summary Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white border border-zinc-200 rounded-xl p-4">
          <p className="text-xs text-zinc-500">Hadir</p>
          <p className="mt-1 text-xl font-extrabold text-emerald-700 tabular-nums">
            {summaryCounts.Hadir}
          </p>
        </div>
        <div className="bg-white border border-zinc-200 rounded-xl p-4">
          <p className="text-xs text-zinc-500">Sakit</p>
          <p className="mt-1 text-xl font-extrabold text-amber-700 tabular-nums">
            {summaryCounts.Sakit}
          </p>
        </div>
        <div className="bg-white border border-zinc-200 rounded-xl p-4">
          <p className="text-xs text-zinc-500">Izin</p>
          <p className="mt-1 text-xl font-extrabold text-blue-700 tabular-nums">
            {summaryCounts.Izin}
          </p>
        </div>
        <div className="bg-white border border-zinc-200 rounded-xl p-4">
          <p className="text-xs text-zinc-500">Alpa</p>
          <p className="mt-1 text-xl font-extrabold text-red-700 tabular-nums">
            {summaryCounts.Alpa}
          </p>
        </div>
      </div>

      {/* Attendance Table */}
      <div className="bg-white border border-zinc-200 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-zinc-200 bg-zinc-50 text-xs font-semibold text-zinc-600">
                <th className="py-3 px-4 w-12">No</th>
                <th className="py-3 px-4">NIS</th>
                <th className="py-3 px-4">Nama Siswa</th>
                <th className="py-3 px-4">Kelas · Jurusan</th>
                <th className="py-3 px-4">Status Kehadiran</th>
                <th className="py-3 px-4">Catatan</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 text-sm">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-zinc-500">
                    Memuat daftar siswa...
                  </td>
                </tr>
              ) : visibleStudents.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center">
                    <Users className="w-8 h-8 text-zinc-300 mx-auto mb-2" />
                    <p className="text-sm font-semibold text-zinc-800">
                      Belum ada data siswa untuk ditampilkan
                    </p>
                    <p className="text-xs text-zinc-500 mt-1">
                      {profile?.role === 'admin'
                        ? 'Tambahkan siswa terlebih dahulu pada menu Data Siswa.'
                        : 'Hubungi Admin untuk menambahkan data siswa pada kelas ini.'}
                    </p>
                    {profile?.role === 'admin' && (
                      <Link
                        to="/app/data-siswa"
                        className="mt-4 inline-flex items-center px-4 py-2 text-xs font-semibold text-white bg-red-700 hover:bg-red-800 rounded-lg"
                      >
                        Kelola Data Siswa
                      </Link>
                    )}
                  </td>
                </tr>
              ) : (
                visibleStudents.map((stu, idx) => {
                  const currentStatus = drafts[stu.id]?.status || 'Hadir';
                  return (
                    <tr key={stu.id} className="hover:bg-zinc-50/70">
                      <td className="py-3 px-4 font-mono text-xs text-zinc-500 tabular-nums">
                        {idx + 1}
                      </td>
                      <td className="py-3 px-4 font-mono text-xs text-zinc-800 tabular-nums whitespace-nowrap">
                        {stu.nis}
                      </td>
                      <td className="py-3 px-4 font-semibold text-zinc-900">{stu.full_name}</td>
                      <td className="py-3 px-4 text-xs text-zinc-600 whitespace-nowrap">
                        {stu.kelas} · <span className="font-mono font-semibold">{stu.jurusan}</span>
                      </td>
                      <td className="py-3 px-4">
                        <div className="inline-flex items-center gap-1 p-0.5 bg-zinc-100 rounded-lg">
                          {STATUS_CHOICES.map((choice) => {
                            const active = currentStatus === choice;
                            let activeStyle = 'bg-red-700 text-white';
                            if (choice === 'Hadir') activeStyle = 'bg-emerald-600 text-white';
                            else if (choice === 'Sakit') activeStyle = 'bg-amber-600 text-white';
                            else if (choice === 'Izin') activeStyle = 'bg-blue-600 text-white';

                            return (
                              <button
                                key={choice}
                                type="button"
                                onClick={() => setStudentStatus(stu.id, choice)}
                                className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-colors whitespace-nowrap ${
                                  active
                                    ? activeStyle
                                    : 'text-zinc-600 hover:text-zinc-900'
                                }`}
                              >
                                {choice}
                              </button>
                            );
                          })}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <input
                          type="text"
                          value={drafts[stu.id]?.notes || ''}
                          onChange={(e) => setStudentNotes(stu.id, e.target.value)}
                          placeholder="Keterangan..."
                          className="w-full min-w-[140px] px-2.5 py-1 text-xs bg-white border border-zinc-200 rounded-md focus:outline-none focus:border-red-700"
                        />
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
