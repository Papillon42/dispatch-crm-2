/** @type {import('tailwindcss').Config} */
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
        // Dark premium theme — extracted from mockups
        background: {
          DEFAULT: '#0A0C10',
          secondary: '#111318',
          tertiary: '#181B22',
          card: '#1C1F28',
          hover: '#242830',
        },
        border: {
          DEFAULT: '#2A2D36',
          subtle: '#1E2128',
          focus: '#3B82F6',
        },
        text: {
          primary: '#F1F3F7',
          secondary: '#8A91A0',
          muted: '#545C6B',
          inverse: '#0A0C10',
        },
        brand: {
          DEFAULT: '#3B82F6',
          light: '#60A5FA',
          dark: '#1D4ED8',
          muted: '#1E3A5F',
        },
        // Status colors
        status: {
          // Load statuses
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
        success: { DEFAULT: '#22C55E', light: '#86EFAC', dark: '#15803D', muted: '#14532D' },
        warning: { DEFAULT: '#F59E0B', light: '#FCD34D', dark: '#B45309', muted: '#451A03' },
        danger:  { DEFAULT: '#EF4444', light: '#FCA5A5', dark: '#B91C1C', muted: '#450A0A' },
        info:    { DEFAULT: '#3B82F6', light: '#93C5FD', dark: '#1D4ED8', muted: '#1E3A5F' },
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
