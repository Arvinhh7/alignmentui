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
        // ── Legacy aliases → mapped to Anthropic-Warm palette ────────────
        // Kept as safety net for any orphaned references; all map to warm tokens.
        primary: {
          DEFAULT: '#000000',  // → ink (Option D: pure black)
          50:  '#EDE3D0',      // → surface-warm
          100: '#DDD6C8',      // → surface-muted
          200: '#9E9484',      // → divider
          300: '#C4BFB5',
          400: '#2D2B27',      // → ink-3
          500: '#0A0A0A',      // → ink-2
          600: '#1A1A18',
          700: '#111111',
          800: '#0A0A0A',
          900: '#000000',      // → ink
        },
        accent: {
          DEFAULT: '#C84B31',  // warm terracotta
          light:   '#EDE3D0',
          dark:    '#A33820',
        },
        success: '#4A7C59',    // → sage
        warning: '#B8860B',    // → caution
        danger:  '#B5453A',    // → red-soft
        muted:   '#2D2B27',    // → ink-3

        // ── DESIGN.md Anthropic-Warm tokens — Option D ───────────────────
        // Page backgrounds
        canvas: '#FAF5EC',          // --bg  : warm cream (Option D: brighter warm)

        // Ink (text + dark emphasis)
        ink: {
          DEFAULT: '#000000',       // --text : pure black (max contrast)
          2: '#0A0A0A',             // --text-2 : near-black body copy
          3: '#2D2B27',             // --text-3 : dark captions
          inv: '#FAF5EC',           // --text-inv : text on dark surfaces
        },

        // Surfaces
        surface: {
          DEFAULT: '#FFFFFF',       // --surface : card / panel (pure white pops on warm canvas)
          warm: '#EDE3D0',          // --surface-warm : nested items, hover fills
          muted: '#DDD6C8',         // --surface-muted : deeper warm gray
        },

        // Borders / dividers
        divider: {
          DEFAULT: '#9E9484',       // --border : strong taupe borders
          light: '#C8BFB0',         // --border-light : card borders
        },

        // Semantic colors
        sage: {
          DEFAULT: '#4A7C59',       // success, positive delta
          bg: 'rgba(74,124,89,0.14)',
        },
        caution: {
          DEFAULT: '#B8860B',       // warning
          bg: 'rgba(184,134,11,0.14)',
        },
        'red-soft': {
          DEFAULT: '#B5453A',       // error, negative delta
          bg: 'rgba(181,69,58,0.14)',
        },
      },

      fontFamily: {
        sans: ['var(--font-inter)', 'Inter', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
        mono: ['var(--font-mono)', 'JetBrains Mono', 'ui-monospace', 'monospace'],
        serif: ['var(--font-serif)', 'DM Serif Display', 'Georgia', "'Times New Roman'", 'serif'],
      },

      fontSize: {
        // Named type scale from DESIGN.md
        'hero':    ['64px', { lineHeight: '1.08', letterSpacing: '-0.035em' }],
        'section': ['40px', { lineHeight: '1.15', letterSpacing: '-0.03em' }],
        'display': ['30px', { lineHeight: '1.1',  letterSpacing: '-0.03em' }],
        'dash-h1': ['24px', { lineHeight: '1.2',  letterSpacing: '-0.03em' }],
        'card':    ['15px', { lineHeight: '1.3',  letterSpacing: '-0.01em' }],
        'body':    ['14px', { lineHeight: '1.6' }],
        'body-sm': ['13px', { lineHeight: '1.55' }],
        'caption': ['12px', { lineHeight: '1.4' }],
        'eyebrow': ['11px', { lineHeight: '1.2',  letterSpacing: '0.09em' }],
        'mono-val':['13px', { lineHeight: '1.3',  letterSpacing: '-0.02em' }],
      },

      boxShadow: {
        // Option D elevation system — boosted contrast
        'elevation-sm': '0 2px 6px rgba(0,0,0,0.08)',
        'elevation-md': '0 4px 14px rgba(0,0,0,0.12)',
        'elevation-lg': '0 20px 50px rgba(0,0,0,0.18)',
        // Legacy aliases
        'soft':         '0 2px 8px rgba(0,0,0,0.10)',
        'medium':       '0 4px 16px rgba(0,0,0,0.14)',
        'large':        '0 16px 40px rgba(0,0,0,0.20)',
        'glow':         '0 0 40px rgba(0,0,0,0.18)',
        'glow-strong':  '0 0 60px rgba(0,0,0,0.26)',
        'inner-glow':   'inset 0 1px 0 rgba(250,245,236,0.10)',
      },

      backgroundImage: {
        'gradient-radial':  'radial-gradient(var(--tw-gradient-stops))',
        'gradient-conic':   'conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))',
        'stripe-gradient':  'radial-gradient(ellipse 80% 50% at 50% -20%, rgba(0,0,0,0.06), transparent)',
        'hero-glow':        'radial-gradient(ellipse 50% 50% at 50% 50%, rgba(0,0,0,0.05), transparent)',
      },

      animation: {
        'fade-in':        'fadeIn 0.5s ease-out',
        'fade-in-up':     'fadeInUp 0.5s ease-out',       // DESIGN.md: 0.5s
        'scale-in':       'scaleIn 0.3s ease-out',
        'slide-up':       'slideUp 0.4s ease-out',
        'float':          'float 3s ease-in-out infinite',
        'pulse-slow':     'pulse 3s ease-in-out infinite',
        'shimmer':        'shimmer 2s infinite',
        'glow':           'glow 2s ease-in-out infinite',
        'slideInRight':   'slideInRight 0.25s ease-out',
        'blink':          'blink 2.5s infinite',          // DESIGN.md: status dot pulse
      },

      keyframes: {
        slideInRight: {
          '0%':   { opacity: '0', transform: 'translateX(100%)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        fadeIn: {
          '0%':   { opacity: '0' },
          '100%': { opacity: '1' },
        },
        fadeInUp: {
          '0%':   { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        scaleIn: {
          '0%':   { opacity: '0', transform: 'scale(0.95)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        slideUp: {
          '0%':   { transform: 'translateY(10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)',    opacity: '1' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%':      { transform: 'translateY(-10px)' },
        },
        shimmer: {
          '0%':   { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        glow: {
          '0%, 100%': { boxShadow: '0 0 20px rgba(25,25,24,0.12)' },
          '50%':      { boxShadow: '0 0 40px rgba(25,25,24,0.20)' },
        },
        blink: {
          '0%, 100%': { opacity: '1' },
          '50%':      { opacity: '0.3' },
        },
      },

      transitionTimingFunction: {
        'bounce-in': 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
        'smooth':    'cubic-bezier(0.4, 0, 0.2, 1)',
      },

      borderRadius: {
        '2xl': '1rem',
        '3xl': '1.5rem',
        '4xl': '2rem',
      },

      maxWidth: {
        'marketing': '1200px',
        'hero-text': '800px',
        'subtitle':  '560px',
        'cta':       '720px',
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
