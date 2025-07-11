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
      'blue-50': '#eff6ff',
      'blue-100': '#dbeaff',
      'blue-300': '#92c6fc',
      'blue-400': '#5fa5fa',
      'blue-500': '#3c82f6',
      'blue-600': '#2463eb',
      'blue-700': '#1c4ed9',
      'blue-800': '#031239',
      'blue-900': '#1e398a',
      'report-blue': '#1c3ca6',
      'white-blue': '#97A0C3',
      'white-gray': '#636E95',
      'light-gray': '#FAFCFE',
      'light-grey': '#BFC7E0',
      'light-white-gray': '#DCE9F7',
      'red': '#FA5087',
      'red-50': '#fef2f2',
      'red-100': '#ffe4e3',
      'red-200': '#fecaca',
      'red-500': '#ef4444',
      'red-600':  '#dc2626',
      'red-700': '#b91c1b',
      'red-800': '#991b1b',
      'red-not-compliant': '#fff2f2',
      'green': '#1FD0A3',
      'green-50': '#effdf4',
      'green-100': '#dcfce7',
      'green-200': '#bbf7d0',
      'green-300': '#86efac',
      'green-400': '#4ade80',
      'green-500': '#22c55e',
      'green-600': '#16a34a',
      'green-compliant': '#edfcf3',
      'gray': '#ECEFF8',
      'gray-element': '#e2e8f0',
      'gray-50': '#f9fafb',
      'gray-100': '#f3f4f6',
      'gray-300': '#d1d5db',
      'gray-400': '#9ca3af',
      'gray-500': '#6b7280',
      'gray-600': '#475569',
      'gray-900': '#101827',
      'body': '#F4F7FC',
      'black': '#000000',
      'indigo-600': '#4f46e5',
      'indigo-800': '#3730a3',
      'dark-grey': '#eaedf7',
      'dark-gray': '#7c88b1',
      'yellow-50': '#fefce8',
      'yellow-200': '#fef08a',
      'yellow-500': '#eab308',
      'yellow-600': '#ca8a04',
      'yellow-800': '#854d0f',
      'amber-50': '#fffbec',
      'amber-100': '#fef3c7',
      'amber-500': '#f59e0c',
      'amber-600': '#d97708',
      'amber-700': '#b4540a',
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
        scan: 'scan 2s linear infinite',
        progress: 'loading 2.5s ease-out forwards',
        breathe: 'breathe 3s ease-in-out infinite',
        fadeIn: 'fadeIn 0.8s ease-in-out forwards',
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
        breathe: {
          '0%, 100%': {
            transform: 'scale(1)',
            opacity: '0.3',
          },
          '50%': {
            transform: 'scale(1.1)',
            opacity: '0.7',
          },
        },
        scan: {
          '0%': { transform: 'translateY(-100%)' },
          '100%': { transform: 'translateY(1000%)' },
        },
        loading: {
          '0%': { width: '0%' },
          '100%': { width: '100%' },
        },
        fadeIn: {
          '0%': { 
            opacity: '0',
            transform: 'translateY(20px)'
          },
          '100%': { 
            opacity: '1',
            transform: 'translateY(0)'
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
