import type { Metadata, Viewport } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import "./redesign.css"
import "./profile-mobile.css"
import "./profile-dashboard.css"
import "./development-notice.css"
import "./reference-screens.css"
import "./chat-interface.css"
import "./app-tab-bar.css"
import "./unified-screens.css"
import "./tools-hub.css"
import "./learning-home.css"
import { AppsSDKUIProvider } from "@openai/apps-sdk-ui/components/AppsSDKUIProvider"
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
export const viewport: Viewport = { width: "device-width", initialScale: 1, maximumScale: 1, userScalable: false, themeColor: "#ffffff", viewportFit: "cover" }
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) { return <html lang="hu"><body className={inter.className}><AppsSDKUIProvider linkComponent="a"><PwaRegister /><DevelopmentNotice />{children}</AppsSDKUIProvider></body></html> }
