import type { FixedObligation } from '../types/api';
import { brl, SOURCE_COLORS } from '../lib/fmt';

interface Props {
  obligations: FixedObligation[];
}

export function ObligationsCard({ obligations }: Props) {
  const total = obligations
    .filter(o => o.includeInMyAccounts)
    .reduce((sum, o) => sum + o.amount, 0);

  return (
    <div className="rounded-xl border border-zinc-700 bg-zinc-900/50 p-4 flex flex-col gap-2">
      <div className="flex items-center justify-between mb-1">
        <span className="font-semibold text-zinc-200 text-xs uppercase tracking-wider">
          Obrigações Fixas
        </span>
        <span className="mono text-zinc-300 text-sm font-semibold">{brl(total)}</span>
      </div>

      <div className="flex flex-col gap-1 max-h-64 overflow-y-auto pr-1">
        {obligations.map(o => {
          const sc = SOURCE_COLORS[o.source] ?? SOURCE_COLORS['BoletoOutros'];
          const isInfo = !o.includeInMyAccounts;
          return (
            <div
              key={o.id}
              className={`flex items-center justify-between rounded-lg px-2.5 py-1.5 ${sc.bg} border ${sc.border} ${isInfo ? 'opacity-50' : ''}`}
            >
              <div className="flex items-center gap-2 overflow-hidden min-w-0">
                <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${sc.dot}`} />
                <div className="overflow-hidden">
                  <div className={`text-sm truncate ${o.criticalAlert ? 'text-red-300 font-medium' : sc.text}`}>
                    {o.criticalAlert && '⚠️ '}{o.title}
                    {o.installmentCurrent != null && o.installmentTotal != null && (
                      <span className="text-zinc-500 text-xs ml-1">
                        {o.installmentCurrent}/{o.installmentTotal}
                      </span>
                    )}
                  </div>
                  <div className="text-zinc-600 text-xs flex gap-1 items-center">
                    <span>Dia {o.dueDay}</span>
                    {o.splitPeople && <span>÷{o.splitPeople}</span>}
                    {o.subtractFromUltraInvoice && <span className="text-violet-500">Ultra</span>}
                    {isInfo && <span className="italic text-zinc-600">info</span>}
                  </div>
                </div>
              </div>
              <div className="text-right flex-shrink-0 ml-2">
                <div className={`mono text-sm ${o.criticalAlert ? 'text-red-300' : sc.text}`}>
                  {brl(o.amount)}
                </div>
                {o.fullInvoiceAmount != null && o.fullInvoiceAmount !== o.amount && (
                  <div className="mono text-zinc-600 text-xs">{brl(o.fullInvoiceAmount)} total</div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
