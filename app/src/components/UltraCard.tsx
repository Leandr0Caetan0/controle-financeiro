import { useState } from 'react';
import type { UltraReconciliationResult } from '../types/api';
import { brl } from '../lib/fmt';
import { api } from '../api/client';

interface Props {
  cycleId: string;
  reconciliation: UltraReconciliationResult;
  emergencyReserveTarget: number;
  onUpdated: () => void;
}

const STATUS_CFG = {
  Exata:         { icon: '✅', label: 'Exata',         cls: 'bg-emerald-50 border-emerald-200 text-emerald-700' },
  Arredondamento:{ icon: '🟡', label: 'Arredondamento', cls: 'bg-amber-50 border-amber-200 text-amber-700'      },
  Divergente:    { icon: '❌', label: 'Divergente',     cls: 'bg-red-50 border-red-200 text-red-700'            },
};

export function UltraCard({ cycleId, reconciliation, emergencyReserveTarget, onUpdated }: Props) {
  const [editing, setEditing] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [saving, setSaving] = useState(false);

  const r = reconciliation;
  const cfg = STATUS_CFG[r.status] ?? STATUS_CFG['Divergente'];
  const ultraCalculado = r.faturaTotal - r.totalAssinaturas - r.totalTerceiros;

  function startEdit() {
    setInputValue(r.faturaTotal.toFixed(2).replace('.', ','));
    setEditing(true);
  }

  async function handleSave() {
    const v = parseFloat(inputValue.replace(',', '.'));
    if (isNaN(v)) { setEditing(false); return; }
    setSaving(true);
    try {
      await api.updateCycle(cycleId, { ultraInvoiceTotal: v, emergencyReserveTarget });
      onUpdated();
    } finally {
      setSaving(false);
      setEditing(false);
    }
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <span className="w-2.5 h-2.5 rounded-full bg-violet-500 flex-shrink-0" />
        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Prova Real — Nubank Ultra</span>
      </div>

      {/* Fatura total editável */}
      <div className="flex justify-between items-center">
        <span className="text-slate-500 text-sm">Fatura Total</span>
        {editing ? (
          <div className="flex items-center gap-1">
            <input autoFocus value={inputValue} onChange={e => setInputValue(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') { void handleSave(); } if (e.key === 'Escape') setEditing(false); }}
              className="mono text-right bg-slate-50 border border-violet-400 rounded px-2 py-0.5 text-slate-800 w-32 text-sm focus:outline-none focus:ring-1 focus:ring-violet-400"
            />
            <button onClick={() => { void handleSave(); }} disabled={saving}
              className="text-emerald-600 hover:text-emerald-700 text-sm px-1 disabled:opacity-50"
            >{saving ? '…' : '✓'}</button>
            <button onClick={() => setEditing(false)} className="text-slate-400 hover:text-slate-600 text-sm px-1">✕</button>
          </div>
        ) : (
          <button onClick={startEdit}
            className="mono text-slate-800 font-semibold text-sm hover:text-violet-700 flex items-center gap-1 group"
          >
            {brl(r.faturaTotal)}
            <span className="text-slate-300 group-hover:text-violet-400 text-xs ml-0.5">✏️</span>
          </button>
        )}
      </div>

      {/* Deduções */}
      <div className="border-t border-slate-100 pt-2 flex flex-col gap-1 text-sm">
        <div className="flex justify-between">
          <span className="text-slate-400 pl-2">− Assinaturas Rateadas</span>
          <span className="mono text-slate-600">{brl(r.totalAssinaturas)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-400 pl-2">− Terceiros Abatidos</span>
          <span className="mono text-slate-600">{brl(r.totalTerceiros)}</span>
        </div>
      </div>

      {/* Resultado */}
      <div className="border-t border-slate-100 pt-2 flex flex-col gap-1 text-sm">
        <div className="flex justify-between">
          <span className="text-slate-700 font-medium">= Ultra Calculado</span>
          <span className="mono text-violet-700 font-semibold">{brl(ultraCalculado)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-400 pl-2">vs Meus Gastos Nu</span>
          <span className="mono text-slate-600">{brl(r.totalMeusGastos)}</span>
        </div>
      </div>

      {/* Status */}
      <div className={`mt-auto rounded-lg border px-3 py-2 flex items-center justify-between ${cfg.cls}`}>
        <span className="font-semibold text-sm">{cfg.icon} {cfg.label}</span>
        <span className="mono text-xs opacity-70">diff: {brl(Math.abs(r.diferenca))}</span>
      </div>
    </div>
  );
}
