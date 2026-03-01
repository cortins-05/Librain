'use client'

import { useRef, useState } from 'react'
import { MoonIcon, SunIcon } from 'lucide-react'
import { useTheme } from 'next-themes'
import { Button } from '../ui/button'

const ThemeToggle = ({ className }: { className?: string }) => {
  const { setTheme, resolvedTheme } = useTheme()
  const [animState, setAnimState] = useState<'idle' | 'out' | 'in'>('idle')
  const [ripple, setRipple] = useState<{ x: number; y: number; color: string } | null>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)

  const isDark = resolvedTheme === 'dark'

  const toggleSwitch = () => {
    if (animState !== 'idle') return

    const rect = buttonRef.current?.getBoundingClientRect()
    const x = rect ? rect.left + rect.width / 2 : window.innerWidth / 2
    const y = rect ? rect.top + rect.height / 2 : window.innerHeight / 2
    const nextColor = isDark ? '#ffffff' : '#0f172a'

    setRipple({ x, y, color: nextColor })
    setAnimState('out')

    setTimeout(() => {
      setTheme(isDark ? 'light' : 'dark')
      setAnimState('in')
    }, 150)

    setTimeout(() => {
      setRipple(null)
      setAnimState('idle')
    }, 700)
  }

  const maxRadius = ripple
    ? Math.hypot(
        Math.max(ripple.x, window.innerWidth  - ripple.x),
        Math.max(ripple.y, window.innerHeight - ripple.y)
      ) * 1.1
    : 0

  // ✅ Render idéntico en servidor y primer render cliente — sin iconos, sin aria-label dinámico
  if (!resolvedTheme) {
    return (
      <Button
        className={`relative overflow-hidden transition-colors duration-300 ${className}`}
        variant="outline"
        size="icon"
        aria-label="Toggle theme"
        disabled
      >
        <span className="size-4" />
      </Button>
    )
  }

  return (
    <>
      <style>{`
        @keyframes icon-out {
          from { transform: rotate(0deg)   scale(1);   opacity: 1; }
          to   { transform: rotate(90deg)  scale(0.1); opacity: 0; }
        }
        @keyframes icon-in {
          from { transform: rotate(-90deg) scale(0.1); opacity: 0; }
          to   { transform: rotate(0deg)   scale(1);   opacity: 1; }
        }
        @keyframes ripple-expand {
          from { transform: translate(-50%, -50%) scale(0); }
          to   { transform: translate(-50%, -50%) scale(1); }
        }
        @keyframes ripple-fade {
          from { opacity: 1; }
          to   { opacity: 0; }
        }
        .anim-out    { animation: icon-out      0.15s ease-in forwards; }
        .anim-in     { animation: icon-in       0.4s  cubic-bezier(0.34, 1.56, 0.64, 1) forwards; }
        .ripple-grow { animation: ripple-expand 0.55s cubic-bezier(0.22, 1, 0.36, 1) forwards; }
        .ripple-hide { animation: ripple-fade   0.2s  ease-out 0.5s both; }
      `}</style>

      {ripple && (
        <div
          aria-hidden
          className="ripple-grow ripple-hide pointer-events-none fixed z-9999"
          style={{
            left: ripple.x,
            top: ripple.y,
            width: maxRadius * 2,
            height: maxRadius * 2,
            borderRadius: '50%',
            background: ripple.color,
          }}
        />
      )}

      <Button
        ref={buttonRef}
        className={`relative overflow-hidden transition-colors duration-300 ${className}`}
        variant="outline"
        size="icon"
        onClick={toggleSwitch}
        aria-label={isDark ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
      >
        <span className={animState === 'out' ? 'anim-out' : animState === 'in' ? 'anim-in' : ''}>
          {isDark
            ? <MoonIcon className="size-4" />
            : <SunIcon  className="size-4" />
          }
        </span>
      </Button>
    </>
  )
}

export default ThemeToggle
