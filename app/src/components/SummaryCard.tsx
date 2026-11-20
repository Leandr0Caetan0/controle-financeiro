import type { MonthSummaryResult } from '../types/api';
import { brl } from '../lib/fmt';

interface Props {
  summary: MonthSummaryResult;
}

export function SummaryCard({ summary: s }: Props) {
  const saldoNegativo = s.saldoLivreDoMes < 0;
  const usandoReserva = s.saldoLivreDoMes >= 0 && s.saldoLivreDoMes < s.reservaEmergencia;

  return (
    <div className="rounded-xl border border-zinc-700 bg-zinc-900/60 p-4 flex flex-col gap-2 h-full">
      <span className="font-semibold text-zinc-200 text-xs uppercase tracking-wider mb-1">
        Resumo do Mês
      </span>

      <SummaryRow label="Receitas" value={s.totalReceitas} color="text-green-400" />
      <SummaryRow label="Obrigações Fixas" value={-s.totalObrigacoesFixas} color="text-zinc-300" />
      <SummaryRow label="Gastos (fontes)" value={-s.totalGastosPorFonte} color="text-zinc-300" />
      <SummaryRow label="Reserva de Emergência" value={-s.reservaEmergencia} color="text-zinc-400" />

      {/* Gastos por fonte */}
      {Object.entries(s.gastosPorFonte).length > 0 && (
        <div className="ml-3 flex flex-col gap-0.5 text-xs">
          {Object.entries(s.gastosPorFonte).map(([fonte, valor]) => (
            <div key={fonte} className="flex justify-between text-zinc-500">
              <span>{fonte}</span>
              <span className="mono">{brl(valor)}</span>
            </div>
          ))}
        </div>
      )}

      {/* Divisor */}
      <div className="border-t border-zinc-700 mt-1" />

      {/* Saldo Livre */}
      <div className={`rounded-lg px-3 py-2.5 flex items-center justify-between mt-auto ${
        saldoNegativo
          ? 'bg-red-950/50 border border-red-800'
          : usandoReserva
            ? 'bg-yellow-950/50 border border-yellow-800'
            : 'bg-green-950/40 border border-green-800'
      }`}>
        <div>
          <div className={`font-bold text-base ${
            saldoNegativo ? 'text-red-300' : usandoReserva ? 'text-yellow-300' : 'text-green-300'
          }`}>
            Saldo Livre do Mês
          </div>
          {usandoReserva && (
            <div className="text-yellow-500 text-xs mt-0.5">
              ⚠️ usando respiro da reserva
            </div>
          )}
          {saldoNegativo && (
            <div className="text-red-400 text-xs mt-0.5">
              ❌ saldo negativo
            </div>
          )}
        </div>
        <span className={`mono font-bold text-lg ${
          saldoNegativo ? 'text-red-300' : usandoReserva ? 'text-yellow-300' : 'text-green-300'
        }`}>
          {brl(s.saldoLivreDoMes)}
        </span>
      </div>
    </div>
  );
}

function SummaryRow({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="flex justify-between items-center text-sm">
      <span className="text-zinc-400">{label}</span>
      <span className={`mono ${color}`}>{brl(value)}</span>
    </div>
  );
}
