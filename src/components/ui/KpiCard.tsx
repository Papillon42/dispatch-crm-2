import { cn } from '@/lib/utils';
import { TrendingUp, TrendingDown, Minus, MoreHorizontal } from 'lucide-react';
import { ReactNode } from 'react';
import { Sparkline } from './Sparkline';

interface KpiCardProps {
  label: string;
  /** Small muted subtitle under the label, e.g. "Этот месяц" / "Сегодня" / "Активные". */
  period?: string;
  value: string | number;
  delta?: number;
  deltaLabel?: string;
  icon?: ReactNode;
  iconColor?: string;
  prefix?: string;
  suffix?: string;
  className?: string;
  loading?: boolean;
  /** Mini trend line rendered under the value, matching the mockup KPI cards. */
  trend?: number[];
  trendColor?: string;
  /** Decorative "more actions" affordance in the top-right corner, matching the reference cards. */
  showMenu?: boolean;
  /** Explicit up/down/neutral override for the delta row icon (e.g. Drivers card uses a neutral bullet, not an arrow). Falls back to the sign of `delta`. */
  direction?: 'up' | 'down' | 'neutral';
}

export function KpiCard({
  label, period, value, delta, deltaLabel, icon, iconColor,
  prefix, suffix, className, loading, trend, trendColor, showMenu, direction,
}: KpiCardProps) {
  const isPositive = direction ? direction === 'up' : delta !== undefined && delta > 0;
  const isNegative = direction ? direction === 'down' : delta !== undefined && delta < 0;
  const resolvedTrendColor = trendColor ?? (isNegative ? '#EF4444' : '#3B82F6');

  return (
    <div className={cn('kpi-card', className)}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-start gap-2.5 min-w-0">
          {icon && (
            <div className={cn('w-8 h-8 rounded-md flex items-center justify-center flex-shrink-0', iconColor ?? 'bg-brand-muted')}>
              {icon}
            </div>
          )}
          <div className="min-w-0">
            <p className="text-xs font-medium text-text-secondary uppercase tracking-wider truncate">{label}</p>
            {period && <p className="text-2xs text-text-muted mt-0.5 truncate">{period}</p>}
          </div>
        </div>
        {showMenu && (
          <button
            type="button"
            className="w-6 h-6 flex-shrink-0 flex items-center justify-center rounded text-text-muted hover:text-text-secondary hover:bg-background-hover"
            aria-label="Дополнительные действия"
          >
            <MoreHorizontal className="w-4 h-4" />
          </button>
        )}
      </div>

      {loading ? (
        <div className="h-8 bg-background-hover rounded animate-pulse w-24 mt-2" />
      ) : (
        <div className="flex items-end justify-between gap-2 mt-2">
          <div className="flex items-end gap-1">
            {prefix && <span className="text-text-secondary text-sm mb-0.5">{prefix}</span>}
            <span className="text-2xl font-bold text-text-primary tracking-tight">{value}</span>
            {suffix && <span className="text-text-secondary text-sm mb-0.5">{suffix}</span>}
          </div>
          {trend && trend.length > 1 && (
            <Sparkline data={trend} color={resolvedTrendColor} className="h-8 w-16 flex-shrink-0" />
          )}
        </div>
      )}

      {delta !== undefined && (
        <div className="flex items-center gap-1 mt-1.5">
          {isPositive ? (
            <TrendingUp className="w-3.5 h-3.5 text-success" />
          ) : isNegative ? (
            <TrendingDown className="w-3.5 h-3.5 text-danger" />
          ) : (
            <span className="w-1.5 h-1.5 rounded-full bg-brand flex-shrink-0" />
          )}
          <span className={cn(
            'text-xs font-medium',
            isPositive && 'text-success',
            isNegative && 'text-danger',
            !isPositive && !isNegative && 'text-text-muted',
          )}>
            {isPositive ? '+' : ''}{delta.toFixed(1)}%
          </span>
          {deltaLabel && <span className="text-xs text-text-muted">{deltaLabel}</span>}
        </div>
      )}
    </div>
  );
}
