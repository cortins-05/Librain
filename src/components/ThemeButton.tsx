"use client"

import { useTheme } from "next-themes"

export default function ThemeButton() {
  const { theme, setTheme } = useTheme()

  return (
    <div className="flex gap-4">
      <button
        onClick={() => setTheme("light")}
        className="px-4 py-2 border rounded"
      >
        Light
      </button>

      <button
        onClick={() => setTheme("dark")}
        className="px-4 py-2 border rounded"
      >
        Dark
      </button>

      <button
        onClick={() => setTheme("system")}
        className="px-4 py-2 border rounded"
      >
        System
      </button>
    </div>
  )
}