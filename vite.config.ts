import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { "@": path.resolve(__dirname, "src") },
    // Prefer TypeScript source when both .ts/.tsx and transpiled .js siblings exist.
    extensions: [".mjs", ".ts", ".tsx", ".js", ".jsx", ".json"],
  },
  server: { port: 5173 },
});
