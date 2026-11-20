import type { FixedObligation } from '../types/api';
import { brl, SOURCE_COLORS } from '../lib/fmt';

interface Props { obligations: FixedObligation[]; }

export function ObligationsCard({ obligations }: Props) {
  const total = obligations.filter(o => o.includeInMyAccounts).reduce((s, o) => s + o.amount, 0);

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Obrigações Fixas</span>
        <span className="mono text-slate-700 text-sm font-semibold">{brl(total)}</span>
      </div>
      <div className="flex flex-col gap-1.5 max-h-64 overflow-y-auto">
        {obligations.map(o => {
          const sc = SOURCE_COLORS[o.source] ?? SOURCE_COLORS['BoletoOutros'];
          const isInfo = !o.includeInMyAccounts;
          return (
            <div key={o.id} className={`flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-lg border ${sc.bg} ${sc.border} ${isInfo ? 'opacity-50' : ''}`}>
              <div className="flex items-center gap-1.5 overflow-hidden min-w-0">
                <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${sc.dot}`} />
                <div className="overflow-hidden">
                  <div className={`text-sm truncate font-medium ${o.criticalAlert ? 'text-red-600' : sc.text}`}>
                    {o.criticalAlert && '⚠️ '}{o.title}
                    {o.installmentCurrent != null && o.installmentTotal != null && (
                      <span className="text-slate-400 text-xs ml-1">{o.installmentCurrent}/{o.installmentTotal}</span>
                    )}
                  </div>
                  <div className="text-slate-400 text-xs flex gap-1">
                    <span>Dia {o.dueDay}</span>
                    {o.splitPeople && <span>÷{o.splitPeople}</span>}
                    {o.subtractFromUltraInvoice && <span className="text-violet-500">Ultra</span>}
                    {isInfo && <span className="italic">info</span>}
                  </div>
                </div>
              </div>
              <div className="text-right flex-shrink-0 ml-1">
                <div className={`mono text-sm font-medium ${o.criticalAlert ? 'text-red-600' : sc.text}`}>{brl(o.amount)}</div>
                {o.fullInvoiceAmount != null && o.fullInvoiceAmount !== o.amount && (
                  <div className="mono text-slate-400 text-xs">{brl(o.fullInvoiceAmount)} total</div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
