import { defineConfig } from "vite";
import path from "path";

export default defineConfig({
  root: "demo",
  base: "/vector-rendering/",
  resolve: {
    alias: {
      polyrender: path.resolve(__dirname, "src"),
    },
  },
  build: {
    outDir: "../dist",
    emptyOutDir: true,
    rollupOptions: {
      input: {
        index: path.resolve(__dirname, "demo/index.html"),
        hybrid: path.resolve(__dirname, "demo/assets/hybrid.html"),
        gpu: path.resolve(__dirname, "demo/assets/gpu.html"),
        cpu: path.resolve(__dirname, "demo/assets/cpu.html"),
      },
    },
  },
});