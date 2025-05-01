import type { Metadata, Viewport } from "next";
import type { JSX, ReactNode } from "react";
import { Inter } from "next/font/google";
import { cn } from "@/lib/utils";
import { Toaster } from "@/components/ui/sonner";
import './globals.css'
export const metadata: Metadata = {
  title: "Chapter",
  description: "Making learning better",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1.0,
};

const fontSans = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
});

export default function RootLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>): JSX.Element {
  return (
    <html lang="en">
      <body
        className={cn(
          "min-h-screen bg-background font-sans antialiased",
          fontSans.variable,
        )}
      >
        {children}
        <Toaster richColors={true} />
      </body>
    </html>
  );
}
