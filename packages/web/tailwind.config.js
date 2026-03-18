/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#f0f6fb',
          100: '#d4e7f7',
          200: '#7ab8e8',
          300: '#4a9fd8',
          400: '#1573c4',
          500: '#125e9f',
          600: '#0f4a73',
          700: '#0d3557',
          800: '#0a2540',
          900: '#051730',
        },
        accent: {
          green: '#1eb980',
          'green-light': '#38d9a0',
          'green-dark': '#0d9d65',
        },
      },
      fontFamily: {
        sans: ['-apple-system', 'BlinkMacSystemFont', '"Segoe UI"', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', '"Fira Sans"', '"Droid Sans"', '"Helvetica Neue"', 'sans-serif'],
      },
      boxShadow: {
        'sm': '0 1px 2px rgba(15, 15, 15, 0.05)',
        'md': '0 4px 6px rgba(15, 15, 15, 0.07), 0 2px 4px rgba(15, 15, 15, 0.05)',
        'lg': '0 10px 15px -3px rgba(15, 15, 15, 0.1), 0 4px 6px -2px rgba(15, 15, 15, 0.05)',
        'xl': '0 20px 25px -5px rgba(15, 15, 15, 0.1), 0 10px 10px -5px rgba(15, 15, 15, 0.04)',
      },
      animation: {
        'fadeInUp': 'fadeInUp 0.8s cubic-bezier(0.4, 0, 0.2, 1)',
      },
      keyframes: {
        fadeInUp: {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
    },
  },
  plugins: [],
};
