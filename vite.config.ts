import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  clearScreen: false,
  server: {
    port: 1420,
    strictPort: true,
    // The Rust side has its own watcher; scanning src-tauri/target makes startup crawl.
    watch: { ignored: ["**/src-tauri/**"] },
  },
  optimizeDeps: { entries: ["index.html"] },
  build: { target: "es2021" },
  test: {
    environment: "jsdom",
    setupFiles: ["./src/test-setup.ts"],
    globals: true,
  },
} as any);
