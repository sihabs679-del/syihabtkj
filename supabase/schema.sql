-- ==============================================================================
-- SMK Prima Unggul - Sistem Absensi Siswa & Karyawan
-- Skema Database Relasional Supabase (Idempotent Install & Upgrade Script)
--
-- Aman dijalankan ulang (idempotent) baik pada database baru maupun database
-- yang sudah memiliki tabel versi sebelumnya.
--
-- Peta Relasi Tabel:
--   auth.users (id)
--     └──< public.profiles (id PK/FK -> auth.users.id ON DELETE CASCADE)
--            ├──< public.employee_attendance (user_id FK -> profiles.id ON DELETE CASCADE)
--            ├──< public.classes (wali_kelas_id FK -> profiles.id ON DELETE SET NULL)
--            └──< public.student_attendance (recorded_by FK -> profiles.id ON DELETE SET NULL)
--
--   public.jurusan (code PK: TKJ, DKV, AK, BC, MPLB, BD)
--     ├──< public.classes (jurusan_code FK -> jurusan.code ON UPDATE CASCADE)
--     └──< public.students (jurusan FK -> jurusan.code ON UPDATE CASCADE)
--
--   public.classes (id PK)
--     └──< public.students (class_id FK -> classes.id ON DELETE SET NULL)
--
--   public.students (id PK)
--     └──< public.student_attendance (student_id FK -> students.id ON DELETE CASCADE)
-- ==============================================================================

-- 1. Tabel Master Jurusan (6 Kompetensi Keahlian dalam 3 Rumpun Bidang)
create table if not exists public.jurusan (
  code text primary key check (code in ('TKJ', 'DKV', 'AK', 'BC', 'MPLB', 'BD')),
  name text not null,
  rumpun text not null check (
    rumpun in (
      'Teknologi Informasi & Komunikasi',
      'Seni & Ekonomi Kreatif',
      'Bisnis & Manajemen'
    )
  ),
  created_at timestamptz not null default now()
);

-- Seed data resmi jurusan SMK Prima Unggul
insert into public.jurusan (code, name, rumpun) values
  ('TKJ', 'Teknik Jaringan Komputer dan Telekomunikasi', 'Teknologi Informasi & Komunikasi'),
  ('DKV', 'Desain Komunikasi Visual', 'Seni & Ekonomi Kreatif'),
  ('BC', 'Broadcasting dan Perfilman', 'Seni & Ekonomi Kreatif'),
  ('AK', 'Akuntansi dan Keuangan Lembaga', 'Bisnis & Manajemen'),
  ('MPLB', 'Manajemen Perkantoran dan Layanan Bisnis', 'Bisnis & Manajemen'),
  ('BD', 'Bisnis Digital', 'Bisnis & Manajemen')
on conflict (code) do update set
  name = excluded.name,
  rumpun = excluded.rumpun;

-- 2. Tabel Profil Karyawan (Terhubung 1-to-1 ke auth.users Supabase)
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text unique not null,
  full_name text not null,
  nip text not null default '',
  role text not null check (role in ('admin', 'guru', 'tenaga_kependidikan')),
  jabatan text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles add column if not exists nip text not null default '';
alter table public.profiles add column if not exists jabatan text not null default '';
alter table public.profiles add column if not exists updated_at timestamptz not null default now();

-- 3. Tabel Master Kelas (Berelasi ke Jurusan dan Wali Kelas di Profiles)
create table if not exists public.classes (
  id uuid primary key default gen_random_uuid(),
  name text unique not null,
  tingkat text not null default 'X',
  jurusan_code text not null references public.jurusan(code) on update cascade on delete restrict,
  wali_kelas_id uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 4. Tabel Data Siswa (Berelasi ke Jurusan & Kelas)
create table if not exists public.students (
  id uuid primary key default gen_random_uuid(),
  nis text unique not null,
  full_name text not null,
  kelas text not null,
  jurusan text not null references public.jurusan(code) on update cascade on delete restrict,
  class_id uuid references public.classes(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Upgrade kolom & constraint jika tabel students sudah ada dari versi sebelumnya
alter table public.students add column if not exists class_id uuid references public.classes(id) on delete set null;
alter table public.students add column if not exists updated_at timestamptz not null default now();

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'students_jurusan_fkey'
  ) then
    alter table public.students
      add constraint students_jurusan_fkey
      foreign key (jurusan) references public.jurusan(code)
      on update cascade on delete restrict;
  end if;
end $$;

-- 5. Tabel Absensi Karyawan (Admin, Guru, Tenaga Kependidikan -> berelasi ke Profiles)
create table if not exists public.employee_attendance (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  attendance_date date not null default current_date,
  status text not null check (status in ('Hadir', 'Terlambat', 'Izin', 'Sakit')),
  check_in timestamptz,
  check_out timestamptz,
  notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id, attendance_date)
);

alter table public.employee_attendance add column if not exists updated_at timestamptz not null default now();

-- 6. Tabel Absensi Siswa (Berelasi ke Students & Profiles pencatat/Guru)
create table if not exists public.student_attendance (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students(id) on delete cascade,
  attendance_date date not null default current_date,
  status text not null check (status in ('Hadir', 'Sakit', 'Izin', 'Alpa')),
  notes text not null default '',
  recorded_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(student_id, attendance_date)
);

alter table public.student_attendance add column if not exists updated_at timestamptz not null default now();

-- Index untuk percepatan query relasional, rekap & filter
create index if not exists idx_classes_jurusan on public.classes(jurusan_code);
create index if not exists idx_students_kelas on public.students(kelas);
create index if not exists idx_students_jurusan on public.students(jurusan);
create index if not exists idx_students_class_id on public.students(class_id);
create index if not exists idx_emp_att_date on public.employee_attendance(attendance_date);
create index if not exists idx_emp_att_user on public.employee_attendance(user_id);
create index if not exists idx_stu_att_date on public.student_attendance(attendance_date);
create index if not exists idx_stu_att_student on public.student_attendance(student_id);
create index if not exists idx_stu_att_recorder on public.student_attendance(recorded_by);

-- ==============================================================================
-- Backfill Relasi Kelas untuk Data Siswa yang Sudah Ada
-- ==============================================================================

insert into public.classes (name, tingkat, jurusan_code)
select distinct
  upper(trim(s.kelas)),
  coalesce(nullif(split_part(upper(trim(s.kelas)), ' ', 1), ''), 'X'),
  s.jurusan
from public.students s
where trim(s.kelas) <> ''
on conflict (name) do nothing;

update public.students s
set class_id = c.id
from public.classes c
where c.name = upper(trim(s.kelas))
  and s.class_id is null;

-- ==============================================================================
-- Trigger Relasional: Otomatis Sinkronisasi Siswa -> Tabel Classes
-- ==============================================================================

create or replace function public.sync_student_class()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  matched_class_id uuid;
  derived_tingkat text;
begin
  new.kelas := upper(trim(new.kelas));
  derived_tingkat := coalesce(nullif(split_part(new.kelas, ' ', 1), ''), 'X');

  insert into public.classes (name, tingkat, jurusan_code)
  values (new.kelas, derived_tingkat, new.jurusan)
  on conflict (name) do update set
    jurusan_code = excluded.jurusan_code,
    updated_at = now()
  returning id into matched_class_id;

  new.class_id := matched_class_id;
  return new;
end;
$$;

drop trigger if exists trg_sync_student_class on public.students;
create trigger trg_sync_student_class
  before insert or update of kelas, jurusan on public.students
  for each row execute procedure public.sync_student_class();

-- ==============================================================================
-- Fungsi Helper & Trigger Auth: User Pertama Otomatis Menjadi Admin
-- ==============================================================================

create or replace function public.get_my_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select role from public.profiles where id = auth.uid();
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  existing_count integer;
  assigned_role text;
  user_full_name text;
begin
  select count(*) into existing_count from public.profiles;

  if existing_count = 0 then
    assigned_role := 'admin';
  else
    assigned_role := coalesce(new.raw_user_meta_data->>'role', 'tenaga_kependidikan');
    if assigned_role not in ('admin', 'guru', 'tenaga_kependidikan') then
      assigned_role := 'tenaga_kependidikan';
    end if;
  end if;

  user_full_name := coalesce(
    nullif(trim(new.raw_user_meta_data->>'full_name'), ''),
    split_part(new.email, '@', 1)
  );

  insert into public.profiles (id, email, full_name, nip, role, jabatan)
  values (
    new.id,
    new.email,
    user_full_name,
    coalesce(new.raw_user_meta_data->>'nip', ''),
    assigned_role,
    coalesce(new.raw_user_meta_data->>'jabatan', '')
  )
  on conflict (id) do update set
    email = excluded.email,
    full_name = excluded.full_name,
    role = excluded.role,
    updated_at = now();

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Sinkronisasi user yang sudah terdaftar di auth.users sebelum skema dijalankan
insert into public.profiles (id, email, full_name, nip, role, jabatan)
select
  u.id,
  coalesce(u.email, ''),
  coalesce(nullif(trim(u.raw_user_meta_data->>'full_name'), ''), split_part(coalesce(u.email, 'user'), '@', 1)),
  coalesce(u.raw_user_meta_data->>'nip', ''),
  case
    when row_number() over (order by u.created_at asc) = 1
      and not exists (select 1 from public.profiles where role = 'admin')
    then 'admin'
    when u.raw_user_meta_data->>'role' in ('admin', 'guru', 'tenaga_kependidikan')
    then u.raw_user_meta_data->>'role'
    else 'tenaga_kependidikan'
  end,
  coalesce(u.raw_user_meta_data->>'jabatan', '')
from auth.users u
where not exists (select 1 from public.profiles p where p.id = u.id)
on conflict (id) do nothing;

-- Pastikan jika belum ada admin sama sekali di profiles, user paling awal dipromosikan menjadi admin
update public.profiles
set role = 'admin', updated_at = now()
where id = (
  select id from public.profiles order by created_at asc limit 1
)
and not exists (
  select 1 from public.profiles where role = 'admin'
);

-- ==============================================================================
-- Relational Views untuk Rekap Absensi
-- ==============================================================================

create or replace view public.v_student_attendance_recap as
select
  sa.id,
  sa.attendance_date,
  sa.status,
  sa.notes,
  s.id as student_id,
  s.nis,
  s.full_name as student_name,
  s.kelas,
  j.code as jurusan_code,
  j.name as jurusan_name,
  j.rumpun,
  p.full_name as recorded_by_name,
  sa.created_at
from public.student_attendance sa
join public.students s on s.id = sa.student_id
join public.jurusan j on j.code = s.jurusan
left join public.profiles p on p.id = sa.recorded_by;

create or replace view public.v_employee_attendance_recap as
select
  ea.id,
  ea.attendance_date,
  ea.status,
  ea.check_in,
  ea.check_out,
  ea.notes,
  p.id as user_id,
  p.nip,
  p.full_name,
  p.email,
  p.role,
  p.jabatan,
  ea.created_at
from public.employee_attendance ea
join public.profiles p on p.id = ea.user_id;

-- ==============================================================================
-- Hak Akses Schema & Row Level Security (RLS)
-- ==============================================================================

grant usage on schema public to anon, authenticated;
grant usage, select on all sequences in schema public to authenticated;
grant select on public.jurusan to anon, authenticated;
grant select, insert, update, delete on public.profiles to authenticated;
grant select, insert, update, delete on public.classes to authenticated;
grant select, insert, update, delete on public.students to authenticated;
grant select, insert, update, delete on public.employee_attendance to authenticated;
grant select, insert, update, delete on public.student_attendance to authenticated;
grant select on public.v_student_attendance_recap to authenticated;
grant select on public.v_employee_attendance_recap to authenticated;

alter table public.jurusan enable row level security;
alter table public.classes enable row level security;
alter table public.profiles enable row level security;
alter table public.students enable row level security;
alter table public.employee_attendance enable row level security;
alter table public.student_attendance enable row level security;

-- Policies: jurusan
drop policy if exists "Jurusan readable by all" on public.jurusan;
create policy "Jurusan readable by all"
  on public.jurusan for select
  to anon, authenticated
  using (true);

-- Policies: classes
drop policy if exists "Classes readable by admin and guru" on public.classes;
create policy "Classes readable by admin and guru"
  on public.classes for select
  to authenticated
  using (public.get_my_role() in ('admin', 'guru'));

drop policy if exists "Classes manageable by admin" on public.classes;
create policy "Classes manageable by admin"
  on public.classes for all
  to authenticated
  using (public.get_my_role() = 'admin')
  with check (public.get_my_role() = 'admin');

-- Policies: profiles
drop policy if exists "Profiles selectable by owner or admin" on public.profiles;
create policy "Profiles selectable by owner or admin"
  on public.profiles for select
  to authenticated
  using (auth.uid() = id or public.get_my_role() in ('admin', 'guru'));

drop policy if exists "Profiles insertable by self" on public.profiles;
create policy "Profiles insertable by self"
  on public.profiles for insert
  to authenticated
  with check (auth.uid() = id);

drop policy if exists "Profiles updatable by admin or self" on public.profiles;
create policy "Profiles updatable by admin or self"
  on public.profiles for update
  to authenticated
  using (auth.uid() = id or public.get_my_role() = 'admin')
  with check (auth.uid() = id or public.get_my_role() = 'admin');

-- Policies: students
drop policy if exists "Students readable by admin and guru" on public.students;
create policy "Students readable by admin and guru"
  on public.students for select
  to authenticated
  using (public.get_my_role() in ('admin', 'guru'));

drop policy if exists "Students manageable by admin" on public.students;
create policy "Students manageable by admin"
  on public.students for all
  to authenticated
  using (public.get_my_role() = 'admin')
  with check (public.get_my_role() = 'admin');

-- Policies: employee_attendance
drop policy if exists "Employee attendance readable by self or admin" on public.employee_attendance;
create policy "Employee attendance readable by self or admin"
  on public.employee_attendance for select
  to authenticated
  using (auth.uid() = user_id or public.get_my_role() = 'admin');

drop policy if exists "Employee attendance insertable by self" on public.employee_attendance;
create policy "Employee attendance insertable by self"
  on public.employee_attendance for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "Employee attendance updatable by self or admin" on public.employee_attendance;
create policy "Employee attendance updatable by self or admin"
  on public.employee_attendance for update
  to authenticated
  using (auth.uid() = user_id or public.get_my_role() = 'admin')
  with check (auth.uid() = user_id or public.get_my_role() = 'admin');

-- Policies: student_attendance
drop policy if exists "Student attendance readable by admin and guru" on public.student_attendance;
create policy "Student attendance readable by admin and guru"
  on public.student_attendance for select
  to authenticated
  using (public.get_my_role() in ('admin', 'guru'));

drop policy if exists "Student attendance writable by admin and guru" on public.student_attendance;
create policy "Student attendance writable by admin and guru"
  on public.student_attendance for insert
  to authenticated
  with check (public.get_my_role() in ('admin', 'guru'));

drop policy if exists "Student attendance updatable by admin and guru" on public.student_attendance;
create policy "Student attendance updatable by admin and guru"
  on public.student_attendance for update
  to authenticated
  using (public.get_my_role() in ('admin', 'guru'))
  with check (public.get_my_role() in ('admin', 'guru'));

drop policy if exists "Student attendance deletable by admin" on public.student_attendance;
create policy "Student attendance deletable by admin"
  on public.student_attendance for delete
  to authenticated
  using (public.get_my_role() = 'admin');