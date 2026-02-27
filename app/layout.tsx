import type React from "react"
import type { Metadata } from "next"
import Script from "next/script"
import { Outfit } from "next/font/google"
import { Analytics } from "@vercel/analytics/react"
import { SpeedInsights } from "@vercel/speed-insights/next"
import "./globals.css"
import { ThemeProvider } from "@/components/theme-provider"
import { CommandMenu } from "@/components/ui/command-menu"
import { StardustTrail } from "@/components/ui/stardust-trail"

const outfit = Outfit({ subsets: ["latin"] })

const baseUrl = "https://miitdaga.dev"

export const metadata: Metadata = {
  metadataBase: new URL(baseUrl),
  title: {
    default: "Miit Daga",
    template: "%s | Miit Daga",
  },
  description: "Portfolio of Miit Daga, a software developer specializing in full stack development and innovative web applications, with experience in artificial intelligence and machine learning.",
  alternates: {
    canonical: "/",
  },
  icons: {
    icon: "/favicon.ico",
    shortcut: "/favicon.ico",
    apple: "/apple-touch-icon.png",
  },
  robots: {
    index: true,
    follow: true,
  },
  openGraph: {
    type: "website",
    url: baseUrl,
    siteName: "Miit Daga",
    title: "Miit Daga | Software Developer",
    description: "Portfolio of Miit Daga, a software developer specializing in full stack development and innovative web applications, with experience in artificial intelligence and machine learning.",
    images: [
      {
        url: "/opengraph-image",
        width: 1200,
        height: 630,
        alt: "Miit Daga - Portfolio",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    site: "@miit_daga",
    creator: "@miit_daga",
    title: "Miit Daga",
    description: "Portfolio of Miit Daga, a software developer specializing in full stack development and innovative web applications, with experience in artificial intelligence and machine learning.",
    images: ["/opengraph-image"],
  },
}

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "Person",
  name: "Miit Daga",
  url: baseUrl,
  jobTitle: "Software Developer",
  alumniOf: {
    "@type": "CollegeOrUniversity",
    name: "Vellore Institute of Technology",
  },
  sameAs: [
    "https://github.com/miit-daga/",
    "https://www.linkedin.com/in/miit-daga/",
    "https://x.com/miit_daga",
    "https://instagram.com/miit_daga",
  ],
  image: `${baseUrl}/profile.png`,
  mainEntityOfPage: baseUrl,
  knowsAbout: [
    "Artificial Intelligence",
    "Web Development",
    "Machine Learning",
    "Deep Learning",
    "Full Stack Development",
  ],
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={outfit.className}>
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem disableTransitionOnChange>
          {/* NEW: Noise Overlay Div */}
          <div className="bg-noise" />
          <StardustTrail />

          {children}
          <CommandMenu />
          <Analytics />
          <SpeedInsights />
        </ThemeProvider>
        <Script
          id="person-schema"
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </body>
    </html>
  )
}