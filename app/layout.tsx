import type { Metadata } from "next";
import { Outfit } from "next/font/google";
import "./globals.css";
import { Socials } from "@/components";

const outfit = Outfit({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Miit Daga",
  description: "Code that powers the unseen",
  icons: {
    icon: "/favicon.ico",
    shortcut: "/favicon.ico",
    apple: "/apple-touch-icon.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <head>
        <meta name="description" content="Code that powers the unseen" />
      </head>
      <body className={outfit.className}>
        {children}
        <Socials />
      </body>
    </html>
  );
}
