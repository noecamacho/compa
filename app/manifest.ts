import type { MetadataRoute } from "next";

// Lets people add COMPA to the Home Screen; on iPhone that installed app is the only place Web Push works (T-080).
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "COMPA",
    short_name: "COMPA",
    start_url: "/home",
    display: "standalone",
    background_color: "#FFF6E5",
    theme_color: "#FFF6E5",
    icons: [{ src: "/icon.png", sizes: "512x512", type: "image/png" }],
  };
}
