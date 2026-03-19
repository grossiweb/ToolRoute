/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Legacy compat — maps old brand/teal to new amber/green
        brand: {
          DEFAULT: '#f59e0b',
          light: 'rgba(245, 158, 11, 0.15)',
          dark: '#d97706',
        },
        teal: {
          DEFAULT: '#10b981',
          light: 'rgba(16, 185, 129, 0.12)',
        },
      },
      fontFamily: {
        serif: ['Instrument Serif', 'Georgia', 'serif'],
        sans: ['Cabinet Grotesk', 'system-ui', 'sans-serif'],
        mono: ['DM Mono', 'monospace'],
      },
    },
  },
  plugins: [],
}
