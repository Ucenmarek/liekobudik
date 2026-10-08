import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import "@fontsource-variable/figtree";
import "./globals.css";
import { AppShell } from "@/components/AppShell";

export const metadata: Metadata = {
  title: "Liekobudík",
  description: "Lieky v správny čas. Pripomenie každú dávku a stráži zásoby.",
  applicationName: "Liekobudík",
  appleWebApp: { capable: true, title: "Liekobudík", statusBarStyle: "default" },
  icons: {
    icon: [
      { url: "/icon.svg", type: "image/svg+xml" },
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
    ],
    apple: "/apple-touch-icon.png",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#eef3fb",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="sk">
      <body>
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
