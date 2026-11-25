import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: "Restaurant ERP | Gestión gastronómica",
  description:
    "Plataforma de gestión gastronómica multiempresa y multisucursal, en preparación para piloto.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
