import { Moon, Sun } from "lucide-react"

import { Button } from "@/components/ui/button"
import { useTheme } from "@/components/theme-provider"
import { cn } from "@/lib/utils"

export function ModeToggle({ transparent = false }: { transparent?: boolean }) {
  const { theme, setTheme } = useTheme()

  return (
    <Button
      variant="ghost"
      size="icon"
      className={cn(
        "size-9 rounded-full focus-visible:ring-0",
        transparent
          ? "hover:bg-white/10"
          : "hover:bg-zinc-100 dark:hover:bg-white/[0.06]"
      )}
      onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
    >
      <Sun className={cn(
        "h-[1.2rem] w-[1.2rem] scale-100 rotate-0 transition-all dark:scale-0 dark:-rotate-90",
        transparent ? "text-white" : "text-foreground"
      )} />
      <Moon className={cn(
        "absolute h-[1.2rem] w-[1.2rem] scale-0 rotate-90 transition-all dark:scale-100 dark:rotate-0",
        transparent ? "text-white" : "text-foreground"
      )} />
      <span className="sr-only">Toggle theme</span>
    </Button>
  )
}

