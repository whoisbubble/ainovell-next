import type { ReactNode } from "react";
import type { Metadata } from "next";
import { RetroShell } from "@/components/RetroShell";
import "./globals.css";

export const metadata: Metadata = {
  title: "ainovell.bostoncrew.ru",
  description: "Интерактивная AI-визуальная новелла в ретро-интерфейсе Windows 95.",
  icons: {
    icon: "/favicon.ico",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <html lang="ru">
      <body>
        <RetroShell>{children}</RetroShell>
      </body>
    </html>
  );
}
