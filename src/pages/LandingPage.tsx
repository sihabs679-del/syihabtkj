import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  BookOpen,
  CheckCircle2,
  ClipboardCheck,
  MapPin,
  Phone,
  Mail,
  ShieldCheck,
  Users,
} from 'lucide-react';
import { ImageWithFallback } from '../components/ImageWithFallback';
import { JURUSAN_LIST, type JurusanInfo } from '../types';

type RumpunFilter =
  | 'Semua'
  | 'Teknologi Informasi & Komunikasi'
  | 'Seni & Ekonomi Kreatif'
  | 'Bisnis & Manajemen';

const RUMPUN_OPTIONS: { label: string; value: RumpunFilter }[] = [
  { label: 'Semua Program (6)', value: 'Semua' },
  { label: 'Teknologi Informasi', value: 'Teknologi Informasi & Komunikasi' },
  { label: 'Seni & Ekonomi Kreatif', value: 'Seni & Ekonomi Kreatif' },
  { label: 'Bisnis & Manajemen', value: 'Bisnis & Manajemen' },
];

export default function LandingPage() {
  const [selectedRumpun, setSelectedRumpun] = useState<RumpunFilter>('Semua');

  const filteredJurusan: JurusanInfo[] =
    selectedRumpun === 'Semua'
      ? JURUSAN_LIST
      : JURUSAN_LIST.filter((j) => j.rumpun === selectedRumpun);

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900 flex flex-col">
      {/* Top Bar Contract: Brand wordmark — 4 nav links — 1 primary CTA */}
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-xs border-b border-zinc-200">
        <div className="max-w-7xl mx-auto px-6 lg:px-8 h-16 flex items-center justify-between gap-8">
          <Link
            to="/"
            className="text-lg font-extrabold tracking-tight text-red-700 whitespace-nowrap shrink-0"
          >
            SMK Prima Unggul
          </Link>

          <nav
            aria-label="Navigasi Utama"
            className="hidden md:flex items-center gap-7 text-sm font-medium text-zinc-600"
          >
            <a
              href="#profil"
              className="hover:text-red-700 hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
            >
              Profil
            </a>
            <a
              href="#jurusan"
              className="hover:text-red-700 hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
            >
              Program Keahlian
            </a>
            <a
              href="#sistem-absensi"
              className="hover:text-red-700 hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
            >
              Alur Absensi
            </a>
            <a
              href="#kontak"
              className="hover:text-red-700 hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
            >
              Kontak
            </a>
          </nav>

          <div className="flex items-center shrink-0">
            <Link
              to="/login"
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-red-700 hover:bg-red-800 rounded-lg transition-colors whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-700"
            >
              Masuk Portal
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1">
        {/* Hero Section: 2-Column Split + 4-Column Proof Strip */}
        <section id="profil" className="bg-white border-b border-zinc-200">
          <div className="max-w-7xl mx-auto px-6 lg:px-8 py-14 lg:py-20">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-stretch">
              <div className="lg:col-span-6 flex flex-col justify-center">
                <p className="text-sm font-semibold text-red-700 tracking-tight mb-3">
                  Sekolah Menengah Kejuruan Terakreditasi A · Berbasis Industri
                </p>

                <h1
                  className="font-extrabold tracking-tight text-zinc-900 leading-[1.1] text-balance"
                  style={{ fontSize: 'clamp(2.25rem, 4vw, 3.5rem)' }}
                >
                  Mencetak Lulusan Vokasi Unggul dan Disiplin di Era Digital.
                </h1>

                <p className="mt-5 text-base lg:text-lg text-zinc-600 leading-relaxed max-w-xl">
                  SMK Prima Unggul menyelenggarakan pendidikan kejuruan terstruktur dalam 3 rumpun bidang
                  keahlian utama dengan 6 program studi unggulan—TKJ, DKV, AK, BC, MPLB, dan BD—serta
                  didukung sistem absensi digital terpadu untuk siswa, guru, dan tenaga kependidikan.
                </p>

                <div className="mt-8 flex flex-wrap items-center gap-4">
                  <Link
                    to="/login"
                    className="inline-flex items-center gap-2.5 px-6 py-3 text-sm font-semibold text-white bg-red-700 hover:bg-red-800 rounded-lg transition-colors whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-700"
                  >
                    Masuk ke Sistem Absensi
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                  <a
                    href="#jurusan"
                    className="inline-flex items-center gap-2 px-5 py-3 text-sm font-semibold text-zinc-800 bg-zinc-100 hover:bg-zinc-200 rounded-lg transition-colors whitespace-nowrap shrink-0"
                  >
                    Lihat Program Keahlian
                  </a>
                </div>
              </div>

              <div className="lg:col-span-6">
                <div className="h-72 sm:h-96 lg:h-full min-h-[340px] rounded-xl overflow-hidden border border-zinc-200 bg-zinc-100 relative">
                  <ImageWithFallback
                    src="/src/assets/images/hero_smk_campus_1795061356456.jpg"
                    alt="Gedung Kampus SMK Prima Unggul"
                    className="w-full h-full object-cover"
                    fallbackLabel="Kampus Utama SMK Prima Unggul"
                  />
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-6">
                    <p className="text-sm font-semibold text-white">
                      Kampus Terpadu SMK Prima Unggul
                    </p>
                    <p className="text-xs text-zinc-200 mt-0.5">
                      Laboratorium Praktik Standar Industri · Pusat Sertifikasi Kompetensi
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* 4-column KPI strip below hero */}
            <div className="mt-14 pt-8 border-t border-zinc-200 grid grid-cols-2 lg:grid-cols-4 gap-8">
              <div>
                <p className="text-2xl lg:text-3xl font-extrabold text-red-700 tabular-nums">3 Rumpun</p>
                <p className="mt-1 text-sm text-zinc-600">
                  Bidang keahlian: Teknologi Informasi, Ekonomi Kreatif, serta Bisnis &amp; Manajemen.
                </p>
              </div>
              <div>
                <p className="text-2xl lg:text-3xl font-extrabold text-zinc-900 tabular-nums">6 Jurusan</p>
                <p className="mt-1 text-sm text-zinc-600">
                  Kompetensi keahlian aktif: TKJ, DKV, AK, BC, MPLB, dan BD.
                </p>
              </div>
              <div>
                <p className="text-2xl lg:text-3xl font-extrabold text-zinc-900 tabular-nums">3 Peran</p>
                <p className="mt-1 text-sm text-zinc-600">
                  Hak akses terpisah untuk Admin, Guru, dan Tenaga Kependidikan.
                </p>
              </div>
              <div>
                <p className="text-2xl lg:text-3xl font-extrabold text-zinc-900 tabular-nums">Real-Time</p>
                <p className="mt-1 text-sm text-zinc-600">
                  Pencatatan kehadiran siswa &amp; karyawan tersinkronisasi ke database Supabase.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Program Keahlian Section */}
        <section id="jurusan" className="py-16 lg:py-24 bg-zinc-50 border-b border-zinc-200">
          <div className="max-w-7xl mx-auto px-6 lg:px-8">
            <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 mb-10">
              <div className="max-w-2xl">
                <p className="text-sm font-semibold text-red-700 mb-2">
                  Kurikulum Vokasi Berstandar Industri
                </p>
                <h2 className="text-3xl lg:text-4xl font-extrabold tracking-tight text-zinc-900 text-balance">
                  3 Rumpun Keahlian &amp; 6 Program Studi SMK Prima Unggul
                </h2>
                <p className="mt-3 text-base text-zinc-600 leading-relaxed">
                  Setiap jurusan memadukan pembelajaran teori kelas, praktik laboratorium intensif,
                  dan uji sertifikasi kompetensi bersama mitra industri nasional.
                </p>
              </div>

              {/* Interactive segmented filter tabs */}
              <div
                role="tablist"
                aria-label="Filter Rumpun Keahlian"
                className="flex flex-wrap items-center gap-1 p-1 bg-zinc-200/80 rounded-lg self-start"
              >
                {RUMPUN_OPTIONS.map((opt) => {
                  const active = selectedRumpun === opt.value;
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      role="tab"
                      aria-selected={active}
                      onClick={() => setSelectedRumpun(opt.value)}
                      className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 ${
                        active
                          ? 'bg-red-700 text-white shadow-xs'
                          : 'text-zinc-700 hover:text-zinc-900 hover:bg-white/60'
                      }`}
                    >
                      {opt.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Jurusan Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredJurusan.map((jurusan, idx) => (
                <article
                  key={jurusan.code}
                  className="bg-white border border-zinc-200 rounded-xl p-6 flex flex-col justify-between hover:border-red-300 transition-colors"
                >
                  <div>
                    <div className="flex items-center justify-between text-xs text-zinc-500 mb-3">
                      <span className="font-mono font-semibold text-red-700">
                        0{idx + 1} · {jurusan.code}
                      </span>
                      <span className="truncate max-w-[65%]">{jurusan.rumpun}</span>
                    </div>

                    <h3 className="text-lg font-bold text-zinc-900 leading-snug">
                      {jurusan.name}
                    </h3>

                    <p className="mt-2.5 text-sm text-zinc-600 leading-relaxed">
                      {jurusan.summary}
                    </p>
                  </div>

                  <div className="mt-5 pt-4 border-t border-zinc-100">
                    <p className="text-xs font-semibold text-zinc-900 mb-2">Fokus Kompetensi:</p>
                    <ul className="space-y-1.5">
                      {jurusan.competencies.map((comp) => (
                        <li key={comp} className="flex items-start gap-2 text-xs text-zinc-600">
                          <CheckCircle2 className="w-3.5 h-3.5 text-red-700 shrink-0 mt-0.5" />
                          <span>{comp}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </article>
              ))}
            </div>

            {/* Asymmetric Visual Showcase of School Facilities */}
            <div className="mt-12 grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
              <div className="lg:col-span-7 bg-white border border-zinc-200 rounded-xl overflow-hidden flex flex-col">
                <div className="h-64 sm:h-80 overflow-hidden bg-zinc-100">
                  <ImageWithFallback
                    src="/src/assets/images/lab_tkj_dkv_1795061356510.jpg"
                    alt="Laboratorium Komputer TKJ dan Studio DKV SMK Prima Unggul"
                    className="w-full h-full object-cover"
                    fallbackLabel="Laboratorium TKJ & Studio DKV"
                  />
                </div>
                <div className="p-6">
                  <p className="text-xs font-semibold text-red-700 mb-1">
                    Fasilitas Praktik · TKJ &amp; DKV
                  </p>
                  <h3 className="text-lg font-bold text-zinc-900">
                    Laboratorium Infrastruktur Jaringan &amp; Studio Desain Grafis
                  </h3>
                  <p className="mt-1.5 text-sm text-zinc-600 leading-relaxed">
                    Dilengkapi perangkat router enterprise, server praktikum, serta workstation grafis
                    berlayar ganda untuk menunjang pembelajaran berbasis proyek nyata.
                  </p>
                </div>
              </div>

              <div className="lg:col-span-5 bg-white border border-zinc-200 rounded-xl overflow-hidden flex flex-col">
                <div className="h-64 sm:h-80 overflow-hidden bg-zinc-100">
                  <ImageWithFallback
                    src="/src/assets/images/studio_broadcast_bisnis_1795061356173.jpg"
                    alt="Studio Broadcasting dan Bisnis Digital SMK Prima Unggul"
                    className="w-full h-full object-cover"
                    fallbackLabel="Studio Broadcasting & Bisnis Digital"
                  />
                </div>
                <div className="p-6">
                  <p className="text-xs font-semibold text-red-700 mb-1">
                    Fasilitas Praktik · BC, AK, MPLB &amp; BD
                  </p>
                  <h3 className="text-lg font-bold text-zinc-900">
                    Studio Siaran &amp; Inkubator Bisnis Digital
                  </h3>
                  <p className="mt-1.5 text-sm text-zinc-600 leading-relaxed">
                    Ruang produksi siaran berstandar studio televisi dan laboratorium akuntansi serta
                    simulasi perkantoran modern bagi siswa bisnis dan media.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Alur Sistem Absensi Terpadu */}
        <section id="sistem-absensi" className="py-16 lg:py-24 bg-white border-b border-zinc-200">
          <div className="max-w-7xl mx-auto px-6 lg:px-8">
            <div className="max-w-2xl mb-12">
              <p className="text-sm font-semibold text-red-700 mb-2">
                Sistem Informasi Kehadiran
              </p>
              <h2 className="text-3xl lg:text-4xl font-extrabold tracking-tight text-zinc-900 text-balance">
                Alur Kerja Absensi Siswa &amp; Karyawan Berbasis Peran
              </h2>
              <p className="mt-3 text-base text-zinc-600 leading-relaxed">
                Seluruh aktivitas kehadiran dikelola secara terpusat melalui autentikasi Supabase
                dengan pembagian hak akses yang jelas bagi setiap elemen sekolah.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-zinc-50 border border-zinc-200 rounded-xl p-6">
                <div className="w-10 h-10 rounded-lg bg-red-700 text-white flex items-center justify-center mb-4">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <p className="text-xs font-mono font-semibold text-red-700 mb-1">01. Administrator</p>
                <h3 className="text-lg font-bold text-zinc-900">Kontrol Penuh &amp; Manajemen User</h3>
                <p className="mt-2 text-sm text-zinc-600 leading-relaxed">
                  Pengguna pertama yang dibuat di Supabase Authentication otomatis menjadi Admin.
                  Mengelola akun guru dan staf tersinkronisasi penuh (tambah, ubah, hingga hapus permanen),
                  mengelola master data siswa, serta memantau seluruh rekap absensi.
                </p>
              </div>

              <div className="bg-zinc-50 border border-zinc-200 rounded-xl p-6">
                <div className="w-10 h-10 rounded-lg bg-zinc-900 text-white flex items-center justify-center mb-4">
                  <BookOpen className="w-5 h-5" />
                </div>
                <p className="text-xs font-mono font-semibold text-red-700 mb-1">02. Guru Pengajar</p>
                <h3 className="text-lg font-bold text-zinc-900">Absensi Siswa &amp; Kehadiran Mandiri</h3>
                <p className="mt-2 text-sm text-zinc-600 leading-relaxed">
                  Melakukan absen kehadiran diri sendiri pada menu Absensi Karyawan, mencatat kehadiran
                  harian siswa per kelas (Hadir, Sakit, Izin, Alpa), dan meninjau rekap absensi siswa
                  secara langsung.
                </p>
              </div>

              <div className="bg-zinc-50 border border-zinc-200 rounded-xl p-6">
                <div className="w-10 h-10 rounded-lg bg-zinc-900 text-white flex items-center justify-center mb-4">
                  <ClipboardCheck className="w-5 h-5" />
                </div>
                <p className="text-xs font-mono font-semibold text-red-700 mb-1">
                  03. Tenaga Kependidikan
                </p>
                <h3 className="text-lg font-bold text-zinc-900">Absensi Mandiri Harian</h3>
                <p className="mt-2 text-sm text-zinc-600 leading-relaxed">
                  Mengakses ringkasan dashboard pribadi serta melakukan pencatatan absen masuk,
                  absen pulang, atau pengajuan keterangan izin dan sakit secara mandiri setiap hari kerja.
                </p>
              </div>
            </div>

            <div className="mt-10 bg-red-700 rounded-xl p-8 lg:p-10 text-white flex flex-col lg:flex-row lg:items-center justify-between gap-6">
              <div className="max-w-2xl">
                <h3 className="text-2xl font-extrabold tracking-tight">
                  Siap Mengakses Portal Absensi SMK Prima Unggul?
                </h3>
                <p className="mt-2 text-sm lg:text-base text-red-100 leading-relaxed">
                  Masuk menggunakan akun yang terdaftar pada sistem sekolah untuk mencatat kehadiran
                  harian karyawan maupun presensi kelas siswa.
                </p>
              </div>
              <Link
                to="/login"
                className="inline-flex items-center justify-center gap-2 px-6 py-3 text-sm font-bold text-red-800 bg-white hover:bg-red-50 rounded-lg transition-colors whitespace-nowrap shrink-0"
              >
                <Users className="w-4 h-4" />
                Masuk ke Portal (/login)
              </Link>
            </div>
          </div>
        </section>
      </main>

      {/* Quiet Footer */}
      <footer id="kontak" className="bg-zinc-950 text-zinc-300 py-12">
        <div className="max-w-7xl mx-auto px-6 lg:px-8 grid grid-cols-1 md:grid-cols-3 gap-8">
          <div>
            <p className="text-lg font-extrabold text-white tracking-tight">SMK Prima Unggul</p>
            <p className="mt-2 text-sm text-zinc-400 leading-relaxed">
              Sekolah Menengah Kejuruan berbasis kompetensi industri dengan program keahlian TKJ, DKV,
              AK, BC, MPLB, dan BD.
            </p>
          </div>

          <div className="space-y-2.5 text-sm">
            <p className="font-semibold text-white mb-2">Alamat &amp; Kontak</p>
            <p className="flex items-start gap-2 text-zinc-400">
              <MapPin className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
              <span>Jl. Raya Pendidikan Vokasi No. 88, Kota Tangerang, Banten</span>
            </p>
            <p className="flex items-center gap-2 text-zinc-400">
              <Phone className="w-4 h-4 text-red-500 shrink-0" />
              <span className="tabular-nums">(021) 5589-2400</span>
            </p>
            <p className="flex items-center gap-2 text-zinc-400">
              <Mail className="w-4 h-4 text-red-500 shrink-0" />
              <span>info@smkprimaunggul.sch.id</span>
            </p>
          </div>

          <div className="text-sm flex flex-col md:items-end justify-between gap-4">
            <div className="flex flex-wrap gap-5 text-zinc-400">
              <a href="#profil" className="hover:text-white transition-colors">
                Profil
              </a>
              <a href="#jurusan" className="hover:text-white transition-colors">
                Program Keahlian
              </a>
              <Link to="/login" className="hover:text-white transition-colors">
                Login Sistem
              </Link>
              <Link to="/app" className="hover:text-white transition-colors">
                Portal Aplikasi
              </Link>
            </div>
            <p className="text-xs text-zinc-500">
              &copy; {new Date().getFullYear()} SMK Prima Unggul. Hak cipta dilindungi.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
