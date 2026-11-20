import { useEffect, useState } from 'react';
import { Check, CheckCircle2, Copy, Database, Download, GitBranch, X, XCircle } from 'lucide-react';

interface SchemaModalProps {
  open: boolean;
  onClose: () => void;
}

interface TableStatus {
  name: string;
  ready: boolean;
}

interface DbStatusResponse {
  connected: boolean;
  directDbConfigured?: boolean;
  allReady?: boolean;
  tables: TableStatus[];
}

const RELATION_SUMMARY = [
  {
    table: 'auth.users → public.profiles',
    detail: 'Relasi 1-to-1 (PK/FK id ON DELETE CASCADE). User pertama otomatis mendapat role admin.',
  },
  {
    table: 'public.jurusan → public.classes & public.students',
    detail: 'Master 6 jurusan resmi (TKJ, DKV, AK, BC, MPLB, BD) dalam 3 rumpun bidang.',
  },
  {
    table: 'public.classes → public.students',
    detail: 'Sinkronisasi otomatis via trigger trg_sync_student_class dan relasi wali_kelas_id → profiles.',
  },
  {
    table: 'public.profiles → public.employee_attendance',
    detail: 'Relasi 1-to-many absensi harian karyawan (unique per user_id & attendance_date).',
  },
  {
    table: 'public.students → public.student_attendance ← public.profiles',
    detail: 'Presensi harian siswa berelasi ke data siswa dan guru/admin pencatat (recorded_by).',
  },
];

export function SchemaModal({ open, onClose }: SchemaModalProps) {
  const [sql, setSql] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [dbStatus, setDbStatus] = useState<DbStatusResponse | null>(null);
  const [migrating, setMigrating] = useState(false);
  const [migrateMsg, setMigrateMsg] = useState<string | null>(null);

  const loadStatus = () => {
    fetch('/api/db/status')
      .then((res) => res.json())
      .then((data: DbStatusResponse) => setDbStatus(data))
      .catch(() => setDbStatus(null));
  };

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    setMigrateMsg(null);
    fetch('/api/schema-sql')
      .then((res) => res.text())
      .then((text) => setSql(text))
      .catch(() => setSql('-- Gagal memuat supabase/schema.sql'))
      .finally(() => setLoading(false));

    loadStatus();
  }, [open]);

  if (!open) return null;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(sql);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // ignore clipboard errors
    }
  };

  const handleDownload = () => {
    if (!sql) return;
    const blob = new Blob([sql], { type: 'text/sql;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'smk-prima-unggul-supabase-schema.sql';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDirectMigrate = async () => {
    setMigrating(true);
    setMigrateMsg(null);
    try {
      const res = await fetch('/api/db/migrate', { method: 'POST' });
      const data = await res.json();
      setMigrateMsg(data.message);
      if (res.ok) {
        loadStatus();
      }
    } catch {
      setMigrateMsg('Gagal menjalankan migrasi database.');
    } finally {
      setMigrating(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/60 p-4 backdrop-blur-xs"
      role="dialog"
      aria-modal="true"
      aria-labelledby="schema-modal-title"
    >
      <div className="w-full max-w-4xl bg-white border border-zinc-200 rounded-xl shadow-xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-200">
          <div className="flex items-center gap-2.5">
            <Database className="w-5 h-5 text-red-700" />
            <h2 id="schema-modal-title" className="text-base font-bold text-zinc-900">
              Skema Database Relasional Supabase (supabase/schema.sql)
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-zinc-500 hover:text-zinc-900 rounded-lg hover:bg-zinc-100 transition-colors"
            aria-label="Tutup modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Relational Map + Live Status */}
        <div className="px-6 py-4 bg-zinc-50 border-b border-zinc-200 space-y-4 overflow-y-auto max-h-64">
          <div>
            <p className="text-xs font-bold text-zinc-900 flex items-center gap-1.5 mb-2">
              <GitBranch className="w-3.5 h-3.5 text-red-700" />
              Arsitektur Relasi Tabel Supabase
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {RELATION_SUMMARY.map((rel) => (
                <div key={rel.table} className="bg-white border border-zinc-200 rounded-lg p-2.5">
                  <p className="text-xs font-mono font-semibold text-red-700">{rel.table}</p>
                  <p className="text-[11px] text-zinc-600 mt-0.5 leading-snug">{rel.detail}</p>
                </div>
              ))}
            </div>
          </div>

          {dbStatus && (
            <div className="pt-2 border-t border-zinc-200">
              <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                <p className="text-xs font-bold text-zinc-900">
                  Status Tabel di Supabase:
                </p>
                {dbStatus.directDbConfigured && (
                  <button
                    type="button"
                    onClick={handleDirectMigrate}
                    disabled={migrating}
                    className="px-3 py-1 text-xs font-semibold text-white bg-red-700 hover:bg-red-800 disabled:opacity-50 rounded-md"
                  >
                    {migrating ? 'Menerapkan...' : 'Terapkan Skema Langsung'}
                  </button>
                )}
              </div>

              {migrateMsg && (
                <p className="text-xs text-zinc-800 bg-white border border-zinc-200 rounded-md px-3 py-2 mb-2">
                  {migrateMsg}
                </p>
              )}

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {dbStatus.tables.map((t) => (
                  <div
                    key={t.name}
                    className="flex items-center gap-1.5 text-xs font-mono bg-white border border-zinc-200 rounded-md px-2.5 py-1.5"
                  >
                    {t.ready ? (
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    ) : (
                      <XCircle className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                    )}
                    <span className="truncate text-zinc-800">{t.name}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="flex-1 overflow-auto p-6 bg-zinc-950 text-zinc-100 min-h-[200px]">
          {loading ? (
            <p className="text-sm text-zinc-400 font-mono">Memuat skrip SQL...</p>
          ) : (
            <pre className="text-xs font-mono leading-relaxed whitespace-pre-wrap break-words">
              {sql}
            </pre>
          )}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-4 border-t border-zinc-200 bg-white">
          <p className="text-xs text-zinc-500">
            Jalankan skrip ini di <strong className="text-zinc-800">SQL Editor</strong> Supabase, atau
            set <code className="font-mono">SUPABASE_DB_URL</code> untuk migrasi otomatis.
          </p>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={handleDownload}
              disabled={!sql || loading}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-zinc-700 bg-zinc-100 hover:bg-zinc-200 disabled:opacity-50 rounded-lg transition-colors whitespace-nowrap shrink-0"
            >
              <Download className="w-3.5 h-3.5" />
              Unduh .sql
            </button>
            <button
              type="button"
              onClick={handleCopy}
              disabled={!sql || loading}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-red-700 hover:bg-red-800 disabled:opacity-50 rounded-lg transition-colors whitespace-nowrap shrink-0"
            >
              {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              {copied ? 'Tersalin' : 'Salin SQL'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
