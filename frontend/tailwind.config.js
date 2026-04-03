/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,jsx}',
    './components/**/*.{js,jsx}',
    './lib/**/*.{js,jsx}',
  ],
  theme: {
    extend: {
      colors: {
        bg: '#08090b',
        surface: '#0f1014',
        'surface-elevated': '#16171c',
        'surface-high': '#1e1f26',
        red: {
          DEFAULT: '#e5091a',
          bright: '#ff1a2e',
          dim: '#a30612',
        },
        text: {
          primary: '#f0f0f0',
          secondary: '#8a8a9a',
          muted: '#555563',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        display: ['Inter', 'system-ui', 'sans-serif'],
      },
      fontSize: {
        '2xs': ['0.625rem', '0.875rem'],
      },
      borderColor: {
        DEFAULT: 'rgba(255,255,255,0.08)',
      },
      backgroundImage: {
        'red-glow': 'radial-gradient(ellipse 60% 40% at 50% 0%, rgba(229,9,26,0.18) 0%, transparent 70%)',
        'card-gradient': 'linear-gradient(to bottom, transparent 40%, rgba(8,9,11,0.95) 100%)',
      },
      boxShadow: {
        'red-glow': '0 0 30px rgba(229,9,26,0.3)',
        'card': '0 4px 24px rgba(0,0,0,0.4)',
        'elevated': '0 8px 32px rgba(0,0,0,0.5)',
      },
      animation: {
        'shimmer': 'shimmer 1.5s infinite',
        'fade-in': 'fadeIn 0.3s ease-out',
        'slide-up': 'slideUp 0.3s ease-out',
      },
      keyframes: {
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(12px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
    },
  },
  plugins: [],
}
