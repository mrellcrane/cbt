import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: '#4A9B8F',
        'primary-light': '#7FBFB8',
        'primary-dark': '#2D7A70',
        background: '#F7F5F2',
        surface: '#FFFFFF',
        'text-main': '#2C2C3E',
        'text-secondary': '#6B6B80',
        'text-muted': '#9999AA',
        border: '#E0DDD8',
        danger: '#E05252',
        success: '#52B788',
      },
    },
  },
  plugins: [],
};

export default config;
