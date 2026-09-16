import type { Metadata, Viewport } from "next";
import "./globals.css";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
  themeColor: "#070709",
};

export const metadata: Metadata = {
  title: "Kiss My Cheek — Exclusive Dating & Social Club",
  description: "Meaningful Connections, Exceptionally Curated. The premier private members club for luxury dating, elite networking, and curated social experiences.",
  keywords: ["Luxury Dating", "Exclusive Social Club", "Elite Dating", "Private Members Club", "Curated Connections"],
  authors: [{ name: "Kiss My Cheek Inc." }],
  openGraph: {
    title: "Kiss My Cheek — Exclusive Dating & Social Club",
    description: "Meaningful Connections, Exceptionally Curated.",
    siteName: "Kiss My Cheek",
    locale: "en_US",
    type: "website",
  },
};

import { SplashScreen } from "@/components/ui/SplashScreen";
import { AppBackButtonHandler } from "@/components/ui/AppBackButtonHandler";
import { InactivityManager } from "@/components/ui/InactivityManager";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark scroll-smooth h-full" data-scroll-behavior="smooth" suppressHydrationWarning>
      <body className="min-h-screen bg-[#070709] text-[#F4F4F6] font-sans antialiased selection:bg-[#D4AF37] selection:text-black flex flex-col" suppressHydrationWarning>
        <AppBackButtonHandler />
        <InactivityManager />
        <SplashScreen />
        {children}
      </body>
    </html>
  );
}
