import type { ReactNode } from "react";
import type { Metadata } from "next";
import { RetroShell } from "@/components/RetroShell";
import "./globals.css";

export const metadata: Metadata = {
  title: "ainovell.bostoncrew.ru",
  description:
    "Интерактивная AI-визуальная новелла в ретро-интерфейсе Windows 95.",
  applicationName: "ainovell.bostoncrew.ru",
  icons: {
    icon: [
      { url: "/favicon.ico", type: "image/x-icon", sizes: "any" },
      { url: "/icon.ico", type: "image/x-icon", sizes: "any" },
      { url: "/icon.png", type: "image/png", sizes: "32x32" },
    ],
    shortcut: [{ url: "/favicon.ico", type: "image/x-icon" }],
    apple: [{ url: "/icon.png", type: "image/png", sizes: "32x32" }],
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
