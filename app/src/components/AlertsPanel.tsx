import type { FixedObligation, ExpenseEntry } from '../types/api';
import { brl } from '../lib/fmt';

interface Props { obligations: FixedObligation[]; entries: ExpenseEntry[]; }

export function AlertsPanel({ obligations, entries }: Props) {
  const criticalObl = obligations.filter(o => o.criticalAlert);
  const criticalEnt = entries.filter(e => e.criticalAlert && e.informationalOnly);
  if (criticalObl.length === 0 && criticalEnt.length === 0) return null;

  return (
    <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3">
      <div className="flex items-center gap-2 mb-2.5">
        <span className="text-sm">⚠️</span>
        <span className="font-semibold text-red-700 text-xs uppercase tracking-wider">Alertas Críticos</span>
      </div>
      <div className="flex flex-wrap gap-3">
        {criticalObl.map(a => (
          <div key={`o-${a.id}`} className="flex items-center gap-3 bg-white border border-red-200 rounded-lg px-3 py-2 shadow-sm">
            <div className="text-red-600 font-bold text-sm mono whitespace-nowrap">Dia {String(a.dueDay).padStart(2, '0')}</div>
            <div>
              <div className="text-red-800 text-sm font-medium">
                {a.title}
                {a.installmentCurrent != null && a.installmentTotal != null && (
                  <span className="text-red-400 text-xs ml-1">{a.installmentCurrent}/{a.installmentTotal}</span>
                )}
              </div>
              <div className="mono text-red-600 text-xs">{brl(a.amount)}</div>
            </div>
          </div>
        ))}
        {criticalEnt.map(e => (
          <div key={`e-${e.id}`} className="flex items-center gap-3 bg-white border border-red-200 rounded-lg px-3 py-2 shadow-sm">
            {e.dueDay != null && <div className="text-red-600 font-bold text-sm mono whitespace-nowrap">Dia {String(e.dueDay).padStart(2,'0')}</div>}
            <div>
              <div className="text-red-800 text-sm font-medium flex items-center gap-1">
                <span className="text-slate-400 text-xs">ℹ</span>
                {e.description}
                {e.installmentCurrent != null && e.installmentTotal != null && (
                  <span className="text-red-400 text-xs ml-1">{e.installmentCurrent}/{e.installmentTotal}</span>
                )}
              </div>
              <div className="mono text-red-600 text-xs">{brl(e.amount)}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
