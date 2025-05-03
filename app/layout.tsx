import type React from "react";
import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { cn } from "@/lib/utils";
import { Toaster } from "sonner"; // Use sonner directly
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";

const inter = Inter({
  // Changed variable name to match target
  subsets: ["latin"],
  variable: "--font-sans",
});

export const metadata: Metadata = {
  title: "Chapters | AI Document Teaching Assistant", // Updated title
  description:
    "Learn from any document with AI-powered chapter explanations and interactive Q&A", // Updated description
  // Add favicon link if you have one in public/
  // icons: {
  //   icon: "/favicon.ico",
  // },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1.0,
  themeColor: [
    // Added themeColor from target
    { media: "(prefers-color-scheme: light)", color: "white" },
    { media: "(prefers-color-scheme: dark)", color: "#0f172a" }, // Example dark color
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    // Add suppressHydrationWarning if using next-themes
    <html lang="en" suppressHydrationWarning>
      <body
        className={cn(
          "min-h-screen bg-background font-sans antialiased",
          inter.variable, // Use the correct font variable
        )}
      >
        {/* Wrap with ThemeProvider */}
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          {children}
          {/* Position Sonner toaster */}
          <Toaster richColors position="top-center" />
        </ThemeProvider>
      </body>
    </html>
  );
}
