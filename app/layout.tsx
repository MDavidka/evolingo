import type { Metadata, Viewport } from "next"
import "./globals.css"
import { Nunito } from "next/font/google"

const nunito = Nunito({ subsets: ["latin", "latin-ext"], variable: "--font-nunito", display: "swap" })

export const metadata: Metadata = { title: "Evölingo — Learn English", description: "A friendly English learning prototype." }
export const viewport: Viewport = { width: "device-width", initialScale: 1, maximumScale: 1, themeColor: "#ffffff" }
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) { return <html lang="en"><body className={nunito.variable}>{children}</body></html> }
