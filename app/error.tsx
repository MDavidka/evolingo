"use client"
import { AlertCircle } from "lucide-react"
export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <main className="evo-ai-system-page" role="alert">
    <AlertCircle size={32} strokeWidth={1.75} aria-hidden="true" />
    <h1>Valami hiba történt</h1>
    <p>Az oldal most nem tölthető be.</p>
    <button type="button" onClick={reset}>Újrapróbálás</button>
  </main>
}