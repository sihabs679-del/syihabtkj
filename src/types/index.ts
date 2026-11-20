export type UserRole = 'admin' | 'guru' | 'tenaga_kependidikan';

export type JurusanCode = 'TKJ' | 'DKV' | 'AK' | 'BC' | 'MPLB' | 'BD';

export type EmployeeAttendanceStatus = 'Hadir' | 'Terlambat' | 'Izin' | 'Sakit';

export type StudentAttendanceStatus = 'Hadir' | 'Sakit' | 'Izin' | 'Alpa';

export interface UserProfile {
  id: string;
  email: string;
  full_name: string;
  nip: string;
  role: UserRole;
  jabatan: string;
  created_at: string;
  updated_at?: string;
}

export interface ManagedUser extends UserProfile {
  last_sign_in_at: string | null;
  email_confirmed_at: string | null;
}

export interface SchoolClass {
  id: string;
  name: string;
  tingkat: string;
  jurusan_code: JurusanCode;
  wali_kelas_id: string | null;
  created_at: string;
}

export interface Student {
  id: string;
  nis: string;
  full_name: string;
  kelas: string;
  jurusan: JurusanCode;
  class_id?: string | null;
  created_at: string;
}

export interface EmployeeAttendance {
  id: string;
  user_id: string;
  attendance_date: string;
  status: EmployeeAttendanceStatus;
  check_in: string | null;
  check_out: string | null;
  notes: string;
  created_at: string;
  profiles?: Pick<UserProfile, 'full_name' | 'email' | 'nip' | 'role' | 'jabatan'>;
}

export interface StudentAttendance {
  id: string;
  student_id: string;
  attendance_date: string;
  status: StudentAttendanceStatus;
  notes: string;
  recorded_by: string | null;
  created_at: string;
  students?: Pick<Student, 'nis' | 'full_name' | 'kelas' | 'jurusan'>;
  recorder?: Pick<UserProfile, 'full_name'> | null;
}

export interface JurusanInfo {
  code: JurusanCode;
  name: string;
  rumpun: 'Teknologi Informasi & Komunikasi' | 'Seni & Ekonomi Kreatif' | 'Bisnis & Manajemen';
  summary: string;
  competencies: string[];
}

export const JURUSAN_LIST: JurusanInfo[] = [
  {
    code: 'TKJ',
    name: 'Teknik Jaringan Komputer dan Telekomunikasi',
    rumpun: 'Teknologi Informasi & Komunikasi',
    summary:
      'Membekali siswa dengan keahlian infrastruktur jaringan, administrasi server Linux/Windows, keamanan siber, dan fiber optik.',
    competencies: ['Administrasi Sistem Jaringan', 'Routing & Switching Mikrotik/Cisco', 'Fiber Optic & Cloud Infrastructure'],
  },
  {
    code: 'DKV',
    name: 'Desain Komunikasi Visual',
    rumpun: 'Seni & Ekonomi Kreatif',
    summary:
      'Mengembangkan kompetensi desain grafis, identitas merek, ilustrasi digital, fotografi komersial, dan desain antarmuka.',
    competencies: ['Branding & Tipografi', 'Ilustrasi & Desain Digital', 'UI/UX & Fotografi Produk'],
  },
  {
    code: 'BC',
    name: 'Broadcasting dan Perfilman',
    rumpun: 'Seni & Ekonomi Kreatif',
    summary:
      'Fokus pada produksi siaran televisi, sinematografi, penyutradaraan, tata suara, hingga penyuntingan video profesional.',
    competencies: ['Produksi Siaran Multi-Kamera', 'Sinematografi & Tata Cahaya', 'Video Editing & Sound Design'],
  },
  {
    code: 'AK',
    name: 'Akuntansi dan Keuangan Lembaga',
    rumpun: 'Bisnis & Manajemen',
    summary:
      'Menyiapkan tenaga akuntansi terampil dalam penyusunan laporan keuangan, perpajakan, audit dasar, dan sistem akuntansi digital.',
    competencies: ['Siklus Akuntansi Perusahaan', 'Administrasi Pajak & Payroll', 'Komputer Akuntansi & Spreadsheet'],
  },
  {
    code: 'MPLB',
    name: 'Manajemen Perkantoran dan Layanan Bisnis',
    rumpun: 'Bisnis & Manajemen',
    summary:
      'Melatih manajemen administrasi modern, korespondensi bisnis, pengelolaan arsip digital, dan pelayanan prima korporasi.',
    competencies: ['Otomatisasi Tata Kelola Perkantoran', 'Manajemen Arsip Digital', 'Public Relations & Layanan Bisnis'],
  },
  {
    code: 'BD',
    name: 'Bisnis Digital',
    rumpun: 'Bisnis & Manajemen',
    summary:
      'Membentuk wirausaha dan praktisi pemasaran digital yang mahir mengelola e-commerce, analitik pasar, dan strategi konten.',
    competencies: ['Pemasaran Digital & SEO/SEM', 'Operasional E-Commerce', 'Analitik Bisnis & Konten Kreatif'],
  },
];

export const ROLE_LABELS: Record<UserRole, string> = {
  admin: 'Admin',
  guru: 'Guru',
  tenaga_kependidikan: 'Tenaga Kependidikan',
};
