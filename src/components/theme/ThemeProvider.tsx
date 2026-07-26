import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'

type Theme = 'light' | 'dark' | 'system'

interface ThemeContextValue {
  theme: Theme
  resolved: 'light' | 'dark'
  setTheme: (t: Theme) => void
  /** Manual escape hatch from the glass effect, on top of the OS setting. */
  reduceGlass: boolean
  setReduceGlass: (v: boolean) => void
}

const ThemeContext = createContext<ThemeContextValue | null>(null)

const THEME_KEY = 'ux-store-theme'
const GLASS_KEY = 'ux-store-reduce-glass'

function systemPrefersDark() {
  return window.matchMedia('(prefers-color-scheme: dark)').matches
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(
    () => (localStorage.getItem(THEME_KEY) as Theme | null) ?? 'dark',
  )
  const [reduceGlass, setReduceGlassState] = useState<boolean>(
    () => localStorage.getItem(GLASS_KEY) === 'true',
  )
  const [systemDark, setSystemDark] = useState(systemPrefersDark)

  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const onChange = (e: MediaQueryListEvent) => setSystemDark(e.matches)
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])

  const resolved: 'light' | 'dark' = theme === 'system' ? (systemDark ? 'dark' : 'light') : theme

  useEffect(() => {
    const root = document.documentElement
    root.classList.toggle('dark', resolved === 'dark')
    root.classList.toggle('no-glass', reduceGlass)
    document
      .querySelector('meta[name="theme-color"]')
      ?.setAttribute('content', resolved === 'dark' ? '#0A0D18' : '#F6F7FB')
  }, [resolved, reduceGlass])

  const setTheme = useCallback((t: Theme) => {
    localStorage.setItem(THEME_KEY, t)
    setThemeState(t)
  }, [])

  const setReduceGlass = useCallback((v: boolean) => {
    localStorage.setItem(GLASS_KEY, String(v))
    setReduceGlassState(v)
  }, [])

  const value = useMemo(
    () => ({ theme, resolved, setTheme, reduceGlass, setReduceGlass }),
    [theme, resolved, setTheme, reduceGlass, setReduceGlass],
  )

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export function useTheme() {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error('useTheme must be used inside <ThemeProvider>')
  return ctx
}
