"use client";

import { Notifications } from "@mantine/notifications";
import { ReactNode } from "react";
import ThemeProvider from "@/lib/theme";

export default function Providers({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider>
      <Notifications />
      {children}
    </ThemeProvider>
  );
}
