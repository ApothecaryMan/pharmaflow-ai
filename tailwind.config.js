/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./index.tsx",
    "./App.tsx",
    "./components/**/*.{js,ts,jsx,tsx}",
    "./services/**/*.{js,ts,jsx,tsx}",
    "./hooks/**/*.{js,ts,jsx,tsx}",
    "./utils/**/*.{js,ts,jsx,tsx}",
    "./config/**/*.{js,ts,jsx,tsx}",
  ],
  safelist: [
    {
      pattern: /(bg|text|border|ring)-(blue|emerald|violet|red|zinc)-(50|100|200|300|400|500|600|700|800|900|950)/,
      variants: ['hover', 'focus', 'dark', 'dark:hover', 'group-hover'],
    },
    {
      pattern: /(bg|text|border|ring)-(blue|emerald|violet|red|zinc)-(900|950)\/(10|20|30|50)/,
      variants: ['hover', 'focus', 'dark', 'dark:hover', 'group-hover'],
    },
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: [
          'var(--font-en)',
          'Inter',
          'var(--font-ar)',
          'Cairo',
          '-apple-system',
          'BlinkMacSystemFont',
          '"Roboto Flex"',
          'sans-serif',
        ],
      },
      colors: {
        surface: {
          50:  '#f9fafb',
          100: '#f3f4f6',
          200: '#e5e7eb',
          800: '#1f2937',
          900: '#111827',
        },
      },
    },
  },
  plugins: [],
}
