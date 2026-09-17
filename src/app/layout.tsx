import type { Metadata, Viewport } from "next";
import { Nunito, Inter } from "next/font/google";
import "./globals.css";

const nunito = Nunito({
  variable: "--font-nunito",
  subsets: ["latin"],
  weight: ["600", "700", "800"],
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

export const metadata: Metadata = {
  title: "Zap da Obra",
  description: "O jeito mais simples de organizar sua obra.",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: "Zap da Obra",
    statusBarStyle: "default",
  },
};

// Mobile-first é premissa do projeto (D58): o app abre como app, não como site.
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#1F5C57",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="pt-BR" className={`${nunito.variable} ${inter.variable} antialiased`}>
      <body className="flex h-[100dvh] flex-col overflow-hidden">{children}</body>
    </html>
  );
}
