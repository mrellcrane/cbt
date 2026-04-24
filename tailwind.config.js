/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,jsx,ts,tsx}',
    './components/**/*.{js,jsx,ts,tsx}',
  ],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        primary: '#4A9B8F',
        'primary-light': '#7FBFB8',
        'primary-dark': '#2D7A70',
        surface: '#FFFFFF',
        'surface-alt': '#F0EDE8',
        background: '#F7F5F2',
        accent: '#E8A561',
        'accent-light': '#F2C98A',
        ink: '#2C2C3E',
        'ink-secondary': '#6B6B80',
        'ink-muted': '#9999AA',
        border: '#E0DDD8',
        danger: '#E05252',
        success: '#52B788',
      },
      fontFamily: {
        sans: ['System'],
      },
    },
  },
  plugins: [],
};
