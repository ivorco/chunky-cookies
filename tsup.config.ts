import { defineConfig } from "tsup";

export default defineConfig({
  entry: {
    index: "src/index.ts",
    "adapters/zustand": "src/adapters/zustand.ts",
    "wrappers/next": "src/wrappers/next.ts",
  },
  format: ["esm"],
  dts: true,
  clean: true,
  sourcemap: true,
  external: ["js-cookie", "next", "zustand"],
});
