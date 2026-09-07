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
          DEFAULT: '#0E3145',
          950: '#082433',
          900: '#0E3145',
          800: '#18465D',
          700: '#3C7391',
          600: '#5A8AA4',
        },
        warm: {
          DEFAULT: '#FAF3EA',
          50: '#FFFFFF',
          100: '#FAF3EA',
          200: '#F2E6D8',
        },
        fog: {
          100: '#F3F6F8',
          200: '#E2EAEF',
          300: '#C7D4DC',
          400: '#A59683',
          500: '#7D6D59',
          600: '#5F4E3A',
        },
        mint: {
          DEFAULT: '#916C3C',
          100: '#F3E5D3',
          300: '#DEAF71',
          500: '#916C3C',
          600: '#78562F',
          700: '#453015',
        },
        signal: {
          blue: '#3C7391',
          amber: '#DEAF71',
          coral: '#453015',
        },
        hospital: {
          brown: '#453015',
          bronze: '#916C3C',
          sand: '#DEAF71',
          cream: '#FAF3EA',
          white: '#FFFFFF',
          mist: '#E2EAEF',
          blue: '#3C7391',
          deep: '#0E3145',
        },
      },
      boxShadow: {
        card: '0 1px 2px rgba(14,49,69,0.05), 0 10px 30px -18px rgba(69,48,21,0.22)',
        lift: '0 4px 12px rgba(14,49,69,0.08), 0 18px 44px -20px rgba(69,48,21,0.28)',
      },
      backgroundImage: {
        'navy-grid': 'linear-gradient(rgba(255,255,255,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.04) 1px, transparent 1px)',
      },
    },
  },
  plugins: [],
}
