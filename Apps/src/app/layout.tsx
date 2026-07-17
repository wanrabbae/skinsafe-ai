import type { Metadata, Viewport } from "next";
import { DomMutationGuard } from "@/shared/components/dom-mutation-guard";
import { MobileNavigation } from "@/shared/components/mobile-navigation";
import { QueryProvider } from "@/shared/components/query-provider";
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
    <html lang="id" translate="no">
      <body>
        <DomMutationGuard />
        <QueryProvider>
          <div className="relative mx-auto min-h-[100svh] max-w-[440px] overflow-hidden bg-surface min-[700px]:shadow-[0_0_0_1px_rgb(109_40_217/6%),0_24px_70px_rgb(37_0_89/12%)]">
            {children}
          </div>
          <MobileNavigation />
          <ServiceWorkerRegister />
        </QueryProvider>
      </body>
    </html>
  );
}
