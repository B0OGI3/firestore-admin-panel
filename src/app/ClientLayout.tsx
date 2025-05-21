"use client";

import { useAppTitle } from "@/lib/hooks/useAppTitle";
import { usePathname } from "next/navigation";
import Providers from "./providers";
import HeaderBar from "@/lib/header";
import RouteLoader from "@/lib/loader";
import { FirebaseErrorBoundary } from "@/lib/components/FirebaseErrorBoundary";
import { LoadingScreen } from "@/lib/components/LoadingScreen";
import { Suspense } from "react";

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  const { title, loading: titleLoading } = useAppTitle();
  const pathname = usePathname();

  return (
    <>
      <title>{title}</title>
      <Providers>
        <FirebaseErrorBoundary>
          <Suspense fallback={<LoadingScreen />}>
            {titleLoading ? (
              <LoadingScreen message="Initializing application..." />
            ) : (
              <>
                {pathname !== "/login" && <HeaderBar />}
                <RouteLoader>{children}</RouteLoader>
              </>
            )}
          </Suspense>
        </FirebaseErrorBoundary>
      </Providers>
    </>
  );
} 