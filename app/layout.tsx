import type { Metadata, Viewport } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import "@/components/arc/foundation.css"
import "@/components/arc/tokens.css"
import "@/components/arc/primitives.css"
import "./redesign.css"
import "./profile-mobile.css"
import "./profile-dashboard.css"
import "./development-notice.css"
import "./reference-screens.css"
import "./chat-interface.css"
import "./chat-rich-text.css"
import "./app-tab-bar.css"
import "./unified-screens.css"
import "./tools-hub.css"
import "./learning-home.css"
import "./uiarc-integration.css"
import "./intelligent-ui/renderer.css"
import "./readability.css"
import "./design-tokens.css"
import "./library-space.css"
import "./liquid-glass-button.css"
import { AppsSDKUIProvider } from "@openai/apps-sdk-ui/components/AppsSDKUIProvider"
import PwaRegister from "./pwa-register"
import DevelopmentNotice from "./development-notice"
import OrientationLock from "./orientation-lock"
import App from "./evolingo-app"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "Evölingo — Learn English",
  description: "A friendly English learning app with short lessons and daily practice.",
  applicationName: "Evölingo",
  appleWebApp: { capable: true, statusBarStyle: "default", title: "Evölingo" },
  icons: { icon: "/icon.svg", apple: "/icon.svg" },
  formatDetection: { telephone: false },
}
export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#ffffff", viewportFit: "cover", interactiveWidget: "resizes-content" }
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) { return <html lang="hu" data-theme="light" data-accent="neutral"><body className={inter.className}><AppsSDKUIProvider linkComponent="a"><PwaRegister /><OrientationLock /><DevelopmentNotice /><App />{children}</AppsSDKUIProvider></body></html> }
