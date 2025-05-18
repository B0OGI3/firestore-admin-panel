import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import "@mantine/core/styles.css";
import ThemeProvider from "@/lib/theme";
import HeaderBar from "@/lib/header";
import RouteLoader from "@/lib/loader";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});
const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Firestore Admin Panel",
  description: "Manage your Firestore data",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable}`}>
      <body>
        <ThemeProvider>
          <HeaderBar />
          <RouteLoader>{children}</RouteLoader>
        </ThemeProvider>
      </body>
    </html>
  );
}
