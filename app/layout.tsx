import type { Metadata } from "next";
import { Outfit } from "next/font/google";
import "./globals.css";
import { Socials } from "@/components";

const outfit = Outfit({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Miit Daga",
  description: "Embrace the algorithms",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={outfit.className}>
        {children}
        <Socials />
      </body>
    </html>
  );
}
