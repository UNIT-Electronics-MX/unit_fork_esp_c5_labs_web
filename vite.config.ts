import { fileURLToPath } from "node:url";
import babel from "@rolldown/plugin-babel";
import react, { reactCompilerPreset } from "@vitejs/plugin-react";
import { loadEnv } from "vite";
import { defineConfig } from "vitest/config";
import { firmwarePlugin } from "./tools/firmware/vite-plugin.ts";

// React Compiler memoizes components and hooks at build time, so the code stays free of
// hand-written useMemo/useCallback. `base: "./"` keeps every asset URL relative: the build
// works from any static host, in any subfolder, or a claude.ai artifact, with no rewrite rules.
// FIRMWARE_DIR: the firmware checkout whose sources the code reader shows (build-time only).
export default defineConfig(({ mode }) => ({
  base: "./",
  plugins: [
    react(),
    babel({ presets: [reactCompilerPreset()] }),
    firmwarePlugin({
      // Published builds must include the code reader's firmware; local builds may omit it.
      required: process.env.FIRMWARE_REQUIRED === "1",
      root: fileURLToPath(
        new URL(loadEnv(mode, process.cwd(), "").FIRMWARE_DIR || "../esp-labs", import.meta.url),
      ),
    }),
  ],
  resolve: { alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) } },
  build: {
    target: "es2023",
    sourcemap: true,
    rolldownOptions: {
      output: {
        // Long-lived vendor chunks: lesson code changes far more often than React does.
        codeSplitting: {
          groups: [
            { name: "react", test: /node_modules[\\/](react|react-dom|scheduler)[\\/]/ },
            { name: "router", test: /node_modules[\\/]react-router[\\/]/ },
            { name: "query", test: /node_modules[\\/]@tanstack[\\/]/ },
          ],
        },
      },
    },
  },
  server: { port: 5180 },
  test: {
    environment: "jsdom",
    exclude: ["**/node_modules/**", "dist/**", "public/**"],
    setupFiles: ["./src/test/setup.ts"],
    // Route tests render whole pages and their lazy chunks; a cold run transforms them first.
    testTimeout: 15_000,
    css: { modules: { classNameStrategy: "non-scoped" } },
  },
}));
