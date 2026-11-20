import type { ThirdPartySummaryResult } from '../types/api';
import { brl } from '../lib/fmt';

interface Props { thirdParty: ThirdPartySummaryResult; }

export function ThirdPartyCard({ thirdParty: t }: Props) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 flex flex-col gap-3">
      <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Terceiros / A Receber</span>
      <div className="flex flex-col gap-1.5">
        <Row label="Total Geral"      value={t.totalGeral} />
        <Row label="Apenas Próprio"   value={t.totalApenasProprio} highlight />
        <div className="border-t border-slate-100 my-0.5" />
        <Row label="Via Nubank Ultra" value={t.totalNubank}    sub />
        <Row label="Pix/Boleto"       value={t.totalNaoNubank} sub />
      </div>
      {t.informationalItems.length > 0 && (
        <div className="border-t border-slate-100 pt-2">
          <div className="text-slate-400 text-xs uppercase tracking-wider mb-1.5">Informativos</div>
          <div className="flex flex-col gap-1">
            {t.informationalItems.map(item => (
              <div key={item.id} className="flex justify-between items-center text-xs bg-slate-50 rounded-lg px-2.5 py-1.5 border border-slate-100">
                <div className="flex items-center gap-1.5 overflow-hidden">
                  {item.criticalAlert && <span className="text-red-500 flex-shrink-0">⚠️</span>}
                  <span className="text-slate-500 italic truncate">{item.description}</span>
                  {item.dueDay != null && <span className="text-slate-400 mono flex-shrink-0 ml-1">Dia {item.dueDay}</span>}
                </div>
                <span className="mono text-slate-600 ml-2 flex-shrink-0">{brl(item.amount)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function Row({ label, value, highlight, sub }: { label: string; value: number; highlight?: boolean; sub?: boolean }) {
  return (
    <div className={`flex justify-between items-center text-sm ${sub ? 'pl-3' : ''}`}>
      <span className={sub ? 'text-slate-400' : highlight ? 'text-emerald-700 font-medium' : 'text-slate-600'}>{label}</span>
      <span className={`mono ${highlight ? 'text-emerald-700 font-semibold' : sub ? 'text-slate-400' : 'text-slate-700'}`}>{brl(value)}</span>
    </div>
  );
}
