import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { applyRelationalSchema, createApiApp, getSupabaseEnv } from './api/index';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = process.env.NODE_ENV === 'production' ? Number(process.env.PORT) || 3000 : 3000;

async function startServer() {
  const app = createApiApp();

  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(__dirname, 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  const { dbUrl } = getSupabaseEnv();
  if (dbUrl) {
    const migration = await applyRelationalSchema();
    console.log(`[Supabase DB] ${migration.message}`);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server SMK Prima Unggul berjalan di http://0.0.0.0:${PORT}`);
  });
}

startServer();
