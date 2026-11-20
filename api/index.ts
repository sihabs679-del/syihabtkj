import express, { type Express, type NextFunction, type Request, type Response } from 'express';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { Pool } from 'pg';

dotenv.config();

export function getSupabaseEnv() {
  const url = (
    process.env.SUPABASE_URL ||
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    process.env.VITE_SUPABASE_URL ||
    ''
  ).trim();
  const anonKey = (
    process.env.SUPABASE_ANON_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.VITE_SUPABASE_ANON_KEY ||
    ''
  ).trim();
  const serviceRoleKey = (process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim();
  const dbUrl = (
    process.env.SUPABASE_DB_URL ||
    process.env.DATABASE_URL ||
    process.env.POSTGRES_URL_NON_POOLING ||
    process.env.POSTGRES_URL ||
    ''
  ).trim();
  return { url, anonKey, serviceRoleKey, dbUrl };
}

export function resolveSchemaPath(): string | null {
  const candidates = [
    path.resolve(process.cwd(), 'supabase/schema.sql'),
    path.resolve(process.cwd(), '../supabase/schema.sql'),
  ];
  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }
  return null;
}

export async function applyRelationalSchema(): Promise<{ applied: boolean; message: string }> {
  const { dbUrl } = getSupabaseEnv();
  if (!dbUrl) {
    return {
      applied: false,
      message: 'SUPABASE_DB_URL / DATABASE_URL / POSTGRES_URL belum dikonfigurasi.',
    };
  }

  const schemaPath = resolveSchemaPath();
  if (!schemaPath) {
    return { applied: false, message: 'File supabase/schema.sql tidak ditemukan.' };
  }

  const sql = fs.readFileSync(schemaPath, 'utf-8');
  const pool = new Pool({
    connectionString: dbUrl,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 8000,
  });

  try {
    await pool.query(sql);
    return {
      applied: true,
      message: 'Skema database relasional berhasil diterapkan langsung ke Supabase PostgreSQL.',
    };
  } catch (err) {
    return {
      applied: false,
      message: err instanceof Error ? err.message : 'Gagal menjalankan migrasi SQL.',
    };
  } finally {
    await pool.end();
  }
}

function createSupabaseAdmin(): SupabaseClient | null {
  const { url, serviceRoleKey } = getSupabaseEnv();
  if (!url || !serviceRoleKey) return null;
  return createClient(url, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

function createSupabaseAnon(): SupabaseClient | null {
  const { url, anonKey } = getSupabaseEnv();
  if (!url || !anonKey) return null;
  return createClient(url, anonKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

interface AuthenticatedRequest extends Request {
  authUser?: {
    id: string;
    email: string;
    role: 'admin' | 'guru' | 'tenaga_kependidikan';
  };
}

async function verifyAuthToken(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Token otentikasi tidak ditemukan.' });
    return;
  }

  const token = authHeader.slice(7).trim();
  const supabaseAdmin = createSupabaseAdmin();
  const supabaseClient = supabaseAdmin || createSupabaseAnon();

  if (!supabaseClient) {
    res.status(503).json({ error: 'Konfigurasi Supabase belum tersedia di server.' });
    return;
  }

  const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
  if (userError || !userData.user) {
    res.status(401).json({ error: 'Sesi tidak valid atau telah berakhir.' });
    return;
  }

  let role: 'admin' | 'guru' | 'tenaga_kependidikan' = 'tenaga_kependidikan';

  if (supabaseAdmin) {
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('role')
      .eq('id', userData.user.id)
      .maybeSingle();

    if (
      profile?.role === 'admin' ||
      profile?.role === 'guru' ||
      profile?.role === 'tenaga_kependidikan'
    ) {
      role = profile.role;
    } else if (
      userData.user.user_metadata?.role === 'admin' ||
      userData.user.user_metadata?.role === 'guru' ||
      userData.user.user_metadata?.role === 'tenaga_kependidikan'
    ) {
      role = userData.user.user_metadata.role;
    }
  }

  req.authUser = {
    id: userData.user.id,
    email: userData.user.email || '',
    role,
  };

  next();
}

function requireAdmin(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  if (!req.authUser || req.authUser.role !== 'admin') {
    res.status(403).json({ error: 'Akses ditolak. Hanya Admin yang diizinkan melakukan aksi ini.' });
    return;
  }
  next();
}

export function createApiApp(): Express {
  const app = express();
  app.use(express.json());

  // Public Supabase runtime config for client SPA
  app.get('/api/config', (_req, res) => {
    const { url, anonKey, serviceRoleKey, dbUrl } = getSupabaseEnv();
    res.json({
      supabaseUrl: url,
      supabaseAnonKey: anonKey,
      configured: Boolean(url && anonKey),
      serviceRoleConfigured: Boolean(url && serviceRoleKey),
      directDbConfigured: Boolean(dbUrl),
    });
  });

  // Check relational tables status in Supabase
  app.get('/api/db/status', async (_req, res) => {
    const { url, serviceRoleKey, dbUrl } = getSupabaseEnv();
    const tables = [
      'jurusan',
      'classes',
      'profiles',
      'students',
      'employee_attendance',
      'student_attendance',
    ];
    const supabaseAdmin = createSupabaseAdmin();

    if (!supabaseAdmin) {
      res.json({
        connected: false,
        directDbConfigured: Boolean(dbUrl),
        tables: tables.map((name) => ({ name, ready: false })),
        message:
          url && serviceRoleKey
            ? 'Gagal inisialisasi admin client.'
            : 'Menunggu konfigurasi SUPABASE_URL & SUPABASE_SERVICE_ROLE_KEY.',
      });
      return;
    }

    const checks = await Promise.all(
      tables.map(async (name) => {
        const { error } = await supabaseAdmin.from(name).select('*', { count: 'exact', head: true });
        return { name, ready: !error };
      })
    );

    const allReady = checks.every((t) => t.ready);
    res.json({
      connected: true,
      directDbConfigured: Boolean(dbUrl),
      allReady,
      tables: checks,
    });
  });

  // Apply schema.sql directly when SUPABASE_DB_URL / DATABASE_URL / POSTGRES_URL is configured
  app.post('/api/db/migrate', async (_req, res) => {
    const result = await applyRelationalSchema();
    res.status(result.applied ? 200 : 400).json(result);
  });

  // Expose schema.sql content for setup reference
  app.get('/api/schema-sql', (_req, res) => {
    const schemaPath = resolveSchemaPath();
    if (!schemaPath) {
      res.status(404).json({ error: 'File schema.sql tidak ditemukan.' });
      return;
    }
    res.type('text/plain').send(fs.readFileSync(schemaPath, 'utf-8'));
  });

  // Check if any user exists yet (for first-user admin notice on /login)
  app.get('/api/auth/first-user-status', async (_req, res) => {
    const supabaseAdmin = createSupabaseAdmin();
    if (!supabaseAdmin) {
      res.json({ hasUsers: null, serviceRoleConfigured: false });
      return;
    }

    try {
      const { data: listData, error } = await supabaseAdmin.auth.admin.listUsers({
        page: 1,
        perPage: 1,
      });
      if (error) {
        res.json({ hasUsers: null, serviceRoleConfigured: true });
        return;
      }
      res.json({
        hasUsers: (listData?.users?.length ?? 0) > 0,
        serviceRoleConfigured: true,
      });
    } catch {
      res.json({ hasUsers: null, serviceRoleConfigured: true });
    }
  });

  // Bootstrap / synchronize user profile after login or signup.
  // Guarantees the very first user created in Supabase Authentication receives role = 'admin'.
  app.post('/api/auth/bootstrap-profile', async (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ error: 'Token otentikasi diperlukan.' });
      return;
    }

    const token = authHeader.slice(7).trim();
    const supabaseAdmin = createSupabaseAdmin();
    if (!supabaseAdmin) {
      res.status(503).json({
        error: 'SUPABASE_SERVICE_ROLE_KEY belum diatur di server.',
      });
      return;
    }

    const { data: userData, error: userErr } = await supabaseAdmin.auth.getUser(token);
    if (userErr || !userData.user) {
      res.status(401).json({ error: 'Token pengguna tidak valid.' });
      return;
    }

    const authUser = userData.user;

    const { data: existingProfile, error: profileErr } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .eq('id', authUser.id)
      .maybeSingle();

    if (profileErr && profileErr.code === '42P01') {
      res.status(500).json({
        error:
          'Tabel database belum dibuat di Supabase. Silakan jalankan file supabase/schema.sql di SQL Editor Supabase.',
      });
      return;
    }

    if (existingProfile) {
      res.json({ profile: existingProfile });
      return;
    }

    const { count: profileCount } = await supabaseAdmin
      .from('profiles')
      .select('id', { count: 'exact', head: true });

    const { data: authUsersData } = await supabaseAdmin.auth.admin.listUsers({
      page: 1,
      perPage: 5,
    });
    const sortedAuthUsers = [...(authUsersData?.users || [])].sort(
      (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    );
    const isFirstAuthUser = sortedAuthUsers.length === 0 || sortedAuthUsers[0]?.id === authUser.id;
    const isFirstProfile = (profileCount ?? 0) === 0;

    let assignedRole: 'admin' | 'guru' | 'tenaga_kependidikan' = 'tenaga_kependidikan';
    if (isFirstProfile || isFirstAuthUser) {
      assignedRole = 'admin';
    } else if (
      authUser.user_metadata?.role === 'admin' ||
      authUser.user_metadata?.role === 'guru' ||
      authUser.user_metadata?.role === 'tenaga_kependidikan'
    ) {
      assignedRole = authUser.user_metadata.role;
    }

    const fullName =
      (typeof authUser.user_metadata?.full_name === 'string' &&
        authUser.user_metadata.full_name.trim()) ||
      (authUser.email ? authUser.email.split('@')[0] : 'Pengguna');

    const nip = typeof authUser.user_metadata?.nip === 'string' ? authUser.user_metadata.nip : '';
    const jabatan =
      typeof authUser.user_metadata?.jabatan === 'string'
        ? authUser.user_metadata.jabatan
        : assignedRole === 'admin'
          ? 'Administrator Sistem'
          : assignedRole === 'guru'
            ? 'Guru Mata Pelajaran'
            : 'Staf Tenaga Kependidikan';

    await supabaseAdmin.auth.admin.updateUserById(authUser.id, {
      user_metadata: {
        ...authUser.user_metadata,
        full_name: fullName,
        role: assignedRole,
        nip,
        jabatan,
      },
    });

    const { data: insertedProfile, error: insertErr } = await supabaseAdmin
      .from('profiles')
      .upsert(
        {
          id: authUser.id,
          email: authUser.email || '',
          full_name: fullName,
          nip,
          role: assignedRole,
          jabatan,
        },
        { onConflict: 'id' }
      )
      .select('*')
      .single();

    if (insertErr) {
      res.status(500).json({ error: insertErr.message });
      return;
    }

    res.json({ profile: insertedProfile });
  });

  // ============================================================================
  // ADMIN USER MANAGEMENT API (Fully synchronized with Supabase Authentication)
  // ============================================================================

  app.get(
    '/api/admin/users',
    verifyAuthToken,
    requireAdmin,
    async (_req: AuthenticatedRequest, res: Response) => {
      const supabaseAdmin = createSupabaseAdmin();
      if (!supabaseAdmin) {
        res.status(503).json({ error: 'SUPABASE_SERVICE_ROLE_KEY belum diatur di server.' });
        return;
      }

      try {
        const { data: authList, error: authError } = await supabaseAdmin.auth.admin.listUsers({
          page: 1,
          perPage: 1000,
        });

        if (authError) {
          res.status(500).json({ error: authError.message });
          return;
        }

        const { data: profiles, error: profilesError } = await supabaseAdmin
          .from('profiles')
          .select('*');

        if (profilesError) {
          res.status(500).json({ error: profilesError.message });
          return;
        }

        const profileMap = new Map((profiles || []).map((p) => [p.id, p]));

        const merged = (authList?.users || []).map((u) => {
          const profile = profileMap.get(u.id);
          const role =
            profile?.role ||
            (u.user_metadata?.role as 'admin' | 'guru' | 'tenaga_kependidikan') ||
            'tenaga_kependidikan';
          return {
            id: u.id,
            email: u.email || profile?.email || '',
            full_name:
              profile?.full_name ||
              u.user_metadata?.full_name ||
              u.email?.split('@')[0] ||
              'Tanpa Nama',
            nip: profile?.nip || u.user_metadata?.nip || '',
            role,
            jabatan: profile?.jabatan || u.user_metadata?.jabatan || '',
            created_at: u.created_at,
            last_sign_in_at: u.last_sign_in_at || null,
            email_confirmed_at: u.email_confirmed_at || null,
          };
        });

        merged.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
        res.json({ users: merged });
      } catch (err) {
        res.status(500).json({
          error: err instanceof Error ? err.message : 'Gagal memuat daftar user.',
        });
      }
    }
  );

  app.post(
    '/api/admin/users',
    verifyAuthToken,
    requireAdmin,
    async (req: AuthenticatedRequest, res: Response) => {
      const supabaseAdmin = createSupabaseAdmin();
      if (!supabaseAdmin) {
        res.status(503).json({ error: 'SUPABASE_SERVICE_ROLE_KEY belum diatur di server.' });
        return;
      }

      const { email, password, full_name, nip, role, jabatan } = req.body || {};

      if (!email || !password || !full_name || !role) {
        res.status(400).json({ error: 'Email, password, nama lengkap, dan role wajib diisi.' });
        return;
      }

      if (!['admin', 'guru', 'tenaga_kependidikan'].includes(role)) {
        res.status(400).json({ error: 'Role tidak valid.' });
        return;
      }

      if (String(password).length < 6) {
        res.status(400).json({ error: 'Password minimal 6 karakter.' });
        return;
      }

      try {
        const { data: created, error: createError } = await supabaseAdmin.auth.admin.createUser({
          email: String(email).trim(),
          password: String(password),
          email_confirm: true,
          user_metadata: {
            full_name: String(full_name).trim(),
            nip: nip ? String(nip).trim() : '',
            role,
            jabatan: jabatan ? String(jabatan).trim() : '',
          },
        });

        if (createError || !created.user) {
          res
            .status(400)
            .json({ error: createError?.message || 'Gagal membuat user di Supabase Auth.' });
          return;
        }

        const { data: profile, error: profileError } = await supabaseAdmin
          .from('profiles')
          .upsert(
            {
              id: created.user.id,
              email: created.user.email || String(email).trim(),
              full_name: String(full_name).trim(),
              nip: nip ? String(nip).trim() : '',
              role,
              jabatan: jabatan ? String(jabatan).trim() : '',
            },
            { onConflict: 'id' }
          )
          .select('*')
          .single();

        if (profileError) {
          await supabaseAdmin.auth.admin.deleteUser(created.user.id, false);
          res.status(500).json({ error: profileError.message });
          return;
        }

        res.status(201).json({
          user: {
            ...profile,
            last_sign_in_at: null,
            email_confirmed_at: created.user.email_confirmed_at || null,
          },
        });
      } catch (err) {
        res.status(500).json({
          error: err instanceof Error ? err.message : 'Gagal membuat user baru.',
        });
      }
    }
  );

  app.patch(
    '/api/admin/users/:id',
    verifyAuthToken,
    requireAdmin,
    async (req: AuthenticatedRequest, res: Response) => {
      const supabaseAdmin = createSupabaseAdmin();
      if (!supabaseAdmin) {
        res.status(503).json({ error: 'SUPABASE_SERVICE_ROLE_KEY belum diatur di server.' });
        return;
      }

      const { id } = req.params;
      const { email, password, full_name, nip, role, jabatan } = req.body || {};

      if (!full_name || !email || !role) {
        res.status(400).json({ error: 'Nama lengkap, email, dan role wajib diisi.' });
        return;
      }

      if (!['admin', 'guru', 'tenaga_kependidikan'].includes(role)) {
        res.status(400).json({ error: 'Role tidak valid.' });
        return;
      }

      if (password && String(password).length < 6) {
        res.status(400).json({ error: 'Password baru minimal 6 karakter.' });
        return;
      }

      try {
        const updatePayload: {
          email: string;
          email_confirm: boolean;
          password?: string;
          user_metadata: Record<string, string>;
        } = {
          email: String(email).trim(),
          email_confirm: true,
          user_metadata: {
            full_name: String(full_name).trim(),
            nip: nip ? String(nip).trim() : '',
            role,
            jabatan: jabatan ? String(jabatan).trim() : '',
          },
        };

        if (password && String(password).trim().length >= 6) {
          updatePayload.password = String(password).trim();
        }

        const { data: updatedAuth, error: authErr } =
          await supabaseAdmin.auth.admin.updateUserById(id, updatePayload);

        if (authErr) {
          res.status(400).json({ error: authErr.message });
          return;
        }

        const { data: updatedProfile, error: profileErr } = await supabaseAdmin
          .from('profiles')
          .upsert(
            {
              id,
              email: String(email).trim(),
              full_name: String(full_name).trim(),
              nip: nip ? String(nip).trim() : '',
              role,
              jabatan: jabatan ? String(jabatan).trim() : '',
              updated_at: new Date().toISOString(),
            },
            { onConflict: 'id' }
          )
          .select('*')
          .single();

        if (profileErr) {
          res.status(500).json({ error: profileErr.message });
          return;
        }

        res.json({
          user: {
            ...updatedProfile,
            last_sign_in_at: updatedAuth.user?.last_sign_in_at || null,
            email_confirmed_at: updatedAuth.user?.email_confirmed_at || null,
          },
        });
      } catch (err) {
        res.status(500).json({
          error: err instanceof Error ? err.message : 'Gagal memperbarui user.',
        });
      }
    }
  );

  app.delete(
    '/api/admin/users/:id',
    verifyAuthToken,
    requireAdmin,
    async (req: AuthenticatedRequest, res: Response) => {
      const supabaseAdmin = createSupabaseAdmin();
      if (!supabaseAdmin) {
        res.status(503).json({ error: 'SUPABASE_SERVICE_ROLE_KEY belum diatur di server.' });
        return;
      }

      const { id } = req.params;

      if (req.authUser?.id === id) {
        res.status(400).json({ error: 'Anda tidak dapat menghapus akun Admin yang sedang digunakan.' });
        return;
      }

      try {
        const { error: deleteAuthErr } = await supabaseAdmin.auth.admin.deleteUser(id, false);
        if (deleteAuthErr) {
          res.status(400).json({ error: deleteAuthErr.message });
          return;
        }

        await supabaseAdmin.from('profiles').delete().eq('id', id);

        res.json({ success: true, deletedId: id });
      } catch (err) {
        res.status(500).json({
          error: err instanceof Error ? err.message : 'Gagal menghapus user.',
        });
      }
    }
  );

  return app;
}

const app = createApiApp();

export default app;
