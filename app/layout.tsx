import type { Metadata, Viewport } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import "./redesign.css"
import "./ios-polish.css"
import PwaRegister from "./pwa-register"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "Evölingo | Learn a language every day",
  description: "A calm, minimalist language-learning app with short lessons, a learning path, and progress you can see.",
  applicationName: "Evölingo",
  appleWebApp: { capable: true, statusBarStyle: "default", title: "Evölingo" },
  icons: { icon: "/icon.svg", apple: "/icon.svg" },
  formatDetection: { telephone: false },
}
export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#ffffff", viewportFit: "cover" }
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) { return <html lang="en" data-theme="light" data-accent="neutral"><body className={inter.className}><PwaRegister />{children}</body></html> }
