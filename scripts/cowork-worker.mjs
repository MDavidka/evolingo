import { startCoworkWorker } from "../app/lib/cowork-vm/run-worker.ts"
import NextEnv from "@next/env"

NextEnv.loadEnvConfig(process.cwd())
startCoworkWorker().catch((error) => {
  const message = error instanceof Error ? error.message : "Unknown worker startup failure"
  console.error(`Cowork worker stopped: ${message}`)
  process.exitCode = 1
})
