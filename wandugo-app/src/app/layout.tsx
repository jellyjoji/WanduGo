import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { LocationProvider } from "@/contexts/LocationContext";
import { AuthProvider } from "@/contexts/AuthContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import BottomNav from "@/components/BottomNav";
import AuthModal from "@/components/AuthModal";
import InstallPrompt from "@/components/InstallPrompt";
import ServiceWorkerRegister from "@/components/ServiceWorkerRegister";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "WanduGo - Local Community Platform",
  description:
    "Location-based community platform for Canadians. Find jobs, housing, events, and connect with people nearby.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "WanduGo",
  },
  formatDetection: { telephone: false },
  icons: {
    icon: "/icon.svg",
    apple: "/apple-icon.svg",
  },
};

export const viewport = {
  themeColor: "#2563eb",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col bg-gray-50 dark:bg-slate-950">
        <ThemeProvider>
          <AuthProvider>
            <LocationProvider>
              <main className="flex-1">{children}</main>
              <BottomNav />
              <AuthModal />
              <InstallPrompt />
              <ServiceWorkerRegister />
            </LocationProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
