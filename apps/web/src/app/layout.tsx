import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Crowanzas · Tus gastos, con claridad",
  description: "Registra tus gastos y consulta un resumen diario sencillo.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="es"><body>{children}</body></html>;
}
