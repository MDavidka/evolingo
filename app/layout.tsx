import type { Metadata, Viewport } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import PwaRegister from "./pwa-register"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "Evölingo — Learn English",
  description: "A friendly English learning app with short lessons and daily practice.",
  applicationName: "Evölingo",
  appleWebApp: { capable: true, statusBarStyle: "default", title: "Evölingo" },
  icons: { icon: "/icon.svg", apple: "/icon.svg" },
  formatDetection: { telephone: false },
}
export const viewport: Viewport = { width: "device-width", initialScale: 1, maximumScale: 1, themeColor: "#ffffff" }
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) { return <html lang="en"><body className={inter.className}><PwaRegister />{children}</body></html> }
