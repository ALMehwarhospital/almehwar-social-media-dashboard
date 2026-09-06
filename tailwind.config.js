/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        display: ['"Fraunces"', 'serif'],
        sans: ['"Manrope"', 'sans-serif'],
        mono: ['"IBM Plex Mono"', 'monospace'],
      },
      colors: {
        navy: {
          DEFAULT: '#0B1E33',
          950: '#060F1A',
          900: '#0B1E33',
          800: '#122A47',
          700: '#1B3A5C',
          600: '#264B72',
        },
        warm: {
          DEFAULT: '#FAF7F1',
          50: '#FEFDFB',
          100: '#FAF7F1',
          200: '#F0EBE0',
        },
        fog: {
          400: '#8B93A1',
          500: '#6B7484',
          600: '#4E5563',
        },
        mint: {
          DEFAULT: '#2FBF9F',
          100: '#DFF6EF',
          300: '#7FDEC7',
          500: '#2FBF9F',
          600: '#22997F',
          700: '#1B7A66',
        },
        signal: {
          blue: '#3D74E6',
          amber: '#E8963C',
          coral: '#E2604F',
        },
      },
      boxShadow: {
        card: '0 1px 2px rgba(11,30,51,0.06), 0 8px 24px -12px rgba(11,30,51,0.15)',
        lift: '0 2px 8px rgba(11,30,51,0.08), 0 16px 40px -16px rgba(11,30,51,0.25)',
      },
      backgroundImage: {
        'navy-grid': 'linear-gradient(rgba(255,255,255,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.04) 1px, transparent 1px)',
      },
    },
  },
  plugins: [],
}
