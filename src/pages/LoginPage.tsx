import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  Database,
  Eye,
  EyeOff,
  Lock,
  LogIn,
  Mail,
  UserPlus,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { ImageWithFallback } from '../components/ImageWithFallback';
import { SchemaModal } from '../components/SchemaModal';

export default function LoginPage() {
  const navigate = useNavigate();
  const { user, config, loading, authError, signIn, signUp } = useAuth();

  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [nip, setNip] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [hasUsers, setHasUsers] = useState<boolean | null>(null);
  const [schemaOpen, setSchemaOpen] = useState(false);

  useEffect(() => {
    if (!loading && user) {
      navigate('/app', { replace: true });
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    fetch('/api/auth/first-user-status')
      .then(async (r) => {
        const ct = r.headers.get('content-type') || '';
        if (!r.ok || !ct.includes('application/json')) return null;
        return r.json();
      })
      .then((d) => {
        if (d && typeof d.hasUsers === 'boolean') {
          setHasUsers(d.hasUsers);
          if (!d.hasUsers) {
            setMode('register');
          }
        }
      })
      .catch(() => {});
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setSuccessMsg(null);

    if (!email.trim() || !password) {
      setFormError('Email dan password wajib diisi.');
      return;
    }

    if (mode === 'register') {
      if (!fullName.trim()) {
        setFormError('Nama lengkap wajib diisi untuk pendaftaran.');
        return;
      }
      if (password.length < 6) {
        setFormError('Password minimal 6 karakter.');
        return;
      }
    }

    setSubmitting(true);
    try {
      if (mode === 'login') {
        const { error } = await signIn(email, password);
        if (error) {
          setFormError(error);
        } else {
          navigate('/app', { replace: true });
        }
      } else {
        const { error, needsEmailConfirmation } = await signUp({
          email,
          password,
          fullName,
          nip,
        });
        if (error) {
          setFormError(error);
        } else if (needsEmailConfirmation) {
          setSuccessMsg(
            'Pendaftaran berhasil. Silakan periksa kotak masuk email Anda untuk konfirmasi sebelum masuk.'
          );
          setMode('login');
        } else {
          navigate('/app', { replace: true });
        }
      }
    } finally {
      setSubmitting(false);
    }
  };

  const isSupabaseMissing = config !== null && !config.configured;

  return (
    <div className="min-h-screen bg-zinc-50 flex flex-col lg:flex-row">
      {/* Left Visual Column */}
      <div className="relative lg:w-1/2 min-h-[260px] lg:min-h-screen bg-zinc-900 overflow-hidden flex flex-col justify-between p-8 lg:p-12">
        <ImageWithFallback
          src="/src/assets/images/hero_smk_campus_1795061356456.jpg"
          alt="Kampus SMK Prima Unggul"
          className="absolute inset-0 w-full h-full object-cover"
          fallbackLabel="SMK Prima Unggul"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-red-950/70 to-black/50" />

        <div className="relative z-10 flex items-center justify-between">
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-sm font-semibold text-white hover:text-red-200 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Kembali ke Profil Sekolah
          </Link>
        </div>

        <div className="relative z-10 max-w-lg mt-12 lg:mt-0">
          <p className="text-xs font-semibold text-red-300 tracking-wide mb-2">
            Portal Internal · SMK Prima Unggul
          </p>
          <h1 className="text-2xl lg:text-4xl font-extrabold text-white tracking-tight leading-tight text-balance">
            Sistem Absensi Siswa &amp; Karyawan Terintegrasi
          </h1>
          <p className="mt-3 text-sm lg:text-base text-zinc-200 leading-relaxed">
            Satu portal untuk pencatatan kehadiran harian Admin, Guru, dan Tenaga Kependidikan,
            serta presensi siswa seluruh kompetensi keahlian (TKJ, DKV, AK, BC, MPLB, BD).
          </p>
        </div>
      </div>

      {/* Right Auth Form Column */}
      <div className="flex-1 flex flex-col justify-center px-6 py-12 sm:px-12 lg:px-16 bg-white">
        <div className="w-full max-w-md mx-auto">
          <div className="mb-8">
            <p className="text-sm font-bold text-red-700">SMK Prima Unggul</p>
            <h2 className="mt-1 text-2xl lg:text-3xl font-extrabold tracking-tight text-zinc-900">
              {mode === 'login' ? 'Masuk ke Portal Aplikasi' : 'Buat Akun Pertama / Daftar'}
            </h2>
            <p className="mt-2 text-sm text-zinc-600">
              {mode === 'login'
                ? 'Gunakan email dan password yang terdaftar pada Supabase Authentication.'
                : 'Pengguna pertama yang dibuat pada sistem otomatis mendapatkan hak akses Admin.'}
            </p>
          </div>

          {/* Segmented Mode Switcher */}
          <div className="grid grid-cols-2 gap-1 p-1 bg-zinc-100 rounded-lg mb-6">
            <button
              type="button"
              onClick={() => {
                setMode('login');
                setFormError(null);
              }}
              className={`py-2 px-3 text-xs font-semibold rounded-md transition-colors whitespace-nowrap ${
                mode === 'login'
                  ? 'bg-white text-zinc-900 shadow-xs'
                  : 'text-zinc-600 hover:text-zinc-900'
              }`}
            >
              Masuk (Sign In)
            </button>
            <button
              type="button"
              onClick={() => {
                setMode('register');
                setFormError(null);
              }}
              className={`py-2 px-3 text-xs font-semibold rounded-md transition-colors whitespace-nowrap ${
                mode === 'register'
                  ? 'bg-white text-zinc-900 shadow-xs'
                  : 'text-zinc-600 hover:text-zinc-900'
              }`}
            >
              Daftar Akun Baru
            </button>
          </div>

          {/* First-user admin banner */}
          {hasUsers === false && (
            <div className="mb-6 p-4 rounded-lg border border-red-200 bg-red-50 text-sm text-red-900">
              <p className="font-semibold">Aktivasi Admin Pertama</p>
              <p className="mt-1 text-xs text-red-800 leading-relaxed">
                Belum ada akun terdaftar di Supabase Authentication. Akun pertama yang Anda
                daftarkan sekarang akan otomatis menjadi <strong>Admin</strong>.
              </p>
            </div>
          )}

          {/* Supabase not configured notice */}
          {isSupabaseMissing && (
            <div className="mb-6 p-4 rounded-lg border border-amber-300 bg-amber-50 text-sm text-amber-950">
              <div className="flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold">Konfigurasi Supabase Diperlukan</p>
                  <p className="mt-1 text-xs text-amber-900 leading-relaxed">
                    Tambahkan environment variable berikut pada Vercel Environment Variables atau
                    panel Secrets AI Studio, lalu redeploy/restart:
                  </p>
                  <ul className="mt-2 space-y-1 text-xs font-mono text-amber-900">
                    <li>SUPABASE_URL &amp; VITE_SUPABASE_URL</li>
                    <li>SUPABASE_ANON_KEY &amp; VITE_SUPABASE_ANON_KEY</li>
                    <li>SUPABASE_SERVICE_ROLE_KEY</li>
                  </ul>
                  <button
                    type="button"
                    onClick={() => setSchemaOpen(true)}
                    className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-red-700 hover:text-red-800 underline underline-offset-2"
                  >
                    <Database className="w-3.5 h-3.5" />
                    Lihat &amp; Salin Skema SQL Supabase
                  </button>
                </div>
              </div>
            </div>
          )}

          {(formError || authError) && (
            <div
              role="alert"
              className="mb-6 p-3.5 rounded-lg border border-red-200 bg-red-50 flex items-start gap-2.5 text-sm text-red-800"
            >
              <AlertCircle className="w-4 h-4 text-red-700 shrink-0 mt-0.5" />
              <span>{formError || authError}</span>
            </div>
          )}

          {successMsg && (
            <div
              role="status"
              className="mb-6 p-3.5 rounded-lg border border-emerald-200 bg-emerald-50 flex items-start gap-2.5 text-sm text-emerald-800"
            >
              <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
              <span>{successMsg}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'register' && (
              <>
                <div>
                  <label htmlFor="fullName" className="block text-sm font-semibold text-zinc-800 mb-1.5">
                    Nama Lengkap
                  </label>
                  <input
                    id="fullName"
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Contoh: Drs. Ahmad Suryana"
                    required
                    className="w-full px-3.5 py-2.5 text-sm bg-white border border-zinc-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-600/20 focus:border-red-700"
                  />
                </div>

                <div>
                  <label htmlFor="nip" className="block text-sm font-semibold text-zinc-800 mb-1.5">
                    NIP / Nomor Pegawai <span className="font-normal text-zinc-500">(Opsional)</span>
                  </label>
                  <input
                    id="nip"
                    type="text"
                    value={nip}
                    onChange={(e) => setNip(e.target.value)}
                    placeholder="Contoh: 198405122010011008"
                    className="w-full px-3.5 py-2.5 text-sm font-mono bg-white border border-zinc-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-600/20 focus:border-red-700"
                  />
                </div>
              </>
            )}

            <div>
              <label htmlFor="email" className="block text-sm font-semibold text-zinc-800 mb-1.5">
                Alamat Email
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="nama@smkprimaunggul.sch.id"
                  required
                  className="w-full pl-10 pr-3.5 py-2.5 text-sm bg-white border border-zinc-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-600/20 focus:border-red-700"
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-semibold text-zinc-800 mb-1.5">
                Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Minimal 6 karakter"
                  required
                  className="w-full pl-10 pr-10 py-2.5 text-sm bg-white border border-zinc-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-600/20 focus:border-red-700"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-700 p-1"
                  aria-label={showPassword ? 'Sembunyikan password' : 'Tampilkan password'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting || isSupabaseMissing}
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold text-white bg-red-700 hover:bg-red-800 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors cursor-pointer"
            >
              {mode === 'login' ? <LogIn className="w-4 h-4" /> : <UserPlus className="w-4 h-4" />}
              {submitting
                ? 'Memproses...'
                : mode === 'login'
                  ? 'Masuk ke Aplikasi'
                  : 'Daftar & Masuk'}
            </button>
          </form>

          <div className="mt-8 pt-6 border-t border-zinc-200 flex items-center justify-between text-xs text-zinc-500">
            <span>Terintegrasi Supabase Auth &amp; Database</span>
            <button
              type="button"
              onClick={() => setSchemaOpen(true)}
              className="font-semibold text-red-700 hover:text-red-800 underline underline-offset-2"
            >
              Panduan SQL Schema
            </button>
          </div>
        </div>
      </div>

      <SchemaModal open={schemaOpen} onClose={() => setSchemaOpen(false)} />
    </div>
  );
}
