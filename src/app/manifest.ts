import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Zap da Obra",
    short_name: "Zap da Obra",
    description: "O jeito mais simples de organizar sua obra.",
    start_url: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#F4F1EA",
    theme_color: "#1F5C57",
    icons: [
      { src: "/icones/192", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icones/512", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
