/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      boxShadow: {
        soft: '0 10px 40px -20px rgba(15, 23, 42, 0.35)',
      },
      keyframes: {
        fadeSlide: {
          '0%': { opacity: 0, transform: 'translateY(8px)' },
          '100%': { opacity: 1, transform: 'translateY(0)' },
        },
      },
      animation: {
        fadeSlide: 'fadeSlide 0.45s ease-out',
      },
    },
  },
  plugins: [],
}
