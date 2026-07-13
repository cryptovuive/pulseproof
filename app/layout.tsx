import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "PulseProof — every match leaves a memory",
  description: "A TxLINE-powered live second screen with verifiable Proof of Watch on Solana.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
