"use client"

import { Button as OpenAIButton } from "@openai/apps-sdk-ui/components/Button"
import type { ComponentProps } from "react"

export type ButtonProps = Omit<ComponentProps<typeof OpenAIButton>, "variant" | "size" | "color"> & {
  variant?: "default" | "secondary" | "outline" | "ghost"
  size?: "default" | "sm" | "icon"
}

export function Button({ variant = "default", size = "default", className = "", type = "button", children, ...props }: ButtonProps) {
  const visualVariant: "solid" | "soft" | "outline" | "ghost" = variant === "default" ? "solid" : variant === "secondary" ? "soft" : variant
  const controlSize: "lg" | "sm" | "md" = size === "icon" ? "lg" : size === "sm" ? "sm" : "md"
  return <OpenAIButton color="primary" variant={visualVariant} size={controlSize} uniform={size === "icon"} className={className} type={type} {...props}>{children}</OpenAIButton>
}
