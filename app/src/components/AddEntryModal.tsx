import { useState, useEffect, useRef } from 'react';
import type { ExpenseEntry } from '../types/api';
import { parseCommand, parsedToEntry, type ParsedCommand } from '../lib/parser';
import { brl, SOURCE_COLORS, SOURCE_LABELS, SUBTAG_COLORS } from '../lib/fmt';
import { api } from '../api/client';
import { ModoGuiado } from './ModoGuiado';
import { ModoLote } from './ModoLote';

type Mode = 'rapido' | 'guiado' | 'lote';

interface Props { cycleId: string; onClose: () => void; onSaved: () => void; }

export function AddEntryModal({ cycleId, onClose, onSaved }: Props) {
  const [mode, setMode] = useState<Mode>('rapido');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  async function saveEntries(entries: Partial<ExpenseEntry>[]) {
    setSaving(true);
    setSaveError(null);
    try {
      await api.addEntries(cycleId, entries);
      onSaved();
      onClose();
    } catch (err: unknown) {
      setSaveError(String(err));
    } finally {
      setSaving(false);
    }
  }

  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', h);
    return () => document.removeEventListener('keydown', h);
  }, [onClose]);

  const TABS: { k: Mode; label: string }[] = [
    { k: 'rapido', label: '⚡ Rápido' },
    { k: 'guiado', label: '📋 Guiado' },
    { k: 'lote',   label: '📄 Lote'   },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-2xl bg-zinc-900 border border-zinc-700 rounded-2xl shadow-2xl flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-zinc-800 flex-shrink-0">
          <h2 className="font-bold text-zinc-100 text-sm">Novo Lançamento</h2>
          <div className="flex items-center gap-1">
            {TABS.map(({ k, label }) => (
              <button key={k} onClick={() => setMode(k)}
                className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${mode === k ? 'bg-violet-600 text-white' : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'}`}
              >{label}</button>
            ))}
            <button onClick={onClose} className="ml-2 text-zinc-500 hover:text-zinc-200 text-lg leading-none px-1">✕</button>
          </div>
        </div>
        <div className="overflow-y-auto flex-1 px-5 py-4">
          {saveError && (
            <div className="mb-3 bg-red-950/60 border border-red-800 rounded-lg px-3 py-2 text-red-300 text-sm">{saveError}</div>
          )}
          {mode === 'rapido' && <ModoRapido cycleId={cycleId} saving={saving} onSave={saveEntries} />}
          {mode === 'guiado' && <ModoGuiado cycleId={cycleId} saving={saving} onSave={saveEntries} />}
          {mode === 'lote'   && <ModoLote   cycleId={cycleId} saving={saving} onSave={saveEntries} />}
        </div>
      </div>
    </div>
  );
}

// ── Modo Rápido (inline aqui por ser pequeno) ─────────────────────────────────

function ModoRapido({ cycleId, saving, onSave }: { cycleId: string; saving: boolean; onSave: (e: Partial<ExpenseEntry>[]) => void }) {
  const [input, setInput] = useState('');
  const ref = useRef<HTMLInputElement>(null);
  const parsed = input.trim() ? parseCommand(input) : null;
  useEffect(() => { ref.current?.focus(); }, []);

  function submit() {
    if (!parsed || parsed.amount === null) return;
    onSave([parsedToEntry(parsed, cycleId)]);
  }

  const examples = [
    'Disney+ [J] 17,50 ultra @xus #Assinatura',
    'Cerveja -50 piques @jaum',
    'Ifood 45,90 ultra #Alimentação',
    'Uber 2/6 34,90 ultra #Transporte',
  ];

  return (
    <div className="flex flex-col gap-4">
      <div>
        <label className="block text-xs text-zinc-500 mb-1 uppercase tracking-wider">Comando</label>
        <input ref={ref} value={input} onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') submit(); }}
          placeholder="Disney+ [J] 17,50 ultra @xus #Assinatura"
          className="w-full bg-zinc-800 border border-zinc-600 rounded-lg px-3 py-2.5 text-zinc-100 placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-violet-500 mono text-sm"
        />
        <p className="mt-1 text-zinc-600 text-xs">descrição [J/U/C] valor fonte @pessoa 2/6 #tag — Enter para salvar</p>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {examples.map(ex => (
          <button key={ex} onClick={() => setInput(ex)}
            className="text-xs bg-zinc-800 border border-zinc-700 hover:border-violet-600 text-zinc-500 hover:text-violet-300 rounded px-2 py-1 transition-colors mono"
          >{ex}</button>
        ))}
      </div>
      {parsed && <PreviewCard parsed={parsed} />}
      <button onClick={submit} disabled={saving || !parsed || parsed.amount === null}
        className="w-full bg-violet-600 hover:bg-violet-500 disabled:opacity-40 text-white font-medium rounded-lg py-2.5 transition-colors text-sm"
      >{saving ? 'Salvando…' : '⚡ Salvar Lançamento'}</button>
    </div>
  );
}

function PreviewCard({ parsed: p }: { parsed: ParsedCommand }) {
  const sc = SOURCE_COLORS[p.source] ?? SOURCE_COLORS['BoletoOutros'];
  return (
    <div className="rounded-xl border border-zinc-700 bg-zinc-800/50 p-3 flex flex-col gap-2 text-sm">
      <div className="text-zinc-500 text-xs uppercase tracking-wider">Preview</div>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 overflow-hidden">
          {p.subTag && <span className={`font-bold mono text-xs ${SUBTAG_COLORS[p.subTag] ?? ''}`}>[{p.subTag}]</span>}
          <span className="text-zinc-200 truncate">{p.description || <em className="text-zinc-600">sem descrição</em>}</span>
          {p.installmentCurrent != null && p.installmentTotal != null && (
            <span className="text-zinc-500 text-xs mono">{p.installmentCurrent}/{p.installmentTotal}</span>
          )}
        </div>
        <span className={`mono font-semibold flex-shrink-0 ml-2 ${p.amount == null ? 'text-zinc-600' : p.amount < 0 ? 'text-green-400' : 'text-red-300'}`}>
          {p.amount != null ? brl(p.amount) : '—'}
        </span>
      </div>
      <div className="flex flex-wrap gap-2 text-xs">
        <span className={`px-2 py-0.5 rounded-full border ${sc.text} ${sc.bg} ${sc.border}`}>{SOURCE_LABELS[p.source]}</span>
        {p.ownerId && <span className="px-2 py-0.5 rounded-full border border-emerald-800 bg-emerald-950/40 text-emerald-300">@{p.ownerId}</span>}
        {p.tag && <span className="px-2 py-0.5 rounded-full border border-zinc-700 bg-zinc-800 text-zinc-400">#{p.tag}</span>}
        {p.subtractFromUltra && <span className="px-2 py-0.5 rounded-full border border-violet-800 bg-violet-950/40 text-violet-300">▼ abate ultra</span>}
      </div>
    </div>
  );
}
