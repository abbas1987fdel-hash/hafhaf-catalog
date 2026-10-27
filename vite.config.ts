import { defineConfig } from "vite";
export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        legacyStore: "index.html",
        legacyAdmin: "admin.html",
        store: "store/index.html",
        admin: "admin/index.html",
      },
    },
  },
});
