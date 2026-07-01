/** @type {import('tailwindcss').Config} */
function withOpacity(variable) {
  return `hsl(var(${variable}) / <alpha-value>)`;
}

module.exports = {
  darkMode: ['class'],
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Theme-aware design tokens — see src/app/globals.css for the
        // night/day CSS variable definitions behind these.
        background: {
          DEFAULT: withOpacity('--background'),
          secondary: withOpacity('--background-secondary'),
          tertiary: withOpacity('--background-tertiary'),
          card: withOpacity('--background-card'),
          hover: withOpacity('--background-hover'),
        },
        border: {
          DEFAULT: withOpacity('--border'),
          subtle: withOpacity('--border-subtle'),
          focus: withOpacity('--border-focus'),
        },
        text: {
          primary: withOpacity('--text-primary'),
          secondary: withOpacity('--text-secondary'),
          muted: withOpacity('--text-muted'),
          inverse: withOpacity('--text-inverse'),
        },
        brand: {
          DEFAULT: withOpacity('--brand'),
          light: withOpacity('--brand-light'),
          dark: withOpacity('--brand-dark'),
          muted: withOpacity('--brand-muted'),
        },
        // Status colors (load/driver/client pipeline states) — kept as
        // fixed, saturated accents across both themes for recognizability;
        // only the surfaces around them (background/border/text) shift.
        status: {
          'new-lead':    '#6366F1',
          'negotiating': '#8B5CF6',
          'booked':      '#3B82F6',
          'assigned':    '#06B6D4',
          'en-route':    '#10B981',
          'at-pickup':   '#F59E0B',
          'loaded':      '#F97316',
          'in-transit':  '#10B981',
          'delivered':   '#22C55E',
          'invoiced':    '#84CC16',
          'paid':        '#22C55E',
          'closed':      '#6B7280',
          'cancelled':   '#6B7280',
          'problem':     '#EF4444',
          // Driver statuses
          'available':   '#22C55E',
          'on-load':     '#3B82F6',
          'off-duty':    '#6B7280',
          // Client statuses
          'active':      '#22C55E',
          'warning':     '#F59E0B',
          'inactive':    '#6B7280',
          'at-risk':     '#EF4444',
        },
        success: {
          DEFAULT: withOpacity('--success'),
          light: withOpacity('--success-light'),
          dark: withOpacity('--success-dark'),
          muted: withOpacity('--success-muted'),
        },
        warning: {
          DEFAULT: withOpacity('--warning'),
          light: withOpacity('--warning-light'),
          dark: withOpacity('--warning-dark'),
          muted: withOpacity('--warning-muted'),
        },
        danger: {
          DEFAULT: withOpacity('--danger'),
          light: withOpacity('--danger-light'),
          dark: withOpacity('--danger-dark'),
          muted: withOpacity('--danger-muted'),
        },
        info: {
          DEFAULT: withOpacity('--info'),
          light: withOpacity('--info-light'),
          dark: withOpacity('--info-dark'),
          muted: withOpacity('--info-muted'),
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
      fontSize: {
        '2xs': ['0.625rem', { lineHeight: '0.875rem' }],
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
      keyframes: {
        'accordion-down': { from: { height: '0' }, to: { height: 'var(--radix-accordion-content-height)' } },
        'accordion-up':   { from: { height: 'var(--radix-accordion-content-height)' }, to: { height: '0' } },
        'slide-in-right': { from: { transform: 'translateX(100%)' }, to: { transform: 'translateX(0)' } },
        'fade-in':        { from: { opacity: '0' }, to: { opacity: '1' } },
        'pulse-dot':      { '0%, 100%': { opacity: '1' }, '50%': { opacity: '0.4' } },
      },
      animation: {
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up':   'accordion-up 0.2s ease-out',
        'slide-in-right': 'slide-in-right 0.3s ease-out',
        'fade-in':        'fade-in 0.2s ease-out',
        'pulse-dot':      'pulse-dot 2s ease-in-out infinite',
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
};
