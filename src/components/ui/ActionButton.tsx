import { ButtonHTMLAttributes, ReactNode } from 'react';
import { cn } from '@/lib/utils';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'success';
type Size = 'sm' | 'md';

interface ActionButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  icon?: ReactNode;
  loading?: boolean;
}

const VARIANT_CLASSES: Record<Variant, string> = {
  primary: 'bg-brand hover:bg-brand-dark text-white',
  secondary: 'bg-background-hover hover:bg-background-card border border-border text-text-primary',
  ghost: 'text-text-secondary hover:text-text-primary hover:bg-background-hover',
  danger: 'bg-danger/10 hover:bg-danger/20 border border-danger/30 text-danger',
  success: 'bg-success/10 hover:bg-success/20 border border-success/30 text-success',
};

const SIZE_CLASSES: Record<Size, string> = {
  sm: 'px-3 py-1.5 text-xs',
  md: 'px-4 py-2 text-sm',
};

/** Shared button used across pages so primary/secondary/danger actions look identical everywhere. */
export function ActionButton({
  variant = 'secondary', size = 'md', icon, loading, disabled, className, children, ...props
}: ActionButtonProps) {
  return (
    <button
      disabled={disabled || loading}
      className={cn(
        'flex items-center justify-center gap-2 rounded-md font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed',
        VARIANT_CLASSES[variant],
        SIZE_CLASSES[size],
        className,
      )}
      {...props}
    >
      {icon}
      {children}
    </button>
  );
}
