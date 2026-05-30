import { reactRouter } from "@react-router/dev/vite";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  // Dev-only proxy to the local IBKR Client Portal Gateway (self-signed cert).
  // Lets browser-side calls to /ibkr/* reach the gateway. Server-side loaders
  // call the gateway directly; this is for any client-side fetches.
  server: {
    proxy: {
      '/ibkr': {
        target: 'https://localhost:5000',
        changeOrigin: true,
        secure: false, // accept the gateway's self-signed cert
        rewrite: (p) => p.replace(/^\/ibkr/, '/v1/api'),
      },
    },
  },
  plugins: [
    {
      name: 'ignore-well-known',
      configureServer(server) {
        server.middlewares.use((req, res, next) => {
          if (req.url?.startsWith('/.well-known/')) {
            res.statusCode = 404;
            res.end();
            return;
          }
          next();
        });
      },
    },
    tailwindcss(),
    reactRouter(),
    tsconfigPaths(),
  ],
});
