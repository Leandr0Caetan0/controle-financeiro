import type { IncomeItem } from '../types/api';
import { brl } from '../lib/fmt';

interface Props {
  incomes: IncomeItem[];
}

const CATEGORY_LABEL: Record<string, string> = {
  Clt: 'CLT', Cft: 'CFT', Ferias: 'Férias', Ppr: 'PPR', Outros: 'Outros',
};

const CATEGORY_COLOR: Record<string, string> = {
  Clt:    'text-green-400 bg-green-950/40 border-green-800',
  Cft:    'text-teal-400  bg-teal-950/40  border-teal-800',
  Ferias: 'text-sky-400   bg-sky-950/40   border-sky-800',
  Ppr:    'text-purple-400 bg-purple-950/40 border-purple-800',
  Outros: 'text-zinc-400  bg-zinc-800/40  border-zinc-700',
};

export function IncomeCard({ incomes }: Props) {
  const total = incomes.reduce((sum, i) => sum + i.amount, 0);

  return (
    <div className="rounded-xl border border-zinc-700 bg-zinc-900/50 p-4 flex flex-col gap-2">
      <div className="flex items-center justify-between mb-1">
        <span className="font-semibold text-zinc-200 text-xs uppercase tracking-wider">Receitas</span>
        <span className="mono text-green-300 text-sm font-semibold">{brl(total)}</span>
      </div>
      <div className="flex flex-col gap-1.5">
        {incomes.map(income => {
          const colorCls = CATEGORY_COLOR[income.category] ?? CATEGORY_COLOR['Outros'];
          return (
            <div key={income.id} className={`flex items-center justify-between rounded-lg px-2.5 py-2 border ${colorCls}`}>
              <div className="flex items-center gap-2 overflow-hidden">
                <span className={`text-xs font-bold px-1.5 py-0.5 rounded border ${colorCls} flex-shrink-0`}>
                  {CATEGORY_LABEL[income.category] ?? income.category}
                </span>
                <div className="overflow-hidden">
                  <div className="text-sm text-zinc-200 truncate">{income.title}</div>
                  <div className="text-zinc-500 text-xs">
                    {income.recurrence}
                    {income.receivedDay != null && ` · Dia ${income.receivedDay}`}
                  </div>
                </div>
              </div>
              <span className="mono text-green-300 text-sm font-medium flex-shrink-0 ml-2">
                {brl(income.amount)}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
