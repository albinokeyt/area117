import type { Metadata } from "next";
import "./globals.css";
import "./crystal.css";
import "./notch.css";

export const metadata: Metadata = {
  title: "EFI DATA OIL - Gestión de Precios de Combustible",
  description: "Sistema de gestión diaria de compras, postes y tarifas de combustible para EFI DATA OIL.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
