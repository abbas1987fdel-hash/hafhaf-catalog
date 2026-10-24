import { defineConfig } from "vite";
export default defineConfig({
  build: {
    rollupOptions: { input: { store: "index.html", admin: "admin.html" } },
  },
});
