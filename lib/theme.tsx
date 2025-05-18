"use client";

import {
  MantineProvider,
  ColorSchemeScript,
} from "@mantine/core";
import { createTheme } from "@mantine/core";
import { useState, createContext, useContext } from "react";

const ThemeContext = createContext<{
  colorScheme: "light" | "dark";
  toggle: () => void;
} | null>(null);

export default function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [mode, setMode] = useState<"light" | "dark">("dark");

  const toggle = () => {
    const next = mode === "dark" ? "light" : "dark";
    setMode(next);
    localStorage.setItem("color-scheme", next);
  };

  const theme = createTheme({
    primaryColor: "blue",
    fontFamily: "var(--font-geist-sans)",
    defaultRadius: "md",
  });

  // move hook INSIDE MantineProvider render tree
  return (
    <>
      <ColorSchemeScript defaultColorScheme="dark" />
      <MantineProvider theme={theme} defaultColorScheme="dark" forceColorScheme={mode}>
        <ThemeContext.Provider value={{ colorScheme: mode, toggle }}>
          {children}
        </ThemeContext.Provider>
      </MantineProvider>
    </>
  );
}

export function useThemeToggle() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useThemeToggle must be used within ThemeProvider");
  return ctx;
}
