import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";

import GlobalBrandBar from "@/components/common/global-brand-bar";

import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Auko-Tex Central Portal",
  description:
    "Auko-Tex Group Centralized Internal Management System",
};

export default function RootLayout({
  children,
}: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full bg-[#f4f4f4]">

        {/* GLOBAL BRAND / HOME LINK */}

        <GlobalBrandBar />

        {/* PAGE CONTENT */}

        {children}

      </body>
    </html>
  );
}