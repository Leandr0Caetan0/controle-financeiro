import { useState } from 'react';
import type { ExpenseEntry } from '../types/api';
import { brl, SOURCE_COLORS, SOURCE_LABELS, SUBTAG_COLORS } from '../lib/fmt';
import { api } from '../api/client';

interface Props {
  cycleId: string;
  entries: ExpenseEntry[];
  onUpdated: () => void;
}

export function ExpenseList({ cycleId, entries, onUpdated }: Props) {
  const [deleting, setDeleting] = useState<number | null>(null);

  async function handleDelete(id: number) {
    if (!confirm('Remover este lançamento?')) return;
    setDeleting(id);
    try {
      await api.deleteEntry(cycleId, id);
      onUpdated();
    } finally {
      setDeleting(null);
    }
  }

  const normal = entries.filter(e => !e.informationalOnly);
  const info = entries.filter(e => e.informationalOnly);

  const groups: Record<string, ExpenseEntry[]> = {};
  for (const e of normal) {
    if (!groups[e.source]) groups[e.source] = [];
    groups[e.source].push(e);
  }
  const sourceOrder = ['NubankUltra', 'AmazonCard', 'Piques', 'BoletoOutros'];

  return (
    <div className="rounded-xl border border-zinc-700 bg-zinc-900/40 p-4 flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <span className="font-semibold text-zinc-200 text-xs uppercase tracking-wider">
          Lançamentos ({normal.length})
        </span>
        {info.length > 0 && (
          <span className="text-zinc-500 text-xs">{info.length} informativo(s)</span>
        )}
      </div>

      {sourceOrder
        .filter(src => (groups[src]?.length ?? 0) > 0)
        .map(src => {
          const sc = SOURCE_COLORS[src] ?? SOURCE_COLORS['BoletoOutros'];
          const srcEntries = groups[src];
          const srcTotal = srcEntries.reduce((s, e) => s + e.amount, 0);
          return (
            <div key={src}>
              <div className={`flex items-center justify-between px-3 py-1.5 rounded-t-lg ${sc.bg} border ${sc.border} border-b-0`}>
                <div className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${sc.dot}`} />
                  <span className={`text-xs font-semibold uppercase tracking-wide ${sc.text}`}>
                    {SOURCE_LABELS[src] ?? src}
                  </span>
                </div>
                <span className={`mono text-sm font-semibold ${sc.text}`}>{brl(srcTotal)}</span>
              </div>
              <div className={`border ${sc.border} border-t-0 rounded-b-lg divide-y divide-zinc-800/50 overflow-hidden`}>
                {srcEntries.map(entry => (
                  <EntryRow
                    key={entry.id}
                    entry={entry}
                    onDelete={() => handleDelete(entry.id)}
                    isDeleting={deleting === entry.id}
                  />
                ))}
              </div>
            </div>
          );
        })}

      {info.length > 0 && (
        <div>
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-t-lg bg-zinc-800/40 border border-zinc-700 border-b-0">
            <span className="text-zinc-500 text-xs font-semibold uppercase tracking-wide">ℹ Apenas Informativos</span>
          </div>
          <div className="border border-zinc-700 border-t-0 rounded-b-lg divide-y divide-zinc-800/50 overflow-hidden">
            {info.map(entry => (
              <EntryRow
                key={entry.id}
                entry={entry}
                onDelete={() => handleDelete(entry.id)}
                isDeleting={deleting === entry.id}
                dimmed
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function EntryRow({
  entry: e,
  onDelete,
  isDeleting,
  dimmed,
}: {
  entry: ExpenseEntry;
  onDelete: () => void;
  isDeleting: boolean;
  dimmed?: boolean;
}) {
  const sc = SOURCE_COLORS[e.source] ?? SOURCE_COLORS['BoletoOutros'];
  const amountCls = e.amount < 0
    ? 'text-green-400'
    : e.amount === 0 ? 'text-zinc-500' : 'text-red-300';

  return (
    <div className={`flex items-center justify-between px-3 py-2 bg-zinc-900/60 hover:bg-zinc-800/50 transition-colors group ${dimmed ? 'opacity-60' : ''}`}>
      <div className="flex items-center gap-2 overflow-hidden min-w-0">
        {/* SubTag badge */}
        {e.subTag && (
          <span className={`text-xs font-bold mono flex-shrink-0 ${SUBTAG_COLORS[e.subTag] ?? 'text-zinc-400'}`}>
            [{e.subTag}]
          </span>
        )}

        <div className="overflow-hidden">
          <div className="flex items-center gap-1.5">
            <span className={`text-sm truncate ${e.criticalAlert ? 'text-red-300 font-medium' : 'text-zinc-200'}`}>
              {e.criticalAlert && '⚠️ '}
              {e.description}
            </span>
            {e.installmentCurrent != null && e.installmentTotal != null && (
              <span className="text-zinc-600 text-xs flex-shrink-0">
                {e.installmentCurrent}/{e.installmentTotal}
              </span>
            )}
            {e.subtractFromUltra && (
              <span className="text-violet-500 text-xs flex-shrink-0">▼Ultra</span>
            )}
          </div>
          <div className="flex items-center gap-2 text-xs text-zinc-600">
            <span className={sc.text}>{SOURCE_LABELS[e.source] ?? e.source}</span>
            {e.owner && <span className="text-zinc-500">{e.owner.name}</span>}
            {e.tag && <span className="text-zinc-700">{e.tag}</span>}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 flex-shrink-0 ml-2">
        <span className={`mono text-sm font-medium ${amountCls}`}>
          {e.amount > 0 ? '-' : ''}{brl(Math.abs(e.amount))}
        </span>
        <button
          onClick={onDelete}
          disabled={isDeleting}
          className="opacity-0 group-hover:opacity-100 text-zinc-600 hover:text-red-400 text-xs px-1 transition-all disabled:opacity-50"
          title="Remover"
        >
          {isDeleting ? '…' : '✕'}
        </button>
      </div>
    </div>
  );
}
