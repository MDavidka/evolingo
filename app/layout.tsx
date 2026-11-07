import type { Metadata, Viewport } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import "@/components/arc/foundation.css"
import "@/components/arc/tokens.css"
import "@/components/arc/primitives.css"
import "./redesign.css"
import "./development-notice.css"
import "./reference-screens.css"
import "./chat-interface.css"
import "./chat-agent-plan.css"
import "./chat-rich-text.css"
import "./app-tab-bar.css"
import "./unified-screens.css"
import "./tools-hub.css"
import "./uiarc-integration.css"
import "./intelligent-ui/renderer.css"
import "./readability.css"
import "./design-tokens.css"
import "./library-space.css"
import "./schedule.css"
import "./liquid-glass-button.css"
import "./wide-action-buttons.css"
import "./sidebar-layering.css"
import "./ai-shell.css"
import "./sidebar-next.css"
import "./product-refresh.css"
import "./profile-refresh.css"
import "./brainstorm.css"
import "./evo-ui-kit/tokens.css"
import "./evo-ui-kit/site-theme.css"
import { AppsSDKUIProvider } from "@openai/apps-sdk-ui/components/AppsSDKUIProvider"
import PwaRegister from "./pwa-register"
import DevelopmentNotice from "./development-notice"
import OrientationLock from "./orientation-lock"
import App from "./evolingo-app"

const inter = Inter({ subsets: ["latin"], display: "swap", preload: false, variable: "--font-inter" })

export const metadata: Metadata = {
  title: "Evölingo – AI-asszisztens",
  description: "Evölingo AI-asszisztens beszélgetéshez, fájlkezeléshez és feladatok szervezéséhez.",
  applicationName: "Evölingo",
  appleWebApp: { capable: true, statusBarStyle: "default", title: "Evölingo" },
  icons: { icon: "/icon.svg", apple: "/icon.svg" },
  formatDetection: { telephone: false },
}
export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#ffffff", viewportFit: "cover", interactiveWidget: "resizes-content" }
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) { return <html lang="hu" data-theme="light" data-accent="neutral"><body className={inter.variable}><AppsSDKUIProvider linkComponent="a"><PwaRegister /><OrientationLock /><DevelopmentNotice /><App />{children}</AppsSDKUIProvider></body></html> }
