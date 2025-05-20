"use client";

import { Inter } from "next/font/google";
import "./globals.css";
import "@mantine/core/styles.css";
import "@mantine/notifications/styles.css";
import Providers from "./providers";
import HeaderBar from "@/lib/header";
import RouteLoader from "@/lib/loader";
import { useAppTitle } from "@/lib/hooks/useAppTitle";
import { usePathname } from "next/navigation";
import Script from "next/script";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
});

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const { title } = useAppTitle();
  const pathname = usePathname();

  return (
    <html lang="en" className={inter.className}>
      <head>
        <title>{title}</title>
        <meta name="description" content="Manage your Firestore data" />
        <Script
          src="https://www.google.com/recaptcha/api.js"
          strategy="beforeInteractive"
        />
      </head>
      <body style={{ margin: 0, padding: 0, height: '100vh' }}>
        <Providers>
          {pathname !== "/login" && <HeaderBar />}
          <RouteLoader>{children}</RouteLoader>
        </Providers>
      </body>
    </html>
  );
}
