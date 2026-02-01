import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  build: {
    // IMPORTANT: keep /assets for legacy static pages
    // put Vite hashed bundle files under /spa instead
    assetsDir: "spa",
  },
  server: {
    proxy: {
      "/api": { target: "http://localhost:4000", changeOrigin: true },
    },
  },
});