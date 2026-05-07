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
        bg: 'rgb(var(--bg) / <alpha-value>)',
        panel: 'rgb(var(--panel) / <alpha-value>)',
        panel2: 'rgb(var(--panel-2) / <alpha-value>)',
        line: 'rgb(var(--line) / <alpha-value>)',
        fg: 'rgb(var(--fg) / <alpha-value>)',
        'fg-dim': 'rgb(var(--fg-dim) / <alpha-value>)',
        'fg-faint': 'rgb(var(--fg-faint) / <alpha-value>)',
        accent: {
          lavender: '#6366F1',
          peach: '#F472B6',
          mint: '#A7F3D0',
          pink: '#EC4899',
          butter: '#FDE68A',
          sky: '#93C5FD',
        },
      },
      borderRadius: { card: '18px' },
      boxShadow: {
        card: '0 20px 50px -20px rgba(99,102,241,0.30), 0 8px 20px -8px rgba(30,41,59,0.20)',
      },
      backgroundImage: {
        'gradient-header': 'linear-gradient(135deg, #6366F1 0%, #A855F7 50%, #EC4899 100%)',
      },
    },
  },
  plugins: [],
};
