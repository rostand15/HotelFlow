import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// O front chama /api/... e o Vite repassa para o backend (evita problema de CORS no dev).
export default defineConfig({
  plugins: [react()],
  server: { port: 5173, proxy: { "/api": "http://localhost:3333" } },
});
