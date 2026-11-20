import type { FixedObligation, ExpenseEntry } from '../types/api';
import { brl } from '../lib/fmt';

interface Props {
  obligations: FixedObligation[];
  entries: ExpenseEntry[];
}

export function AlertsPanel({ obligations, entries }: Props) {
  const criticalObligations = obligations.filter(o => o.criticalAlert);
  const criticalEntries = entries.filter(e => e.criticalAlert && e.informationalOnly);
  const hasAlerts = criticalObligations.length > 0 || criticalEntries.length > 0;

  if (!hasAlerts) return null;

  return (
    <div className="rounded-xl border border-red-800 bg-red-950/40 px-4 py-3 mb-4">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-red-400 text-base">⚠️</span>
        <span className="font-semibold text-red-300 uppercase tracking-wider text-xs">
          Alertas Críticos
        </span>
      </div>
      <div className="flex flex-wrap gap-3">
        {criticalObligations.map(a => (
          <AlertItem
            key={`obl-${a.id}`}
            day={a.dueDay}
            title={a.title}
            installmentCurrent={a.installmentCurrent}
            installmentTotal={a.installmentTotal}
            amount={a.amount}
          />
        ))}
        {criticalEntries.map(e => (
          <AlertItem
            key={`ent-${e.id}`}
            day={e.dueDay}
            title={e.description}
            installmentCurrent={e.installmentCurrent}
            installmentTotal={e.installmentTotal}
            amount={e.amount}
            info
          />
        ))}
      </div>
    </div>
  );
}

function AlertItem({
  day, title, installmentCurrent, installmentTotal, amount, info,
}: {
  day?: number;
  title: string;
  installmentCurrent?: number;
  installmentTotal?: number;
  amount: number;
  info?: boolean;
}) {
  return (
    <div className="flex items-center gap-3 rounded-lg bg-red-900/30 border border-red-800/50 px-3 py-2">
      {day != null && (
        <div className="text-red-400 font-bold text-sm mono whitespace-nowrap">
          Dia {String(day).padStart(2, '0')}
        </div>
      )}
      <div>
        <div className="text-red-200 text-sm font-medium flex items-center gap-1">
          {info && <span className="text-zinc-400 text-xs">ℹ</span>}
          {title}
          {installmentCurrent != null && installmentTotal != null && (
            <span className="text-red-400 text-xs ml-1">
              {installmentCurrent}/{installmentTotal}
            </span>
          )}
        </div>
        <div className="mono text-red-300 text-xs">{brl(amount)}</div>
      </div>
    </div>
  );
}
