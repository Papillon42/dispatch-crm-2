import { cn } from '@/lib/utils';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { ReactNode } from 'react';

interface KpiCardProps {
  label: string;
  value: string | number;
  delta?: number;
  deltaLabel?: string;
  icon?: ReactNode;
  iconColor?: string;
  prefix?: string;
  suffix?: string;
  className?: string;
  loading?: boolean;
}

export function KpiCard({
  label, value, delta, deltaLabel, icon, iconColor,
  prefix, suffix, className, loading,
}: KpiCardProps) {
  const isPositive = delta !== undefined && delta > 0;
  const isNegative = delta !== undefined && delta < 0;

  return (
    <div className={cn('kpi-card', className)}>
      <div className="flex items-start justify-between">
        <p className="text-xs font-medium text-text-secondary uppercase tracking-wider">{label}</p>
        {icon && (
          <div className={cn('w-8 h-8 rounded-md flex items-center justify-center', iconColor ?? 'bg-brand-muted')}>
            {icon}
          </div>
        )}
      </div>

      {loading ? (
        <div className="h-8 bg-background-hover rounded animate-pulse w-24" />
      ) : (
        <div className="flex items-end gap-1">
          {prefix && <span className="text-text-secondary text-sm mb-0.5">{prefix}</span>}
          <span className="text-2xl font-bold text-text-primary tracking-tight">{value}</span>
          {suffix && <span className="text-text-secondary text-sm mb-0.5">{suffix}</span>}
        </div>
      )}

      {delta !== undefined && (
        <div className="flex items-center gap-1">
          {isPositive ? (
            <TrendingUp className="w-3.5 h-3.5 text-success" />
          ) : isNegative ? (
            <TrendingDown className="w-3.5 h-3.5 text-danger" />
          ) : (
            <Minus className="w-3.5 h-3.5 text-text-muted" />
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
