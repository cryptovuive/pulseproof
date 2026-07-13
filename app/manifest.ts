import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "PulseProof — Every Match Leaves a Memory",
    short_name: "PulseProof",
    id: "/",
    lang: "en",
    description: "A TxLINE-powered matchday companion with spoiler-safe Catch-up and verifiable Proof of Watch.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#0c0e0d",
    theme_color: "#d9ff43",
    orientation: "any",
    categories: ["sports", "entertainment"],
    icons: [
      { src: "/pulseproof-mark.svg", sizes: "any", type: "image/svg+xml", purpose: "any" },
      { src: "/pulseproof-mark.svg", sizes: "any", type: "image/svg+xml", purpose: "maskable" },
    ],
    shortcuts: [
      { name: "Match Center", short_name: "Matches", url: "/#match-center", icons: [{ src: "/pulseproof-mark.svg", sizes: "any", type: "image/svg+xml" }] },
      { name: "Matchday Command Center", short_name: "Command", url: "/#command-center", icons: [{ src: "/pulseproof-mark.svg", sizes: "any", type: "image/svg+xml" }] },
    ],
  };
}
