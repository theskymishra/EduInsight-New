import { Moon, Sun } from 'lucide-react'
import { useTheme } from '../context/useTheme'

export default function ThemeToggle({ className = '', showLabel = true }) {
  const { theme, toggleTheme } = useTheme()
  const isDark = theme === 'dark'

  return (
    <button
      type="button"
      className={`theme-toggle ${isDark ? 'dark-active' : ''} ${className}`}
      onClick={toggleTheme}
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
    >
      <span className="theme-toggle-icon">
        {isDark ? <Sun size={17} /> : <Moon size={17} />}
      </span>
      {showLabel && (
        <span className="theme-toggle-label">
          {isDark ? 'Light mode' : 'Dark mode'}
        </span>
      )}
    </button>
  )
}
