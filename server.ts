import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import { apiRouter } from './server/api.ts';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  // JSON Body Parser with 10mb limit for product images
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // API Routes
  app.use('/api', apiRouter);

  // Serve static public folder for uploads & logo
  app.use('/assets', express.static(path.resolve(__dirname, 'public/assets')));
  app.use(express.static(path.resolve(__dirname, 'public')));

  const isProduction = process.env.NODE_ENV === 'production';

  if (!isProduction) {
    // Development mode: Vite middleware
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        host: '0.0.0.0',
        port: PORT,
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
    console.log(`[Conserta Cell] Servidor de desenvolvimento iniciado com Vite na porta ${PORT}`);
  } else {
    // Production mode: Serve built dist folder
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
    console.log(`[Conserta Cell] Servidor de produção iniciado na porta ${PORT}`);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Conserta Cell Store rodando em http://localhost:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('[Conserta Cell] Falha ao iniciar servidor:', err);
  process.exit(1);
});
