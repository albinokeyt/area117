import type { Metadata } from "next";
import "./globals.css";

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
    <html lang="es" className="h-full antialiased dark">
      <body className="min-h-full flex flex-col bg-slate-950 text-slate-100">{children}</body>
    </html>
  );
}
