import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Wellness Journal",
    short_name: "Wellness",
    description: "Private wellness, meal, body, and workout journal.",
    start_url: "/today",
    display: "standalone",
    background_color: "#f7f3e8",
    theme_color: "#47776b",
    orientation: "portrait-primary",
    icons: [
      {
        src: "/wellness-app-icon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "any",
      },
      {
        src: "/wellness-app-icon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "maskable",
      },
    ],
  };
}
