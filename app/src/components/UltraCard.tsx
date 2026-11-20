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
  Exata:         { icon: '✅', label: 'Exata',          cls: 'text-green-400 bg-green-950/50 border-green-800'  },
  Arredondamento:{ icon: '🟡', label: 'Arredondamento',  cls: 'text-yellow-300 bg-yellow-950/50 border-yellow-800' },
  Divergente:    { icon: '❌', label: 'Divergente',      cls: 'text-red-400 bg-red-950/50 border-red-800'    },
};

export function UltraCard({ cycleId, reconciliation, emergencyReserveTarget, onUpdated }: Props) {
  const [editing, setEditing] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [saving, setSaving] = useState(false);

  const r = reconciliation;
  const cfg = STATUS_CFG[r.status];
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
    <div className="rounded-xl border border-violet-800/60 bg-violet-950/20 p-4 flex flex-col gap-3 h-full">
      <div className="flex items-center gap-2">
        <span className="w-2.5 h-2.5 rounded-full bg-violet-500 flex-shrink-0" />
        <span className="font-semibold text-violet-200 text-xs uppercase tracking-wider">
          Prova Real — Nubank Ultra
        </span>
      </div>

      {/* Fatura total editável */}
      <div className="flex justify-between items-center">
        <span className="text-zinc-400 text-sm">Fatura Total</span>
        {editing ? (
          <div className="flex items-center gap-1">
            <input
              autoFocus
              className="mono text-right bg-zinc-800 border border-violet-500 rounded px-2 py-0.5 text-violet-100 w-32 text-sm focus:outline-none"
              value={inputValue}
              onChange={e => setInputValue(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleSave(); if (e.key === 'Escape') setEditing(false); }}
            />
            <button onClick={handleSave} disabled={saving} className="text-green-400 hover:text-green-300 text-sm px-1 disabled:opacity-50">
              {saving ? '…' : '✓'}
            </button>
            <button onClick={() => setEditing(false)} className="text-zinc-500 hover:text-zinc-300 text-sm px-1">✕</button>
          </div>
        ) : (
          <button onClick={startEdit} className="mono text-violet-100 font-semibold text-sm hover:text-violet-300 flex items-center gap-1 group">
            {brl(r.faturaTotal)}
            <span className="text-zinc-600 group-hover:text-violet-400 text-xs ml-0.5">✏️</span>
          </button>
        )}
      </div>

      {/* Deduções */}
      <div className="border-t border-zinc-800 pt-2 flex flex-col gap-1 text-sm">
        <div className="flex justify-between">
          <span className="text-zinc-400 pl-2">− Assinaturas Rateadas</span>
          <span className="mono text-zinc-300">{brl(r.totalAssinaturas)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-zinc-400 pl-2">− Terceiros Abatidos</span>
          <span className="mono text-zinc-300">{brl(r.totalTerceiros)}</span>
        </div>
      </div>

      {/* Resultado calculado */}
      <div className="border-t border-zinc-800 pt-2 flex flex-col gap-1 text-sm">
        <div className="flex justify-between">
          <span className="text-zinc-300 font-medium">= Ultra Calculado</span>
          <span className="mono text-violet-200 font-semibold">{brl(ultraCalculado)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-zinc-400 pl-2">vs Meus Gastos Nu</span>
          <span className="mono text-zinc-300">{brl(r.totalMeusGastos)}</span>
        </div>
      </div>

      {/* Status badge */}
      <div className={`mt-auto rounded-lg border px-3 py-2 flex items-center justify-between ${cfg.cls}`}>
        <span className="font-semibold text-sm">{cfg.icon} {cfg.label}</span>
        <span className="mono text-xs opacity-80">
          diff: {brl(Math.abs(r.diferenca))}
        </span>
      </div>
    </div>
  );
}
