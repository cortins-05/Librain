"use client"
import { Moon, Sun } from "lucide-react"
import { useTheme } from "next-themes"
import { useEffect, useState } from "react"

export default function ThemeButton() {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  const [isAnimating, setIsAnimating] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) return null

  const isDark = theme === "dark"

  const handleToggle = () => {
    if (isAnimating) return

    setIsAnimating(true)
    setTheme(isDark ? "light" : "dark")

    setTimeout(() => {
      setIsAnimating(false)
    }, 333)
  }

  return (
    <button
      onClick={handleToggle}
      disabled={isAnimating}
      className={`relative p-3 rounded-lg transition-all duration-500 ${
        isAnimating ? "blur-sm" : "blur-0"
      } ${
        isAnimating
          ? "-translate-y-1"
          : "translate-y-0 hover:-translate-y-2"
      } hover:shadow-lg hover:shadow-primary/50 shadow-md active:shadow-sm ${
        isDark
          ? "bg-slate-900 text-yellow-400 hover:bg-slate-800"
          : "bg-slate-100 text-slate-700 hover:bg-white"
      }`}
      aria-label="Toggle theme"
    >
      <div className="relative w-6 h-6">
        <div
          className={`absolute inset-0 transition-all duration-150 ${
            isAnimating ? "opacity-0 scale-0" : "opacity-100 scale-100"
          }`}
        >
          {isDark ? (
            <Sun className="w-6 h-6" />
          ) : (
            <Moon className="w-6 h-6" />
          )}
        </div>
        <div
          className={`absolute inset-0 transition-all duration-150 ${
            isAnimating ? "opacity-100 scale-100" : "opacity-0 scale-0"
          }`}
        >
          {isDark ? (
            <Moon className="w-6 h-6" />
          ) : (
            <Sun className="w-6 h-6" />
          )}
        </div>
      </div>
    </button>
  )
}