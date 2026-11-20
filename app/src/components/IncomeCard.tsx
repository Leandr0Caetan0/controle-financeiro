import type { IncomeItem } from '../types/api';
import { brl } from '../lib/fmt';

interface Props { incomes: IncomeItem[]; }

const CAT_CFG: Record<string, { label: string; cls: string }> = {
  Clt:    { label: 'CLT',    cls: 'bg-emerald-100 text-emerald-700' },
  Cft:    { label: 'CFT',    cls: 'bg-teal-100 text-teal-700'       },
  Ferias: { label: 'Férias', cls: 'bg-sky-100 text-sky-700'         },
  Ppr:    { label: 'PPR',    cls: 'bg-purple-100 text-purple-700'   },
  Outros: { label: 'Outros', cls: 'bg-slate-100 text-slate-600'     },
};

export function IncomeCard({ incomes }: Props) {
  const total = incomes.reduce((s, i) => s + i.amount, 0);
  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Receitas</span>
        <span className="mono text-emerald-600 text-sm font-semibold">{brl(total)}</span>
      </div>
      <div className="flex flex-col gap-2">
        {incomes.map(inc => {
          const cat = CAT_CFG[inc.category] ?? CAT_CFG['Outros'];
          return (
            <div key={inc.id} className="flex items-center justify-between gap-2 p-2 bg-slate-50 rounded-lg border border-slate-100">
              <div className="flex items-center gap-2 overflow-hidden">
                <span className={`text-xs font-semibold px-1.5 py-0.5 rounded flex-shrink-0 ${cat.cls}`}>{cat.label}</span>
                <div className="overflow-hidden">
                  <div className="text-slate-700 text-sm truncate">{inc.title}</div>
                  <div className="text-slate-400 text-xs">{inc.recurrence}{inc.receivedDay != null ? ` · Dia ${inc.receivedDay}` : ''}</div>
                </div>
              </div>
              <span className="mono text-emerald-600 text-sm font-medium flex-shrink-0">{brl(inc.amount)}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
