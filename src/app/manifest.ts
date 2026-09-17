import type { MetadataRoute } from "next";
import { TOKENS } from "@/lib/tokens";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Zap da Obra",
    short_name: "Zap da Obra",
    description: "O jeito mais simples de organizar sua obra.",
    start_url: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: TOKENS.bgPaper,
    theme_color: TOKENS.primary,
    icons: [
      {
        src: "/assets/logo/app-icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/assets/logo/app-icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/assets/logo/app-icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
