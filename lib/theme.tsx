"use client";

import {
  MantineProvider,
  ColorSchemeScript,
} from "@mantine/core";
import { createTheme } from "@mantine/core";
import { useState, useEffect, createContext, useContext } from "react";

type ColorScheme = "light" | "dark";

const ThemeContext = createContext<{
  colorScheme: ColorScheme;
  toggle: () => void;
} | null>(null);

export default function ThemeProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [mode, setMode] = useState<ColorScheme>("light");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem("color-scheme");
    if (stored === "light" || stored === "dark") {
      setMode(stored);
    }
    setMounted(true);
  }, []);

  const toggle = () => {
    const next: ColorScheme = mode === "dark" ? "light" : "dark";
    setMode(next);
    localStorage.setItem("color-scheme", next);
  };

  const theme = createTheme({
    primaryColor: "blue",
    fontFamily: "var(--font-geist-sans)",
    defaultRadius: "md",
  });

  if (!mounted) return null;

  return (
    <>
      <ColorSchemeScript defaultColorScheme="light" />
      <MantineProvider theme={theme} forceColorScheme={mode}>
        <ThemeContext.Provider value={{ colorScheme: mode, toggle }}>
          {children}
        </ThemeContext.Provider>
      </MantineProvider>
    </>
  );
}

export function useThemeToggle() {
  const ctx = useContext(ThemeContext);
  if (!ctx)
    throw new Error("useThemeToggle must be used within ThemeProvider");
  return ctx;
}
