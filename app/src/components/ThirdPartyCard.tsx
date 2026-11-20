import type { ThirdPartySummaryResult } from '../types/api';
import { brl } from '../lib/fmt';

interface Props {
  thirdParty: ThirdPartySummaryResult;
}

export function ThirdPartyCard({ thirdParty: t }: Props) {
  return (
    <div className="rounded-xl border border-emerald-800/60 bg-emerald-950/20 p-4 flex flex-col gap-2 h-full">
      <span className="font-semibold text-emerald-200 text-xs uppercase tracking-wider mb-1">
        Terceiros / A Receber
      </span>

      <TRow label="Total Geral" value={t.totalGeral} />
      <TRow label="Apenas Próprio" value={t.totalApenasProprio} highlight />
      <div className="border-t border-zinc-800 my-1" />
      <TRow label="Via Nubank Ultra" value={t.totalNubank} sub />
      <TRow label="Outros (Pix/Boleto)" value={t.totalNaoNubank} sub />

      {t.informationalItems.length > 0 && (
        <div className="mt-2 border-t border-zinc-800 pt-2">
          <div className="text-zinc-500 text-xs mb-1 uppercase tracking-wider">Informativos</div>
          <div className="flex flex-col gap-1">
            {t.informationalItems.map(item => (
              <div key={item.id} className="flex justify-between items-center text-xs">
                <div className="flex items-center gap-1 overflow-hidden">
                  {item.criticalAlert && <span className="text-red-400 flex-shrink-0">⚠️</span>}
                  <span className="text-zinc-400 italic truncate">{item.description}</span>
                  {item.dueDay != null && (
                    <span className="text-zinc-600 mono flex-shrink-0">Dia {item.dueDay}</span>
                  )}
                </div>
                <span className="mono text-zinc-400 ml-2 flex-shrink-0">{brl(item.amount)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function TRow({ label, value, highlight, sub }: {
  label: string; value: number; highlight?: boolean; sub?: boolean;
}) {
  return (
    <div className={`flex justify-between items-center text-sm ${sub ? 'pl-3' : ''}`}>
      <span className={sub ? 'text-zinc-500' : highlight ? 'text-emerald-300 font-medium' : 'text-zinc-300'}>
        {label}
      </span>
      <span className={`mono ${highlight ? 'text-emerald-200 font-semibold' : sub ? 'text-zinc-500' : 'text-zinc-300'}`}>
        {brl(value)}
      </span>
    </div>
  );
}
