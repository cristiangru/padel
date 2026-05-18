import "./globals.css";
import { Orbitron, Rajdhani } from "next/font/google";

const orbitron = Orbitron({ subsets: ["latin"], variable: "--font-orbitron", weight: ["700", "900"] });
const rajdhani = Rajdhani({ subsets: ["latin"], variable: "--font-rajdhani", weight: ["400", "600", "700"] });

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ro" className={`${orbitron.variable} ${rajdhani.variable}`}>
      <body className="bg-[#0a0a0f]">{children}</body>
    </html>
  );
}