import { defineConfig } from "vite";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  base: "/chunky-cookies/",
  resolve: {
    alias: {
      "chunky-cookies/zustand": path.resolve(
        __dirname,
        "../src/adapters/zustand.ts"
      ),
      "chunky-cookies/next": path.resolve(
        __dirname,
        "../src/wrappers/next.ts"
      ),
      "chunky-cookies": path.resolve(__dirname, "../src/index.ts"),
    },
  },
});
