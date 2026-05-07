import { defineConfig } from "vite";
import path from "path";

export default defineConfig({
  root: "src",
  base: "/vector-rendering/",
  publicDir: path.resolve(__dirname, "public"),
  resolve: {
    alias: {
      polyrender: path.resolve(__dirname, "src/lib"),
    },
  },
  build: {
    outDir: "../dist",
    emptyOutDir: true,
    rollupOptions: {
      input: {
        index: path.resolve(__dirname, "src/index.html"),
        hybrid: path.resolve(__dirname, "src/hybrid.html"),
        gpu: path.resolve(__dirname, "src/gpu.html"),
        cpu: path.resolve(__dirname, "src/cpu.html"),
      },
    },
  },
});