/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      fontFamily: {
        serif: ['"Cormorant Garamond"', 'Georgia', 'serif'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace']
      },
      colors: {
        ink: { DEFAULT: '#0f1e2e', soft: '#1d2e42', light: '#3a4d65' },
        cream: { DEFAULT: '#f7f1e3', warm: '#efe6cf' },
        parchment: '#faf6ec',
        gold: { DEFAULT: '#b8935a', deep: '#8f6d3c', soft: '#d9c194' },
        alert: '#a8372f',
        amber: '#c2842a',
        ok: '#4a6b3e',
        muted: '#8a8578'
      }
    }
  },
  plugins: []
};
