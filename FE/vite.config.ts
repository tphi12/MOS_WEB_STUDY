import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { getHttpsServerOptions } from "office-addin-dev-certs";

export default defineConfig(async () => {
  const https = process.env.NODE_ENV === "production" ? undefined : await getHttpsServerOptions();

  return {
    plugins: [react()],
    server: {
      https,
      proxy: {
        "/api": "http://localhost:4000",
        "/health": "http://localhost:4000",
      },
    },
  };
});
