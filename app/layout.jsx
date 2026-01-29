import "./globals.css";
import { Inter } from "next/font/google";

const inter = Inter({ subsets: ["latin"], weight: ["400", "600", "700"] });

export const metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"),
  title: "IA Sin Líos · 14/02/2026 11:30 · Almuñécar",
  description:
    "Charla práctica en Almuñécar para autónomos, pequeños negocios y familias. Sal con atajos listos para mensajes, reseñas, carteles y organización diaria. 14/02/2026 · 11:30 · 90 min · 30 plazas · 5€.",
  openGraph: {
    title: "IA Sin Líos · Almuñécar",
    description:
      "90 min prácticos para ahorrar tiempo con IA (mensajes, reseñas, carteles y organización). 14/02/2026 · 11:30 · 5€ · 30 plazas.",
    type: "website",
    images: ["/assets/tecrural-logo.png"],
  },
};

export const viewport = {
  themeColor: "#327F4C",
};

export default function RootLayout({ children }) {
  return (
    <html lang="es">
      <head />
      <body className={inter.className}>{children}</body>
    </html>
  );
}
