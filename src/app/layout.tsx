import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import "@mantine/core/styles.css";
import "@mantine/notifications/styles.css";
import Providers from "./providers";
import HeaderBar from "@/lib/header";
import RouteLoader from "@/lib/loader";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Firestore Admin Panel",
  description: "Manage your Firestore data",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.className}>
      <body>
        <Providers>
          <HeaderBar />
          <RouteLoader>{children}</RouteLoader>
        </Providers>
      </body>
    </html>
  );
}
