import type { Metadata, Viewport } from "next";
import { MobileNavigation } from "@/shared/components/mobile-navigation";
import { ServiceWorkerRegister } from "@/shared/components/service-worker-register";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "SkinSafe AI", template: "%s · SkinSafe AI" },
  description: "Cek keamanan skincare sebelum dibeli atau dipakai.",
  applicationName: "SkinSafe AI",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: "SkinSafe AI",
    statusBarStyle: "default",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#6d28d9",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id">
      <body>
        <div className="app-frame">{children}</div>
        <MobileNavigation />
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}
