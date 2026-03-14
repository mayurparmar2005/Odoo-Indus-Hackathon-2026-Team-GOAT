/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Inter"', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
      },
      colors: {
        apple: {
          bg: '#F5F5F7',
          surface: '#FFFFFF',
          blue: '#0071E3',
          'blue-dark': '#0056B3',
          'blue-light': '#60B4FF',
          success: '#30D158',
          warning: '#FF9F0A',
          danger: '#FF453A',
          text: '#1D1D1F',
          secondary: '#6E6E73',
          border: '#D2D2D7',
          sidebar: '#111113',
          'sidebar-hover': 'rgba(255,255,255,0.08)',
          'sidebar-active': 'rgba(0,113,227,0.18)',
        }
      },
      boxShadow: {
        'apple': '0 2px 20px rgba(0,0,0,0.08)',
        'apple-lg': '0 8px 40px rgba(0,0,0,0.12)',
        'apple-xl': '0 20px 60px rgba(0,0,0,0.15)',
        'glow-blue': '0 0 24px rgba(0,113,227,0.4)',
        'glow-green': '0 0 24px rgba(48,209,88,0.4)',
        'glow-red': '0 0 24px rgba(255,69,58,0.3)',
      },
      borderRadius: {
        'apple': '10px',
        'apple-lg': '16px',
        'apple-xl': '20px',
        'apple-full': '980px',
      },
      animation: {
        'fade-in': 'fadeIn 0.35s ease-out',
        'slide-up': 'slideUp 0.4s cubic-bezier(0.16,1,0.3,1)',
        'slide-in': 'slideIn 0.3s ease-out',
        'scale-in': 'scaleIn 0.25s cubic-bezier(0.16,1,0.3,1)',
        'float': 'float 6s ease-in-out infinite',
        'float-slow': 'float 9s ease-in-out infinite',
        'pulse-ring': 'pulseRing 2s ease-out infinite',
        'spin-slow': 'spin 8s linear infinite',
        'shimmer': 'shimmer 1.5s infinite',
        'number-up': 'numberUp 0.6s cubic-bezier(0.16,1,0.3,1)',
        'orb': 'orbMove 12s ease-in-out infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0', transform: 'translateY(6px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideIn: {
          '0%': { transform: 'translateX(-12px)', opacity: '0' },
          '100%': { transform: 'translateX(0)', opacity: '1' },
        },
        scaleIn: {
          '0%': { transform: 'scale(0.92)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        float: {
          '0%,100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-20px)' },
        },
        pulseRing: {
          '0%': { transform: 'scale(1)', opacity: '0.4' },
          '100%': { transform: 'scale(1.6)', opacity: '0' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        numberUp: {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        orbMove: {
          '0%,100%': { transform: 'translate(0,0) scale(1)' },
          '33%': { transform: 'translate(30px,-20px) scale(1.1)' },
          '66%': { transform: 'translate(-20px,15px) scale(0.95)' },
        },
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'gradient-conic': 'conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))',
        'shimmer-gradient': 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.4) 50%, transparent 100%)',
      },
    },
  },
  plugins: [],
}
