'use client';

interface RouteMiniMapProps {
  originLabel: string;
  destinationLabel: string;
  miles?: number | null;
  /** 0-1 progress along the route, used to place the moving truck marker. */
  progress?: number;
  animate?: boolean;
}

/**
 * Compact route visualization for the load detail panel — origin/destination
 * pins joined by a route line, with a truck marker animating along the path
 * for in-transit loads (pure SVG <animateMotion>, no JS animation loop needed).
 */
export function RouteMiniMap({ originLabel, destinationLabel, miles, progress = 0.35, animate = true }: RouteMiniMapProps) {
  const pathD = 'M 24 84 C 90 20, 180 130, 276 40';

  return (
    <div className="relative h-40 w-full overflow-hidden rounded-lg border border-border bg-[#0D1017]">
      <svg viewBox="0 0 300 120" className="h-full w-full" preserveAspectRatio="none">
        {/* grid backdrop */}
        <defs>
          <pattern id="route-grid" width="20" height="20" patternUnits="userSpaceOnUse">
            <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#1C1F28" strokeWidth="1" />
          </pattern>
          <linearGradient id="route-line" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#3B82F6" />
            <stop offset="100%" stopColor="#22C55E" />
          </linearGradient>
        </defs>
        <rect width="300" height="120" fill="url(#route-grid)" />

        <path d={pathD} fill="none" stroke="url(#route-line)" strokeWidth="2" strokeDasharray="5 4" opacity={0.85} />

        {/* origin pin */}
        <circle cx="24" cy="84" r="5" fill="#3B82F6" stroke="#0D1017" strokeWidth="2" />
        <text x="24" y="102" fontSize="9" fill="#8A91A0" textAnchor="middle">{originLabel}</text>

        {/* destination pin */}
        <circle cx="276" cy="40" r="5" fill="#22C55E" stroke="#0D1017" strokeWidth="2" />
        <text x="276" y="24" fontSize="9" fill="#8A91A0" textAnchor="middle">{destinationLabel}</text>

        {/* moving truck marker */}
        <circle r="4.5" fill="#F59E0B">
          {animate && (
            <animateMotion dur="6s" repeatCount="indefinite" path={pathD} keyPoints="0;1" keyTimes="0;1" calcMode="linear" />
          )}
          {!animate && <animateMotion dur="0.01s" fill="freeze" path={pathD} keyPoints={`${progress};${progress}`} keyTimes="0;1" />}
        </circle>
      </svg>
      {miles != null && (
        <div className="absolute right-2 top-2 rounded bg-background-card/90 px-2 py-1 text-2xs text-text-secondary border border-border">
          {Math.round(miles)} mi
        </div>
      )}
    </div>
  );
}
