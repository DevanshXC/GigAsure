import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from "@/context/AuthContext";
import { PolicyProvider } from "@/context/PolicyContext";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: '--font-inter' });

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export const metadata: Metadata = {
  title: "GigaSure",
  description: "Income protection for delivery workers",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "GigaSure",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.variable} font-sans antialiased`}>
        <AuthProvider>
          <PolicyProvider>
            <Toaster position="top-center" />
            {children}
          </PolicyProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
