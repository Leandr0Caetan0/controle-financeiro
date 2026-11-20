import { useState } from 'react';
import type { ExpenseEntry, ExpenseSource, SubTag } from '../types/api';
import { parseInvoiceLines, type ParsedInvoiceLine } from '../lib/parser';
import { brl, SOURCE_COLORS, SUBTAG_COLORS } from '../lib/fmt';

const PEOPLE: { id: string; label: string; tag: SubTag | null }[] = [
  { id: 'eu',    label: 'Eu',      tag: null },
  { id: 'xus',   label: 'Xus',     tag: 'J'  },
  { id: 'jaum',  label: 'Jaum',    tag: 'J'  },
  { id: 'sogra', label: 'Sogra',   tag: 'U'  },
  { id: 'tia',   label: 'Tia/Gui', tag: 'C'  },
];

interface RowState {
  line: ParsedInvoiceLine;
  source: ExpenseSource;
  ownerId: string;
  subTag: SubTag | null;
  tag: string;
  subtractFromUltra: boolean;
  skip: boolean;
}

interface Props {
  cycleId: string;
  saving: boolean;
  onSave: (entries: Partial<ExpenseEntry>[]) => void;
}

export function ModoLote({ cycleId, saving, onSave }: Props) {
  const [text, setText] = useState('');
  const [rows, setRows] = useState<RowState[]>([]);
  const [parsed, setParsed] = useState(false);

  function handleParse() {
    const lines = parseInvoiceLines(text);
    if (lines.length === 0) return;
    setRows(lines.map(line => ({
      line,
      source: 'NubankUltra',
      ownerId: 'eu',
      subTag: null,
      tag: '',
      subtractFromUltra: false,
      skip: false,
    })));
    setParsed(true);
  }

  function updateRow(i: number, patch: Partial<RowState>) {
    setRows(prev => prev.map((r, idx) => idx === i ? { ...r, ...patch } : r));
  }

  function selectPersonForRow(i: number, id: string, tag: SubTag | null) {
    const row = rows[i];
    updateRow(i, {
      ownerId: id,
      subTag: tag,
      subtractFromUltra: id !== 'eu' && row.source === 'NubankUltra',
    });
  }

  function handleSave() {
    const entries: Partial<ExpenseEntry>[] = rows
      .filter(r => !r.skip)
      .map(r => ({
        description: r.line.description,
        amount: r.line.amount,
        date: r.line.date,
        source: r.source,
        ownerId: r.ownerId === 'eu' ? undefined : r.ownerId,
        subTag: r.subTag ?? undefined,
        tag: r.tag || 'Geral',
        subtractFromUltra: r.subtractFromUltra,
        informationalOnly: false,
        criticalAlert: false,
        monthCycleId: cycleId,
      }));
    if (entries.length > 0) onSave(entries);
  }

  const EXAMPLE = `15/11 Uber *Trip R$ 34,90
16/11 iFood R$ 67,00
17/11 Amazon Prime R$ 21,00
18/11 Spotify R$ 26,90`;

  if (!parsed) {
    return (
      <div className="flex flex-col gap-4">
        <div>
          <label className="block text-xs text-zinc-500 mb-1 uppercase tracking-wider">
            Colar Fatura (Nubank / Amazon)
          </label>
          <textarea
            value={text}
            onChange={e => setText(e.target.value)}
            rows={8}
            placeholder={EXAMPLE}
            className="w-full bg-zinc-800 border border-zinc-600 rounded-lg px-3 py-2 text-zinc-100 placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-violet-500 mono text-xs resize-none"
          />
          <p className="mt-1 text-zinc-600 text-xs">
            Formato: DD/MM Descrição R$ valor — ou cole diretamente do app Nubank/Amazon
          </p>
        </div>
        <button
          onClick={() => setText(EXAMPLE)}
          className="text-xs text-violet-400 hover:text-violet-300 self-start"
        >
          Usar exemplo
        </button>
        <button
          onClick={handleParse}
          disabled={!text.trim()}
          className="w-full bg-violet-600 hover:bg-violet-500 disabled:opacity-40 text-white font-medium rounded-lg py-2.5 transition-colors text-sm"
        >
          📄 Analisar Linhas
        </button>
      </div>
    );
  }

  const activeRows = rows.filter(r => !r.skip).length;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <span className="text-zinc-400 text-sm">{rows.length} linha(s) encontradas • {activeRows} selecionadas</span>
        <button onClick={() => { setParsed(false); setRows([]); }} className="text-xs text-zinc-500 hover:text-zinc-300">
          ← Voltar
        </button>
      </div>

      <div className="flex flex-col gap-2 max-h-96 overflow-y-auto pr-1">
        {rows.map((row, i) => {
          const sc = SOURCE_COLORS[row.source];
          const tagCls = row.subTag ? (SUBTAG_COLORS[row.subTag] ?? '') : '';
          return (
            <div key={i} className={`rounded-xl border p-3 flex flex-col gap-2 transition-opacity ${row.skip ? 'opacity-30 border-zinc-800' : 'border-zinc-700'}`}>
              {/* Linha + toggle skip */}
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 overflow-hidden min-w-0">
                  <span className="text-zinc-500 mono text-xs flex-shrink-0">{row.line.date.slice(5)}</span>
                  <span className="text-zinc-200 text-sm truncate">{row.line.description}</span>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className="mono text-red-300 text-sm font-medium">{brl(row.line.amount)}</span>
                  <button
                    onClick={() => updateRow(i, { skip: !row.skip })}
                    className={`text-xs px-2 py-0.5 rounded border transition-colors ${row.skip ? 'border-zinc-700 text-zinc-600' : 'border-zinc-600 text-zinc-400 hover:border-red-700 hover:text-red-400'}`}
                  >{row.skip ? '+ incluir' : '✕ pular'}</button>
                </div>
              </div>

              {!row.skip && (
                <>
                  {/* Fonte */}
                  <div className="flex gap-1.5">
                    {(['NubankUltra', 'AmazonCard', 'Piques', 'BoletoOutros'] as ExpenseSource[]).map(src => {
                      const scc = SOURCE_COLORS[src];
                      const active = row.source === src;
                      const shortLabels: Record<string, string> = { NubankUltra: 'Ultra', AmazonCard: 'Amazon', Piques: 'Pix', BoletoOutros: 'Boleto' };
                      return (
                        <button key={src} onClick={() => updateRow(i, { source: src, subtractFromUltra: row.ownerId !== 'eu' && src === 'NubankUltra' })}
                          className={`px-2 py-0.5 rounded text-xs border transition-colors ${active ? `${scc.bg} ${scc.text} ${scc.border}` : 'bg-zinc-800 text-zinc-600 border-zinc-700'}`}
                        >{shortLabels[src]}</button>
                      );
                    })}
                  </div>

                  {/* Pessoa + Tag */}
                  <div className="flex items-center gap-2 flex-wrap">
                    {PEOPLE.map(p => {
                      const active = row.ownerId === p.id;
                      return (
                        <button key={p.id} onClick={() => selectPersonForRow(i, p.id, p.tag)}
                          className={`px-2 py-0.5 rounded text-xs border transition-colors flex items-center gap-1 ${active ? 'bg-emerald-900/50 border-emerald-700 text-emerald-300' : 'bg-zinc-800 border-zinc-700 text-zinc-500'}`}
                        >
                          {p.label}
                          {p.tag && <span className={`mono font-bold ${tagCls}`}>[{p.tag}]</span>}
                        </button>
                      );
                    })}
                    <input
                      value={row.tag}
                      onChange={e => updateRow(i, { tag: e.target.value })}
                      placeholder="#tag"
                      className="bg-zinc-800 border border-zinc-700 rounded px-2 py-0.5 text-zinc-300 placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-violet-500 text-xs mono w-24"
                    />
                    {row.ownerId !== 'eu' && row.source === 'NubankUltra' && (
                      <button
                        onClick={() => updateRow(i, { subtractFromUltra: !row.subtractFromUltra })}
                        className={`px-2 py-0.5 rounded text-xs border transition-colors ${row.subtractFromUltra ? 'bg-violet-900/50 border-violet-700 text-violet-300' : 'bg-zinc-800 border-zinc-700 text-zinc-600'}`}
                      >▼ abater</button>
                    )}
                  </div>
                </>
              )}
            </div>
          );
        })}
      </div>

      <button onClick={handleSave} disabled={saving || activeRows === 0}
        className="w-full bg-violet-600 hover:bg-violet-500 disabled:opacity-40 text-white font-medium rounded-lg py-2.5 transition-colors text-sm"
      >{saving ? 'Salvando…' : `📄 Salvar ${activeRows} lançamento(s)`}</button>
    </div>
  );
}
