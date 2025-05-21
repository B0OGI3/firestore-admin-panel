import { Inter } from "next/font/google";
import "./globals.css";
import "@mantine/core/styles.css";
import "@mantine/notifications/styles.css";
import Script from "next/script";
import { ColorSchemeScript } from "@mantine/core";
import ClientLayout from "./ClientLayout";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
});

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.className}>
      <head>
        <ColorSchemeScript />
        <meta name="description" content="Manage your Firestore data" />
        <Script
          src="https://www.google.com/recaptcha/api.js"
          strategy="beforeInteractive"
        />
      </head>
      <body style={{ margin: 0, padding: 0, height: '100vh' }}>
        <ClientLayout>{children}</ClientLayout>
      </body>
    </html>
  );
}
