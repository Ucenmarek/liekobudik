"use client";

import { Suspense, useEffect, useState, type ReactNode } from "react";
import { AppIcon } from "./Icons";
import { PushSync } from "./PushSync";
import { Reminder } from "./Reminder";

/**
 * Appka beží celá v prehliadači (údaje sú v IndexedDB), preto sa obsah
 * vykreslí až po načítaní v zariadení.
 */
export function AppShell({ children }: { children: ReactNode }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    if (process.env.NODE_ENV === "production" && "serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }
  }, []);

  if (!mounted) {
    return (
      <div className="app">
        <div className="splash">
          <AppIcon size={96} />
        </div>
      </div>
    );
  }

  return (
    <div className="app">
      <Suspense fallback={null}>{children}</Suspense>
      <Reminder />
      <PushSync />
    </div>
  );
}
