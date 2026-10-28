import { useEffect, useState } from 'react'
import { ThemeContext } from './theme-context'

export function ThemeProvider({ children }) {
  const [theme, setThemeState] = useState(() => {
    try {
      const stored = localStorage.getItem('eduinsight_theme')
      if (stored === 'dark' || stored === 'light') {
        return stored
      }
      return window.matchMedia &&
        window.matchMedia('(prefers-color-scheme: dark)').matches
        ? 'dark'
        : 'light'
    } catch {
      return 'light'
    }
  })

  useEffect(() => {
    try {
      document.documentElement.setAttribute('data-theme', theme)
      localStorage.setItem('eduinsight_theme', theme)
    } catch {
      // Storage access might fail in privacy-restricted environments
    }
  }, [theme])

  function toggleTheme() {
    setThemeState((current) => (current === 'dark' ? 'light' : 'dark'))
  }

  function setTheme(newTheme) {
    if (newTheme === 'dark' || newTheme === 'light') {
      setThemeState(newTheme)
    }
  }

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

export default ThemeProvider
