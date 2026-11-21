import { defineConfig, loadEnv, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.dirname(fileURLToPath(import.meta.url));

/**
 * In production, Vercel serves the files in /api as serverless functions.
 * During `npm run dev` this plugin routes /api/* requests to the same files,
 * so the Ask assistant works locally without the Vercel CLI.
 */
function localApiRoutes(): Plugin {
  return {
    name: 'local-api-routes',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const url = new URL(req.url ?? '/', 'http://localhost');
        const match = /^\/api\/([a-z-]+)$/.exec(url.pathname);
        if (!match) return next();

        try {
          const mod = await server.ssrLoadModule(`/api/${match[1]}.ts`);
          const handler = mod[req.method ?? 'GET'] as ((request: Request) => Promise<Response>) | undefined;
          if (!handler) {
            res.statusCode = 405;
            return res.end('Method not allowed');
          }

          const chunks: Buffer[] = [];
          for await (const chunk of req) chunks.push(chunk as Buffer);
          const headers = new Headers();
          for (const [key, value] of Object.entries(req.headers)) {
            if (typeof value === 'string') headers.set(key, value);
          }
          const request = new Request(url, {
            method: req.method,
            headers,
            body: chunks.length ? Buffer.concat(chunks) : undefined,
          });

          const response = await handler(request);
          res.statusCode = response.status;
          response.headers.forEach((value, key) => res.setHeader(key, value));
          res.end(Buffer.from(await response.arrayBuffer()));
        } catch (error) {
          next(error as Error);
        }
      });
    },
  };
}

export default defineConfig(({ mode }) => {
  // Expose server-only variables (ANTHROPIC_API_KEY etc.) to the local API routes.
  Object.assign(process.env, loadEnv(mode, root, ''));

  return {
    plugins: [react(), tailwindcss(), localApiRoutes()],
    resolve: { alias: { '@': path.resolve(root, 'src') } },
  };
});
