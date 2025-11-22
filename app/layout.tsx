import type React from "react"
import type { Metadata } from "next"
import { Outfit } from "next/font/google"
import { Analytics } from "@vercel/analytics/react"
import { SpeedInsights } from "@vercel/speed-insights/next"
import "./globals.css"
import { ThemeProvider } from "@/components/theme-provider"
import { CommandMenu } from "@/components/ui/command-menu"

const outfit = Outfit({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "Miit Daga",
  description: "Code that powers the unseen",
  icons: {
    icon: "/favicon.ico",
    shortcut: "/favicon.ico",
    apple: "/apple-touch-icon.png",
  },
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    // FIX: Added suppressHydrationWarning to prevent next-themes mismatch errors
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta name="description" content="Code that powers the unseen" />
      </head>
      <body className={outfit.className}>
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem disableTransitionOnChange>
          {children}
          <CommandMenu />
          <Analytics />
          <SpeedInsights />
        </ThemeProvider>
      </body>
    </html>
  )
}