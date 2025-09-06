import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react-swc";
import process from "node:process";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");

  return {
    plugins: [react()],
    server: {
      proxy: {
        "/api": {
          target:
            mode === "development"
              ? env.VITE_API_URL
              : import.meta.env.VITE_API_URL,
          changeOrigin: true,
          secure: false,
        },
      },
    },
  };
});
