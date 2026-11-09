import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  // En développement, /api et /health sont redirigés vers l'API : pas de problème de CORS.
  const target = env.VITE_PROXY_TARGET || "http://127.0.0.1:8000";
  return {
    plugins: [react()],
    server: { port: 5173, proxy: { "/api": target, "/health": target } },
    test: {
      environment: "jsdom",
      globals: true,
      setupFiles: "./src/test/setup.js",
    },
  };
});
