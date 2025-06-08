import type React from "react"
import type { Metadata } from "next"
import { Outfit } from "next/font/google"
import "./globals.css"
import Socials from '@/components/Socials'
import { AnimatedBackground } from "@/components/ui/animated-background"

const outfit = Outfit({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "Miit Daga",
  description: "Code that powers the unseen",
  icons: {
    icon: "/favicon.ico",
    shortcut: "/favicon.ico",
    apple: "/apple-touch-icon.png",
  },
    generator: 'v0.dev'
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <head>
        <meta name="description" content="Code that powers the unseen" />
      </head>
      <body className={outfit.className}>
        {children}
        <AnimatedBackground>
          <Socials />
        </AnimatedBackground>
      </body>
    </html>
  )
}
