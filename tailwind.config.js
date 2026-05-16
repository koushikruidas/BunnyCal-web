/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Geist', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        mono: ['"Geist Mono"', 'ui-monospace', 'monospace'],
      },
      colors: {
        // legacy tokens (kept for existing pages — do not use in new ui/* primitives)
        bg: 'rgb(var(--bg) / <alpha-value>)',
        panel: 'rgb(var(--panel) / <alpha-value>)',
        panel2: 'rgb(var(--panel-2) / <alpha-value>)',
        line: 'rgb(var(--line) / <alpha-value>)',
        fg: 'rgb(var(--fg) / <alpha-value>)',
        'fg-dim': 'rgb(var(--fg-dim) / <alpha-value>)',
        'fg-faint': 'rgb(var(--fg-faint) / <alpha-value>)',

        // brand accents (unchanged)
        accent: {
          lavender: '#6366F1',
          peach: '#F472B6',
          mint: '#A7F3D0',
          pink: '#EC4899',
          butter: '#FDE68A',
          sky: '#93C5FD',
        },

        // semantic tokens — these are the canonical names for ui/* primitives
        surface: 'rgb(var(--surface) / <alpha-value>)',
        'surface-raised': 'rgb(var(--surface-raised) / <alpha-value>)',
        'surface-sunken': 'rgb(var(--surface-sunken) / <alpha-value>)',
        'surface-inverse': 'rgb(var(--surface-inverse) / <alpha-value>)',

        'text-primary': 'rgb(var(--text-primary) / <alpha-value>)',
        'text-secondary': 'rgb(var(--text-secondary) / <alpha-value>)',
        'text-tertiary': 'rgb(var(--text-tertiary) / <alpha-value>)',
        'text-on-accent': 'rgb(var(--text-on-accent) / <alpha-value>)',
        'text-on-inverse': 'rgb(var(--text-on-inverse) / <alpha-value>)',

        'border-subtle': 'rgb(var(--border-subtle) / <alpha-value>)',
        'border-default': 'rgb(var(--border-default) / <alpha-value>)',
        'border-strong': 'rgb(var(--border-strong) / <alpha-value>)',
        'border-focus': 'rgb(var(--border-focus) / <alpha-value>)',

        // status tokens — semantic, not raw color
        danger: {
          fg: 'rgb(var(--danger-fg) / <alpha-value>)',
          bg: 'rgb(var(--danger-bg) / <alpha-value>)',
          border: 'rgb(var(--danger-border) / <alpha-value>)',
          surface: 'rgb(var(--danger-surface) / <alpha-value>)',
        },
        success: {
          fg: 'rgb(var(--success-fg) / <alpha-value>)',
          bg: 'rgb(var(--success-bg) / <alpha-value>)',
          border: 'rgb(var(--success-border) / <alpha-value>)',
          surface: 'rgb(var(--success-surface) / <alpha-value>)',
        },
        warning: {
          fg: 'rgb(var(--warning-fg) / <alpha-value>)',
          bg: 'rgb(var(--warning-bg) / <alpha-value>)',
          border: 'rgb(var(--warning-border) / <alpha-value>)',
          surface: 'rgb(var(--warning-surface) / <alpha-value>)',
        },
        info: {
          fg: 'rgb(var(--info-fg) / <alpha-value>)',
          bg: 'rgb(var(--info-bg) / <alpha-value>)',
          border: 'rgb(var(--info-border) / <alpha-value>)',
          surface: 'rgb(var(--info-surface) / <alpha-value>)',
        },

        // accent surface tokens — for tinted backgrounds tied to the brand accent
        'accent-fg': 'rgb(var(--accent-fg) / <alpha-value>)',
        'accent-bg': 'rgb(var(--accent-bg) / <alpha-value>)',
        'accent-surface': 'rgb(var(--accent-surface) / <alpha-value>)',
        'accent-border': 'rgb(var(--accent-border) / <alpha-value>)',
      },

      // typography scale — semantic names, paired sizes + line-heights + weights
      fontSize: {
        display: ['40px', { lineHeight: '48px', fontWeight: '600', letterSpacing: '-0.02em' }],
        h1: ['28px', { lineHeight: '36px', fontWeight: '600', letterSpacing: '-0.015em' }],
        h2: ['22px', { lineHeight: '30px', fontWeight: '600', letterSpacing: '-0.01em' }],
        h3: ['18px', { lineHeight: '26px', fontWeight: '600' }],
        body: ['15px', { lineHeight: '22px' }],
        'body-sm': ['13px', { lineHeight: '18px' }],
        caption: ['12px', { lineHeight: '16px' }],
        eyebrow: ['11px', { lineHeight: '14px', fontWeight: '600', letterSpacing: '0.08em' }],
      },

      borderRadius: {
        card: '18px',
        // tailwind defaults (sm/md/lg/xl/2xl/3xl/full) remain available
      },

      boxShadow: {
        // legacy (kept for existing pages)
        card: '0 20px 50px -20px rgba(99,102,241,0.30), 0 8px 20px -8px rgba(30,41,59,0.20)',
        // semantic scale
        soft: '0 1px 2px rgba(15, 23, 42, 0.04), 0 1px 1px rgba(15, 23, 42, 0.03)',
        raised: '0 4px 12px rgba(15, 23, 42, 0.06), 0 2px 4px rgba(15, 23, 42, 0.04)',
        floating: '0 14px 40px rgba(15, 23, 42, 0.08), 0 6px 16px rgba(15, 23, 42, 0.05)',
        modal: '0 18px 50px rgba(15, 23, 42, 0.25), 0 8px 16px rgba(15, 23, 42, 0.12)',
        // focus ring as a shadow, not an outline (avoids layout shift)
        'focus-ring': '0 0 0 3px rgb(var(--border-focus) / 0.35)',
      },

      backgroundImage: {
        'gradient-header': 'linear-gradient(135deg, #6366F1 0%, #A855F7 50%, #EC4899 100%)',
        'gradient-app': 'linear-gradient(180deg, rgb(var(--surface-sunken)) 0%, rgb(var(--surface)) 45%, rgb(var(--surface-sunken)) 100%)',
      },

      // motion tokens (per behavioral-invariants §15, modernization plan §0.4)
      transitionDuration: {
        instant: '80ms',
        fast: '140ms',
        base: '220ms',
        slow: '360ms',
      },
      transitionTimingFunction: {
        pop: 'cubic-bezier(.2,.9,.3,1.4)',
        // ease-in, ease-out, ease-in-out are Tailwind defaults
      },

      // minimum touch target (constitution §31)
      minHeight: {
        touch: '44px',
      },
      minWidth: {
        touch: '44px',
      },

      // canonical container widths — replaces 7 ad-hoc max-w-* values from audit §3.4
      maxWidth: {
        narrow: '480px',  // single-column forms (login, single-step onboarding)
        comfort: '720px', // reading width (success pages, simple content)
        wide: '1120px',   // app shell width (dashboard, booking)
      },
    },
  },
  plugins: [],
};
