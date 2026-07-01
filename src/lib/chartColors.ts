'use client';

import { useEffect, useState } from 'react';
import { Theme } from './theme';

/**
 * Recharts/canvas consumers can't read Tailwind classes — they need literal
 * color strings. These maps mirror the CSS variables in globals.css exactly
 * so charts stay in sync with the active theme without duplicating design
 * decisions in two places.
 */
export const CHART_COLORS: Record<Theme, {
  background: string; backgroundCard: string; backgroundHover: string;
  border: string; borderSubtle: string;
  textPrimary: string; textSecondary: string; textMuted: string;
  brand: string; brandLight: string; brandMuted: string;
  success: string; warning: string; danger: string; info: string;
  gridLine: string; tooltipBg: string; tooltipBorder: string;
  donut: string[];
}> = {
  night: {
    background: '#0A0C10',
    backgroundCard: '#1C1F28',
    backgroundHover: '#242830',
    border: '#2A2D36',
    borderSubtle: '#1E2128',
    textPrimary: '#F1F3F7',
    textSecondary: '#8A91A0',
    textMuted: '#545C6B',
    brand: '#3B82F6',
    brandLight: '#60A5FA',
    brandMuted: '#1E3A5F',
    success: '#22C55E',
    warning: '#F59E0B',
    danger: '#EF4444',
    info: '#3B82F6',
    gridLine: '#1E2128',
    tooltipBg: '#1C1F28',
    tooltipBorder: '#2A2D36',
    donut: ['#3B82F6', '#22C55E', '#F59E0B', '#8B5CF6', '#06B6D4', '#6B7280'],
  },
  day: {
    background: '#F7F2E7',
    backgroundCard: '#FFFEF9',
    backgroundHover: '#F0E8D6',
    border: '#E1D6BC',
    borderSubtle: '#ECE3CE',
    textPrimary: '#241F16',
    textSecondary: '#6B6152',
    textMuted: '#948A76',
    brand: '#2563EB',
    brandLight: '#3B82F6',
    brandMuted: '#DCEAFD',
    success: '#16A34A',
    warning: '#D97706',
    danger: '#DC2626',
    info: '#2563EB',
    gridLine: '#E1D6BC',
    tooltipBg: '#FFFEF9',
    tooltipBorder: '#E1D6BC',
    donut: ['#2563EB', '#16A34A', '#D97706', '#7C3AED', '#0891B2', '#78716C'],
  },
};

/** Client-only hook returning the live chart palette for the active theme. */
export function useChartColors() {
  const [theme, setTheme] = useState<Theme>('night');

  useEffect(() => {
    const read = () => {
      const attr = document.documentElement.getAttribute('data-theme');
      setTheme(attr === 'day' ? 'day' : 'night');
    };
    read();
    const observer = new MutationObserver(read);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    return () => observer.disconnect();
  }, []);

  return CHART_COLORS[theme];
}
