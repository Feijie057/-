/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: ['class', '[data-theme="dark"]'],
  theme: {
    extend: {
      colors: {
        plane: 'var(--plane)',
        surface: 'var(--surface-1)',
        raised: 'var(--surface-2)',
        ink: 'var(--text-primary)',
        'ink-2': 'var(--text-secondary)',
        muted: 'var(--text-muted)',
        line: 'var(--line)',
        brand: 'var(--series-1)',
        accent: 'var(--series-2)',
        good: 'var(--status-good)',
        warn: 'var(--status-warning)',
        serious: 'var(--status-serious)',
        critical: 'var(--status-critical)',
      },
      fontFamily: {
        sans: ['system-ui', '-apple-system', '"Segoe UI"', '"PingFang SC"', '"Microsoft YaHei"', 'sans-serif'],
      },
      borderRadius: { xl: '12px', '2xl': '16px' },
    },
  },
  plugins: [],
}
