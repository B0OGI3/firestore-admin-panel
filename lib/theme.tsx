"use client";

import {
  MantineProvider,
  ColorSchemeScript,
  createTheme,
} from "@mantine/core";
import { useState, useEffect, createContext, useContext } from "react";

type ColorScheme = "light" | "dark";

interface ThemeContextType {
  colorScheme: ColorScheme;
  toggle: () => void;
}

const ThemeContext = createContext<ThemeContextType | null>(null);

export default function ThemeProvider({
  children,
}: {
  children: React.ReactNode;
}): JSX.Element | null {
  const [mode, setMode] = useState<ColorScheme>("light");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem("color-scheme");
    if (stored === "light" || stored === "dark") {
      setMode(stored as ColorScheme);
    } else {
      // Check system preference
      const systemPreference: ColorScheme = window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
      setMode(systemPreference);
      localStorage.setItem("color-scheme", systemPreference);
    }
    setMounted(true);
  }, []);

  const toggle = (): void => {
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
      <ColorSchemeScript />
      <MantineProvider 
        theme={theme}
        forceColorScheme={mode}
      >
        <ThemeContext.Provider value={{ colorScheme: mode, toggle }}>
          {children}
        </ThemeContext.Provider>
      </MantineProvider>
    </>
  );
}

export function useThemeToggle(): ThemeContextType {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error("useThemeToggle must be used within ThemeProvider");
  }
  return ctx;
}
