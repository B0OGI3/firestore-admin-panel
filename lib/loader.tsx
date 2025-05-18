"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Loader, Center } from "@mantine/core";

export default function RouteLoader({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const prevPath = useRef<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const current = pathname;
    const hasChanged = prevPath.current && prevPath.current !== current;

    setLoading(true);

    // Wait until DOM paints at least 1 frame to clear the loader
    const raf = requestAnimationFrame(() => {
      // Optional delay
      const timeout = setTimeout(() => {
        setLoading(false);
        prevPath.current = current;
      }, hasChanged ? 300 : 0); // 0 delay on first load, 300ms on route change

      return () => clearTimeout(timeout);
    });

    return () => cancelAnimationFrame(raf);
  }, [pathname]);

  if (loading) {
    return (
      <Center style={{ height: "100vh" }}>
        <Loader size="lg" color="blue" />
      </Center>
    );
  }

  return <>{children}</>;
}
