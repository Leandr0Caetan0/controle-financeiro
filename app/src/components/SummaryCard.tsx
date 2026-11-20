import type { MonthSummaryResult } from '../types/api';
import { brl } from '../lib/fmt';

interface Props { summary: MonthSummaryResult; }

export function SummaryCard({ summary: s }: Props) {
  const saldoNegativo = s.saldoLivreDoMes < 0;
  const usandoReserva = s.saldoLivreDoMes >= 0 && s.saldoLivreDoMes < s.reservaEmergencia;

  const rows = [
    { label: 'Receitas',           value: s.totalReceitas,        cls: 'text-emerald-600', prefix: '' },
    { label: 'Obrigações Fixas',   value: -s.totalObrigacoesFixas, cls: 'text-slate-700',  prefix: '−' },
    { label: 'Gastos (cartões/pix)',value: -s.totalGastosPorFonte, cls: 'text-slate-700',  prefix: '−' },
    { label: 'Reserva de Emerg.',  value: -s.reservaEmergencia,    cls: 'text-slate-500',  prefix: '−' },
  ];

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Resumo do Mês</span>
      </div>

      <div className="flex flex-col gap-1.5">
        {rows.map(r => (
          <div key={r.label} className="flex justify-between items-center">
            <span className="text-slate-500 text-sm">{r.label}</span>
            <span className={`mono text-sm font-medium ${r.cls}`}>{brl(r.value)}</span>
          </div>
        ))}

        {Object.keys(s.gastosPorFonte).length > 0 && (
          <div className="ml-3 border-l-2 border-slate-100 pl-2 flex flex-col gap-0.5 mt-0.5">
            {Object.entries(s.gastosPorFonte).map(([fonte, valor]) => (
              <div key={fonte} className="flex justify-between text-xs text-slate-400">
                <span>{fonte}</span>
                <span className="mono">{brl(valor as number)}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="border-t border-slate-100 pt-3 mt-auto">
        <div className={`rounded-lg px-3 py-2.5 flex items-center justify-between ${
          saldoNegativo   ? 'bg-red-50 border border-red-200' :
          usandoReserva   ? 'bg-amber-50 border border-amber-200' :
                            'bg-emerald-50 border border-emerald-200'
        }`}>
          <div>
            <div className={`font-semibold text-sm ${
              saldoNegativo ? 'text-red-700' : usandoReserva ? 'text-amber-700' : 'text-emerald-700'
            }`}>Saldo Livre do Mês</div>
            {usandoReserva && <div className="text-amber-600 text-xs mt-0.5">⚠️ usando respiro da reserva</div>}
            {saldoNegativo && <div className="text-red-500 text-xs mt-0.5">❌ saldo negativo</div>}
          </div>
          <span className={`mono font-bold text-base ${
            saldoNegativo ? 'text-red-700' : usandoReserva ? 'text-amber-700' : 'text-emerald-700'
          }`}>{brl(s.saldoLivreDoMes)}</span>
        </div>
      </div>
    </div>
  );
}
