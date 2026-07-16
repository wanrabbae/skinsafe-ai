import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "SkinSafe AI",
    short_name: "SkinSafe",
    description: "Cek keamanan skincare sebelum dibeli atau dipakai.",
    start_url: "/",
    display: "standalone",
    background_color: "#f5fbf7",
    theme_color: "#146b4c",
    lang: "id-ID",
    icons: [
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" },
      { src: "/icon-maskable.svg", sizes: "any", type: "image/svg+xml", purpose: "maskable" },
    ],
  };
}
