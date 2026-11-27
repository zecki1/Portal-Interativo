import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  // Subcaminho público (ex.: https://dominio/zecki/). Em dev fica "/".
  base: process.env.VITE_BASE || "/",
  plugins: [react()],
  server: { port: 5173 },
});
