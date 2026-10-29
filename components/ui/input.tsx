"use client"

import { Input as OpenAIInput } from "@openai/apps-sdk-ui/components/Input"
import type { ComponentProps } from "react"

export function Input({ className = "", ...props }: ComponentProps<typeof OpenAIInput>) {
  return <OpenAIInput className={className} {...props} />
}
