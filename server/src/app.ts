import express from 'express';
import cors from 'cors';
import { apiRouter } from './routes';
import { openApiSpec } from './config/swagger';
import { swaggerUiHtml } from './docs/swaggerUi';

export function createApp() {
  const app = express();

  app.use(cors());
  app.use(express.json());

  // Swagger/OpenAPI
  app.get('/api-docs.json', (req, res) => {
    // Provide a server URL that matches the current host (useful behind tunnels/proxies).
    const serverUrl = `${req.protocol}://${req.get('host')}`;
    res.json({ ...openApiSpec, servers: [{ url: serverUrl }] });
  });

  app.get(['/api-docs', '/docs'], (_req, res) => {
    res.type('html').send(
      swaggerUiHtml({
        title: 'HalfRide Server API Docs',
        specUrl: '/api-docs.json',
      })
    );
  });

  // API routes (keep existing paths under /api/*)
  app.use('/api', apiRouter);

  // Basic error handler (avoid Express default HTML error pages)
  app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    console.error(err);
    res.status(500).json({ ok: false, error: 'Internal Server Error', message: err?.message ?? 'Unknown error' });
  });

  return app;
}
