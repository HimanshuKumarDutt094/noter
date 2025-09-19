import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { defineConfig } from "vite";
import { defineConfig as defineTestConfig, mergeConfig } from "vitest/config";
import pkg from "./package.json";
type Pkg = { name?: string };

// https://vite.dev/config/
const base = defineConfig({
  plugins: [react(), tailwindcss()],
  assetsInclude: ["**/*.wasm", "**/*.data"],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  optimizeDeps: {
    exclude: ["@electric-sql/pglite"],
  },
});

const testCfg = defineTestConfig({
  test: {
    name: (pkg as Pkg).name,
    dir: `./tests`,
    environment: `jsdom`,
    setupFiles: [`tests/setup-fake-indexeddb.ts`],
    // Run tests in the same thread to avoid IndexedDB delete/close races
    threads: false,
    coverage: { enabled: true, provider: `istanbul`, include: [`src/**/*`] },
    typecheck: { enabled: true },
  },
});

export default mergeConfig(base, testCfg);
