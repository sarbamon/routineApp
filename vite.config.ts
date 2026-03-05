import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import tailwindcss from "@tailwindcss/vite";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),

    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["icon-192.png", "icon-512.png"],

      manifest: {
        id: "/",  // ✅ fixes app id warning
        name: "Routine App",
        short_name: "Routine",
        description: "Daily routine manager",
        start_url: "/",
        display: "standalone",
        background_color: "#ffffff",
        theme_color: "#0f172a",

        icons: [
          {
            src: "/icon-192.png",
            sizes: "192x192",
            type: "image/png"
          },
          {
            src: "/icon-512.png",
            sizes: "512x512",
            type: "image/png"
          }
        ],

    screenshots: [   // ✅ ADD HERE
    {
      src: "/screenshot1.png",
      sizes: "1280x720",
      type: "image/png",
      form_factor: "wide"
    }
  ]
      }
    })
  ]
});