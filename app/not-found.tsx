import Link from "next/link"
import { Compass } from "lucide-react"
export default function NotFound() {
  return <main className="evo-ai-system-page">
    <Compass size={32} strokeWidth={1.75} aria-hidden="true" />
    <h1>Ez az oldal nem található</h1>
    <p>A keresett oldal nem létezik, vagy már nem érhető el.</p>
    <Link href="/chat">Vissza a chathez</Link>
  </main>
}