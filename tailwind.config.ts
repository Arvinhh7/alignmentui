import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#F7F7F4',
          50: '#181818',
          100: '#202020',
          200: '#2B2B2B',
          300: '#3A3A3A',
          400: '#858585',
          500: '#B7B7B7',
          600: '#DADADA',
          700: '#EDEDE8',
          800: '#F7F7F4',
          900: '#FFFFFF',
        },
        accent: {
          DEFAULT: '#F15A2B',
          light: '#FF7A45',
          dark: '#C74320',
        },
        success: '#F36B2B',
        warning: '#D58B70',
        danger: '#D06452',
        muted: '#8A8A8A',
        canvas: '#090B0F',
        ink: {
          DEFAULT: '#F7F7F4',
          2: '#DDE3EA',
          3: '#9099A6',
          inv: '#090B0F',
        },
        surface: {
          DEFAULT: '#0F1115',
          warm: '#14171D',
          muted: '#1E232B',
        },
        divider: {
          DEFAULT: '#26303B',
          light: '#1B2028',
        },
        sage: {
          DEFAULT: '#F36B2B',
          bg: 'rgba(243,107,43,0.14)',
        },
        caution: {
          DEFAULT: '#D58B70',
          bg: 'rgba(213,139,112,0.14)',
        },
        'red-soft': {
          DEFAULT: '#D06452',
          bg: 'rgba(208,100,82,0.14)',
        },
      },
      fontFamily: {
        sans: ['var(--font-inter)', 'Inter', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
        mono: ['var(--font-mono)', 'JetBrains Mono', 'ui-monospace', 'monospace'],
        serif: ['var(--font-serif)', 'DM Serif Display', 'Georgia', "'Times New Roman'", 'serif'],
      },
      fontSize: {
        hero: ['64px', { lineHeight: '1.08', letterSpacing: '0' }],
        section: ['40px', { lineHeight: '1.15', letterSpacing: '0' }],
        display: ['30px', { lineHeight: '1.1', letterSpacing: '0' }],
        'dash-h1': ['24px', { lineHeight: '1.2', letterSpacing: '0' }],
        card: ['15px', { lineHeight: '1.3', letterSpacing: '0' }],
        body: ['14px', { lineHeight: '1.6' }],
        'body-sm': ['13px', { lineHeight: '1.55' }],
        caption: ['12px', { lineHeight: '1.4' }],
        eyebrow: ['11px', { lineHeight: '1.2', letterSpacing: '0.09em' }],
        'mono-val': ['13px', { lineHeight: '1.3', letterSpacing: '0' }],
      },
      boxShadow: {
        'elevation-sm': '0 1px 0 rgba(255,255,255,0.04), 0 12px 34px rgba(0,0,0,0.22)',
        'elevation-md': '0 1px 0 rgba(255,255,255,0.05), 0 18px 52px rgba(0,0,0,0.32)',
        'elevation-lg': '0 1px 0 rgba(255,255,255,0.06), 0 28px 90px rgba(0,0,0,0.45)',
        soft: '0 12px 34px rgba(0,0,0,0.24)',
        medium: '0 18px 52px rgba(0,0,0,0.34)',
        large: '0 28px 90px rgba(0,0,0,0.48)',
        glow: '0 0 40px rgba(241,90,43,0.18)',
        'glow-strong': '0 0 68px rgba(241,90,43,0.28)',
        'inner-glow': 'inset 0 1px 0 rgba(255,255,255,0.08)',
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'gradient-conic': 'conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))',
        'stripe-gradient': 'radial-gradient(circle at 72% 42%, rgba(241,90,43,0.18), transparent 28%), radial-gradient(circle at 18% 18%, rgba(255,255,255,0.055), transparent 24%)',
        'hero-glow': 'radial-gradient(circle at 70% 35%, rgba(241,90,43,0.22), transparent 30%)',
      },
      animation: {
        'fade-in': 'fadeIn 0.5s ease-out',
        'fade-in-up': 'fadeInUp 0.5s ease-out',
        'scale-in': 'scaleIn 0.3s ease-out',
        'slide-up': 'slideUp 0.4s ease-out',
        float: 'float 3s ease-in-out infinite',
        'pulse-slow': 'pulse 3s ease-in-out infinite',
        shimmer: 'shimmer 2s infinite',
        glow: 'glow 2s ease-in-out infinite',
        slideInRight: 'slideInRight 0.25s ease-out',
        blink: 'blink 2.5s infinite',
      },
      keyframes: {
        slideInRight: {
          '0%': { opacity: '0', transform: 'translateX(100%)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        fadeInUp: {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        scaleIn: {
          '0%': { opacity: '0', transform: 'scale(0.95)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        slideUp: {
          '0%': { transform: 'translateY(10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        glow: {
          '0%, 100%': { boxShadow: '0 0 18px rgba(241,90,43,0.14)' },
          '50%': { boxShadow: '0 0 42px rgba(241,90,43,0.24)' },
        },
        blink: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.3' },
        },
      },
      transitionTimingFunction: {
        'bounce-in': 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
        smooth: 'cubic-bezier(0.4, 0, 0.2, 1)',
      },
      borderRadius: {
        '2xl': '1rem',
        '3xl': '1.5rem',
        '4xl': '2rem',
      },
      maxWidth: {
        marketing: '1200px',
        'hero-text': '800px',
        subtitle: '560px',
        cta: '720px',
      },
      spacing: {
        '18': '4.5rem',
        '22': '5.5rem',
        '25': '6.25rem',
      },
    },
  },
  plugins: [],
}

export default config
