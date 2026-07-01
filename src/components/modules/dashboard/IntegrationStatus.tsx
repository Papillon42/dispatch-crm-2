import { CheckCircle2, XCircle } from 'lucide-react';

interface Integration {
  name: string;
  connected: boolean;
}

// Phase 0-3: these are stubbed as "not connected" until Phase 4 builds the real integrations
const INTEGRATIONS: Integration[] = [
  { name: 'Telegram Bot', connected: !!process.env.TELEGRAM_BOT_TOKEN && !!process.env.TELEGRAM_WEBHOOK_SECRET },
  { name: 'Gmail', connected: false },
  { name: 'RingCentral', connected: false },
  { name: 'OpenLayers Map', connected: true },
];

export function IntegrationStatus() {
  return (
    <div className="bg-background-card border border-border rounded-lg p-4">
      <h2 className="text-sm font-semibold text-text-primary mb-3">Integration Status</h2>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {INTEGRATIONS.map((i) => (
          <div key={i.name} className="flex items-center gap-2 px-3 py-2 rounded-md bg-background-hover">
            {i.connected ? (
              <CheckCircle2 className="w-4 h-4 text-success flex-shrink-0" />
            ) : (
              <XCircle className="w-4 h-4 text-text-muted flex-shrink-0" />
            )}
            <span className="text-sm text-text-secondary truncate">{i.name}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
