import type { Metadata, Viewport } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import "./redesign.css"
import "./profile-mobile.css"
import "./profile-reference-exact.css"
import "./development-notice.css"
import PwaRegister from "./pwa-register"
import DevelopmentNotice from "./development-notice"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "Evölingo — Learn English",
  description: "A friendly English learning app with short lessons and daily practice.",
  applicationName: "Evölingo",
  appleWebApp: { capable: true, statusBarStyle: "default", title: "Evölingo" },
  icons: { icon: "/icon.svg", apple: "/icon.svg" },
  formatDetection: { telephone: false },
}
export const viewport: Viewport = { width: "device-width", initialScale: 1, maximumScale: 1, themeColor: "#ffffff", viewportFit: "cover" }
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) { return <html lang="en"><body className={inter.className}><PwaRegister /><DevelopmentNotice />{children}</body></html> }
