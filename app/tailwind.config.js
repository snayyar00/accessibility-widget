/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    colors: {
      'transparent': 'transparent',
      'primary': '#0080FF',
      'regular-primary': '#F4FAFF',
      'light-primary': '#369AFE',
      'semi-primary': '#2196F3',
      'white': '#FFFFFF',
      'light-blue': '#2291FF',
      'sapphire-blue': '#242F57',
      'report-blue': '#002db3',
      'white-blue': '#97A0C3',
      'white-gray': '#636E95',
      'light-gray': '#FAFCFE',
      'light-grey': '#BFC7E0',
      'light-white-gray': '#DCE9F7',
      'red': '#FA5087',
      'red-200': '#fecaca',
      'red-600':  '#dc2626',
      'red-800': '#991b1b',
      'green': '#1FD0A3',
      'green-200': '#bbf7d0',
      'green-300': '#86efac',
      'green-400': '#4ade80',
      'green-500': '#22c55e',
      'green-600': '#16a34a',
      'gray': '#ECEFF8',
      'gray-100': '#f3f4f6',
      'gray-600': '#475569',
      'body': '#F4F7FC',
      'black': '#000000',
      'indigo-600': '#4f46e5',
      'indigo-800': '#3730a3',
      'dark-grey': '#eaedf7',
      'dark-gray': '#7c88b1',
      'yellow-200': '#fef08a',
      'yellow-500': '#eab308',
      'yellow-600': '#ca8a04',
    },
    fontFamily: {
      inter: ['Inter', 'sans-serif'],
    },
    extend: {
      'transitionTimingFunction': {
        'only-ease': 'cubic-bezier(0.25, 0.1, 0.25, 1.0)'
      },
      'boxShadow': {
        'xxl': '0px 2px 4px rgba(28, 41, 90, 0.0367952)',
        'xsl': '0px 4px 8px rgba(28, 41, 90, 0.0367952)'
      },
      animation: {
        pulse: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
      keyframes: {
        pulse: {
          '0%, 100%': {
            opacity: '1',
          },
          '50%': {
            opacity: '.5',
          },
        },
      }
    },
    keyframes: {
      loading: {
        '0%': { width: '0' },
        '100%': { width: '80%' },
      },
      completing: {
        '100%': { width: '80%' },
      },
      completed: {
        '0%': { width: '80%' },
        '100%': { width: '100%' },
      }
    },
    screens: {
      'ms':'320px',
      'mm':'375px',
      'ml':'425px',
      'md':'768px',
      'sm': {'max': '768px'},
      lg: '1024px',
      xl: '1440px',
      xxl: '2560px',
    }
  },
  plugins: [],
}
