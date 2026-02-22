import type { Metadata } from "next";
import { Inter, Space_Grotesk } from "next/font/google";
import { Providers } from "@/components/providers";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const spaceGrotesk = Space_Grotesk({
  variable: "--font-space",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "Hound - AI-Powered Test Automation",
  description:
    "Author, run, and debug end-to-end tests with AI-powered element targeting and natural language steps.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="antialiased">
      <body
        className={`${inter.variable} ${spaceGrotesk.variable} font-sans antialiased selection:bg-primary/10`}
      >
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
