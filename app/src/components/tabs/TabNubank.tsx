import { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
} from 'recharts';
import type { ExpenseEntry, CycleDetailDto } from '../../types/api';
import { brl, CHART_COLORS, CATEGORY_COLORS, TAG_PREFIXES, extractTagPrefix } from '../../lib/fmt';
import { tooltipStyle, tooltipLabelStyle, tooltipItemStyle, fmtBrl } from './chartUtils';
import { api } from '../../api/client';

interface Props { detail: CycleDetailDto; onUpdated: () => void }

function getEffectiveTag(e: ExpenseEntry): string {
  const prefix = extractTagPrefix(e.description);
  if (prefix) return TAG_PREFIXES[prefix]!.label;
  return e.tag ?? 'Outros';
}

function getTagColor(tag: string): string {
  for (const [, cfg] of Object.entries(TAG_PREFIXES)) {
    if (cfg.label === tag) return cfg.color;
  }
  return CATEGORY_COLORS[tag] ?? CHART_COLORS.slate;
}

const PencilIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
  </svg>
);

export function TabNubank({ detail, onUpdated }: Props) {
  const { cycle, reconciliation } = detail;
  const [deleting, setDeleting] = useState<number | null>(null);
  const [editingFatura, setEditingFatura] = useState(false);
  const [faturaInput, setFaturaInput] = useState('');
  const [savingFatura, setSavingFatura] = useState(false);

  const meusGastos = useMemo(() =>
    cycle.expenseEntries.filter(e =>
      e.source === 'NubankUltra' && !e.subtractFromUltra && !e.informationalOnly
    ), [cycle.expenseEntries]);

  const byTag = useMemo(() => {
    const map: Record<string, number> = {};
    for (const e of meusGastos) {
      const tag = getEffectiveTag(e);
      map[tag] = (map[tag] ?? 0) + e.amount;
    }
    return Object.entries(map)
      .map(([tag, val]) => ({ name: tag, value: val, color: getTagColor(tag) }))
      .sort((a, b) => b.value - a.value);
  }, [meusGastos]);

  const total = meusGastos.reduce((s, e) => s + e.amount, 0);

  async function handleDelete(id: number) {
    if (!confirm('Remover este lançamento?')) return;
    setDeleting(id);
    try { await api.deleteEntry(cycle.id, id); onUpdated(); }
    finally { setDeleting(null); }
  }

  function startEditFatura() {
    setFaturaInput(cycle.ultraInvoiceTotal.toFixed(2).replace('.', ','));
    setEditingFatura(true);
  }

  async function saveFatura() {
    const v = parseFloat(faturaInput.replace(',', '.'));
    if (isNaN(v)) { setEditingFatura(false); return; }
    setSavingFatura(true);
    try {
      await api.updateCycle(cycle.id, { ultraInvoiceTotal: v, emergencyReserveTarget: cycle.emergencyReserveTarget });
      onUpdated();
    } finally { setSavingFatura(false); setEditingFatura(false); }
  }

  return (
    <div className="flex flex-col gap-5">
      {/* KPI Nubank */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Fatura Total — editável */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0 }} className="card p-4">
          <p className="text-xs text-slate-500 uppercase tracking-wider font-medium mb-1">Fatura Total</p>
          {editingFatura ? (
            <div className="flex items-center gap-1">
              <input autoFocus value={faturaInput} onChange={e => setFaturaInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') { void saveFatura(); } if (e.key === 'Escape') setEditingFatura(false); }}
                className="mono bg-violet-50 border border-violet-400 rounded px-2 py-0.5 text-violet-800 w-28 text-sm focus:outline-none focus:ring-1 focus:ring-violet-400"
              />
              <button onClick={() => { void saveFatura(); }} disabled={savingFatura} className="text-emerald-600 text-sm px-1">{savingFatura ? '…' : '✓'}</button>
              <button onClick={() => setEditingFatura(false)} className="text-slate-400 text-sm px-1">✕</button>
            </div>
          ) : (
            <button onClick={startEditFatura} className="mono text-2xl font-bold text-violet-700 hover:text-violet-600 group flex items-center gap-2">
              {brl(cycle.ultraInvoiceTotal)}
              <span className="text-slate-400 group-hover:text-violet-500 transition-colors" title="Editar fatura">
                <PencilIcon />
              </span>
            </button>
          )}
          <p className="text-xs text-slate-400 mt-1">vence dia 02 · clique p/ editar</p>
        </motion.div>

        {/* Meus Gastos */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="card p-4">
          <p className="text-xs text-slate-500 uppercase tracking-wider font-medium mb-1">Meus Gastos</p>
          <p className="mono text-2xl font-bold text-violet-700">{brl(total)}</p>
          <p className="text-xs text-slate-400 mt-1">{meusGastos.length} lançamentos</p>
        </motion.div>

        {/* Terceiros */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="card p-4">
          <p className="text-xs text-slate-500 uppercase tracking-wider font-medium mb-1">Terceiros</p>
          <p className="mono text-2xl font-bold text-blue-600">{brl(reconciliation.totalTerceiros)}</p>
          <p className="text-xs text-slate-400 mt-1">a receber</p>
        </motion.div>

        {/* Assinaturas (substitui Prova Real) */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="card p-4">
          <p className="text-xs text-slate-500 uppercase tracking-wider font-medium mb-1">Assinaturas</p>
          <p className="mono text-2xl font-bold text-orange-600">{brl(reconciliation.totalAssinaturas)}</p>
          <p className="text-xs text-slate-400 mt-1">valor cheio na fatura</p>
        </motion.div>
      </div>

      {/* Gráficos */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.2 }} className="card p-5">
          <span className="text-xs text-slate-500 uppercase tracking-wider font-medium mb-4 block">Gastos por Categoria</span>
          <div className="flex items-center gap-4">
            <div style={{ width: 130, height: 130, flexShrink: 0 }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={byTag} dataKey="value" innerRadius={38} outerRadius={60} paddingAngle={3} stroke="none">
                    {byTag.map((d, i) => <Cell key={i} fill={d.color} />)}
                  </Pie>
                  <Tooltip formatter={fmtBrl} contentStyle={tooltipStyle} labelStyle={tooltipLabelStyle} itemStyle={tooltipItemStyle} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex flex-col gap-1.5 flex-1 overflow-hidden">
              {byTag.slice(0, 8).map((d, i) => (
                <div key={i} className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: d.color }} />
                    <span className="text-xs text-slate-500 truncate">{d.name}</span>
                  </div>
                  <span className="mono text-xs text-slate-700 flex-shrink-0">{brl(d.value)}</span>
                </div>
              ))}
            </div>
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.25 }} className="card p-5">
          <span className="text-xs text-slate-500 uppercase tracking-wider font-medium mb-4 block">Top Categorias (valor)</span>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={byTag.slice(0, 8)} layout="vertical" margin={{ left: 0, right: 60, top: 0, bottom: 0 }}>
              <CartesianGrid horizontal={false} stroke="rgba(0,0,0,0.04)" />
              <XAxis type="number" tickFormatter={(v: number) => `R$${(v / 1000).toFixed(1)}k`} tick={{ fill: '#94A3B8', fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis type="category" dataKey="name" width={80} tick={{ fill: '#64748B', fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip formatter={fmtBrl} contentStyle={tooltipStyle} labelStyle={tooltipLabelStyle} itemStyle={tooltipItemStyle} />
              <Bar dataKey="value" radius={[0, 4, 4, 0]} maxBarSize={18}>
                {byTag.slice(0, 8).map((d, i) => <Cell key={i} fill={d.color} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </motion.div>
      </div>

      {/* Lista de lançamentos */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="card overflow-hidden">
        <div className="px-5 py-3 border-b border-slate-100">
          <span className="text-xs text-slate-500 uppercase tracking-wider font-medium">
            Lançamentos ({meusGastos.length}) · {brl(total)}
          </span>
        </div>
        <div className="divide-y divide-slate-100 max-h-[480px] overflow-y-auto">
          <AnimatePresence>
            {meusGastos.sort((a, b) => b.date.localeCompare(a.date)).map(e => {
              const prefix = extractTagPrefix(e.description);
              const tagColor = getTagColor(getEffectiveTag(e));
              return (
                <motion.div key={e.id} initial={{ opacity: 1 }} exit={{ opacity: 0, height: 0 }}
                  className="flex items-center justify-between px-5 py-2.5 hover:bg-slate-50 transition-colors group"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: tagColor }} />
                    <div className="min-w-0">
                      <p className="text-sm text-slate-800 truncate">
                        {prefix && <span className="text-xs font-bold mr-1" style={{ color: tagColor }}>{prefix}</span>}
                        {prefix ? e.description.slice(prefix.length).trim() : e.description}
                      </p>
                      <p className="text-xs text-slate-400">{e.date} · {e.tag}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0 ml-3">
                    <span className="mono text-sm text-slate-800 font-medium">{brl(e.amount)}</span>
                    <button onClick={() => { void handleDelete(e.id); }} disabled={deleting === e.id}
                      className="opacity-0 group-hover:opacity-100 text-slate-300 hover:text-red-500 transition-all p-1 rounded"
                      title="Remover lançamento"
                    >
                      {deleting === e.id ? '…' : (
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
                        </svg>
                      )}
                    </button>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
}
