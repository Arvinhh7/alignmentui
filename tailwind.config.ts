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
          DEFAULT: '#191918',  // → ink
          50:  '#F3EDE4',      // → surface-warm
          100: '#EDE8E0',      // → surface-muted / divider-light
          200: '#E0DBD2',      // → divider
          300: '#C4BFB5',
          400: '#9C978E',      // → ink-3
          500: '#6B6860',      // → ink-2
          600: '#3F3D38',
          700: '#2D2D2C',
          800: '#1F1F1E',
          900: '#191918',      // → ink
        },
        accent: {
          DEFAULT: '#C84B31',  // warm terracotta
          light:   '#F3EDE4',
          dark:    '#A33820',
        },
        success: '#4A7C59',    // → sage
        warning: '#B8860B',    // → caution
        danger:  '#B5453A',    // → red-soft
        muted:   '#9C978E',    // → ink-3

        // ── DESIGN.md Anthropic-Warm tokens ──────────────────────────────
        // Page backgrounds
        canvas: '#FAF7F2',          // --bg  : warm cream page background

        // Ink (text + dark emphasis)
        ink: {
          DEFAULT: '#191918',       // --bg-dark / --text : primary dark
          2: '#6B6860',             // --text-2 : body copy
          3: '#9C978E',             // --text-3 : captions, timestamps
          inv: '#FAF7F2',           // --text-inv : text on dark surfaces
        },

        // Surfaces
        surface: {
          DEFAULT: '#FFFFFF',       // --surface : card / panel
          warm: '#F3EDE4',          // --surface-warm : nested items, hover fills
          muted: '#EDE8E0',         // --surface-muted : deeper warm gray
        },

        // Borders / dividers
        divider: {
          DEFAULT: '#E0DBD2',       // --border : primary borders
          light: '#EDE8E0',         // --border-light : subtle card borders
        },

        // Semantic colors
        sage: {
          DEFAULT: '#4A7C59',       // success, positive delta
          bg: 'rgba(74,124,89,0.08)',
        },
        caution: {
          DEFAULT: '#B8860B',       // warning
          bg: 'rgba(184,134,11,0.08)',
        },
        'red-soft': {
          DEFAULT: '#B5453A',       // error, negative delta
          bg: 'rgba(181,69,58,0.08)',
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
        // DESIGN.md elevation system (warm-tinted black, no colored shadows)
        'elevation-sm': '0 1px 3px rgba(25,25,24,0.04)',
        'elevation-md': '0 4px 16px rgba(25,25,24,0.06)',
        'elevation-lg': '0 12px 40px rgba(25,25,24,0.08)',
        // Legacy aliases (updated to warm black)
        'soft':         '0 2px 8px rgba(25,25,24,0.06)',
        'medium':       '0 4px 16px rgba(25,25,24,0.08)',
        'large':        '0 12px 32px rgba(25,25,24,0.10)',
        'glow':         '0 0 40px rgba(25,25,24,0.10)',
        'glow-strong':  '0 0 60px rgba(25,25,24,0.15)',
        'inner-glow':   'inset 0 1px 0 rgba(250,247,242,0.10)',
      },

      backgroundImage: {
        'gradient-radial':  'radial-gradient(var(--tw-gradient-stops))',
        'gradient-conic':   'conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))',
        // Warm neutral hero glow (replaces red)
        'stripe-gradient':  'radial-gradient(ellipse 80% 50% at 50% -20%, rgba(25,25,24,0.05), transparent)',
        'hero-glow':        'radial-gradient(ellipse 50% 50% at 50% 50%, rgba(25,25,24,0.04), transparent)',
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
