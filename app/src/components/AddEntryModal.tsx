import { useState, useEffect, useRef } from 'react';
import type { ExpenseEntry } from '../types/api';
import { parseCommand, parsedToEntry, type ParsedCommand } from '../lib/parser';
import { brl, SOURCE_COLORS, SOURCE_LABELS, SUBTAG_COLORS } from '../lib/fmt';
import { api } from '../api/client';
import { ModoGuiado } from './ModoGuiado';
import { ModoLote } from './ModoLote';

type Mode = 'guiado' | 'rapido' | 'lote';

interface Props { cycleId: string; onClose: () => void; onSaved: () => void; }

export function AddEntryModal({ cycleId, onClose, onSaved }: Props) {
  const [mode, setMode] = useState<Mode>('guiado'); // Guiado como padrão
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
    { k: 'guiado', label: '📋 Guiado' },
    { k: 'rapido', label: '⚡ Rápido' },
    { k: 'lote',   label: '📄 Lote'   },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-2xl bg-white border border-slate-200 rounded-2xl shadow-2xl flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100 flex-shrink-0">
          <h2 className="font-bold text-slate-800 text-sm">Novo Lançamento</h2>
          <div className="flex items-center gap-1">
            {TABS.map(({ k, label }) => (
              <button key={k} onClick={() => setMode(k)}
                className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
                  mode === k
                    ? 'bg-violet-600 text-white'
                    : 'text-slate-500 hover:text-slate-700 hover:bg-slate-100'
                }`}
              >{label}</button>
            ))}
            <button onClick={onClose} className="ml-2 text-slate-400 hover:text-slate-700 text-lg leading-none px-1">✕</button>
          </div>
        </div>
        <div className="overflow-y-auto flex-1 px-5 py-4">
          {saveError && (
            <div className="mb-3 bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-red-700 text-sm">{saveError}</div>
          )}
          {mode === 'guiado' && <ModoGuiado cycleId={cycleId} saving={saving} onSave={saveEntries} />}
          {mode === 'rapido' && <ModoRapido cycleId={cycleId} saving={saving} onSave={saveEntries} />}
          {mode === 'lote'   && <ModoLote   cycleId={cycleId} saving={saving} onSave={saveEntries} />}
        </div>
      </div>
    </div>
  );
}

// ── Modo Rápido ───────────────────────────────────────────────────────────────

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
    'Ifood 45,90 ultra #Alimentação',
    'Uber 2/6 34,90 ultra #Transporte',
    'Cerveja 50 piques @jaum',
  ];

  return (
    <div className="flex flex-col gap-4">
      <div>
        <label className="block text-xs text-slate-500 mb-1 uppercase tracking-wider font-medium">Comando</label>
        <input ref={ref} value={input} onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') submit(); }}
          placeholder="Ifood 45,90 ultra #Alimentação"
          className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5 text-slate-800 placeholder-slate-300 focus:outline-none focus:ring-2 focus:ring-violet-400 font-mono text-sm"
        />
        <p className="mt-1 text-slate-400 text-xs">descrição valor fonte @pessoa 2/6 #tag — Enter para salvar</p>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {examples.map(ex => (
          <button key={ex} onClick={() => setInput(ex)}
            className="text-xs bg-slate-50 border border-slate-200 hover:border-violet-400 text-slate-500 hover:text-violet-700 rounded px-2 py-1 transition-colors font-mono"
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
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 flex flex-col gap-2 text-sm">
      <div className="text-slate-400 text-xs uppercase tracking-wider">Preview</div>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 overflow-hidden">
          {p.subTag && <span className={`font-bold font-mono text-xs ${SUBTAG_COLORS[p.subTag] ?? ''}`}>[{p.subTag}]</span>}
          <span className="text-slate-800 truncate">{p.description || <em className="text-slate-400">sem descrição</em>}</span>
          {p.installmentCurrent != null && p.installmentTotal != null && (
            <span className="text-slate-400 text-xs font-mono">{p.installmentCurrent}/{p.installmentTotal}</span>
          )}
        </div>
        <span className={`font-mono font-semibold flex-shrink-0 ml-2 ${p.amount == null ? 'text-slate-400' : p.amount < 0 ? 'text-emerald-600' : 'text-red-500'}`}>
          {p.amount != null ? brl(p.amount) : '—'}
        </span>
      </div>
      <div className="flex flex-wrap gap-2 text-xs">
        <span className={`px-2 py-0.5 rounded-full border ${sc.text} ${sc.bg} ${sc.border}`}>{SOURCE_LABELS[p.source]}</span>
        {p.ownerId && <span className="px-2 py-0.5 rounded-full border border-violet-200 bg-violet-50 text-violet-700">@{p.ownerId}</span>}
        {p.tag && <span className="px-2 py-0.5 rounded-full border border-slate-200 bg-slate-100 text-slate-500">#{p.tag}</span>}
        {p.subtractFromUltra && <span className="px-2 py-0.5 rounded-full border border-violet-200 bg-violet-50 text-violet-700">▼ abate ultra</span>}
      </div>
    </div>
  );
}
