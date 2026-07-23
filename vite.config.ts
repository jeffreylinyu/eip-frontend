import { fileURLToPath, URL } from "url";

import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import vueJsx from "@vitejs/plugin-vue-jsx";

function vendorChunk(id: string): string | undefined {
  if (!id.includes("node_modules")) return undefined;

  if (id.includes("@syncfusion")) return "vendor-syncfusion";
  if (id.includes("firebase") || id.includes("@firebase")) return "vendor-firebase";
  if (id.includes("@fullcalendar")) return "vendor-calendar";
  if (
    id.includes("jspdf") ||
    id.includes("pdfmake") ||
    id.includes("html2canvas") ||
    id.includes("jszip")
  ) {
    return "vendor-export";
  }
  if (
    id.includes("/vue/") ||
    id.includes("vue-router") ||
    id.includes("pinia") ||
    id.includes("@vue/")
  ) {
    return "vendor-vue";
  }

  return undefined;
}

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [vue(), vueJsx()],
  base: "/",
  server: {
    port: 5173,
    strictPort: true,
  },
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  optimizeDeps: {
    exclude: ["vue-demi"],
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: vendorChunk,
      },
    },
  },
});
