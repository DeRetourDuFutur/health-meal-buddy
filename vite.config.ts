import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [
    react(),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes("node_modules")) {
            if (id.includes("react-router-dom") || id.includes("react-router")) return "router-vendor";
            if (id.includes("@tanstack")) return "react-query-vendor";
            if (id.includes("@radix-ui")) return "radix-vendor";
            if (id.includes("@supabase/supabase-js")) return "supabase-vendor";
            if (id.includes("recharts")) return "charts-vendor";
            if (id.includes("lucide-react")) return "icons-vendor";
            if (id.includes("react-dom")) return "react-dom-vendor";
            if (id.includes("react")) return "react-vendor";
          }

          // Optionnel: chunks par page pour les vues lourdes
          if (id.includes("/src/pages/")) {
            const after = id.split("/src/pages/")[1];
            if (after) {
              const base = after.split("/")[0];
              const name = base.split(".")[0];
              return `page-${name.toLowerCase()}`;
            }
          }
        },
      },
    },
  },
}));
