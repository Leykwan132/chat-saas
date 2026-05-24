import { useEffect, useState } from "react"
import { Toaster as Sonner, type ToasterProps } from "sonner"
import { CircleCheckIcon, InfoIcon, TriangleAlertIcon, OctagonXIcon, Loader2Icon } from "lucide-react"
import { useTheme } from "@/components/theme-provider"

function useResolvedTheme(): "light" | "dark" {
  const { theme } = useTheme()
  const [resolvedTheme, setResolvedTheme] = useState<"light" | "dark">(() =>
    document.documentElement.classList.contains("dark") ? "dark" : "light",
  )

  useEffect(() => {
    if (theme === "system") {
      const media = window.matchMedia("(prefers-color-scheme: dark)")
      const updateTheme = () => setResolvedTheme(media.matches ? "dark" : "light")
      updateTheme()
      media.addEventListener("change", updateTheme)
      return () => media.removeEventListener("change", updateTheme)
    }

    setResolvedTheme(theme)
  }, [theme])

  return resolvedTheme
}

const Toaster = ({ ...props }: ToasterProps) => {
  const resolvedTheme = useResolvedTheme()

  return (
    <Sonner
      theme={resolvedTheme}
      className="toaster group"
      icons={{
        success: (
          <CircleCheckIcon className="size-4" />
        ),
        info: (
          <InfoIcon className="size-4" />
        ),
        warning: (
          <TriangleAlertIcon className="size-4" />
        ),
        error: (
          <OctagonXIcon className="size-4" />
        ),
        loading: (
          <Loader2Icon className="size-4 animate-spin" />
        ),
      }}
      style={
        {
          "--normal-bg": "var(--popover)",
          "--normal-text": "var(--popover-foreground)",
          "--normal-border": "var(--border)",
          "--border-radius": "var(--radius)",
        } as React.CSSProperties
      }
      toastOptions={{
        classNames: {
          toast: "cn-toast",
          description: "text-muted-foreground!",
        },
      }}
      {...props}
    />
  )
}

export { Toaster }
