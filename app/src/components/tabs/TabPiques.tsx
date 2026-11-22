import { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, BarChart, Bar, XAxis, YAxis } from 'recharts';
import type { CycleDetailDto } from '../../types/api';
import { brl, CHART_COLORS, CATEGORY_COLORS, extractTagPrefix, TAG_PREFIXES } from '../../lib/fmt';
import { tooltipStyle, tooltipLabelStyle, tooltipItemStyle, fmtBrl } from './chartUtils';
import { api } from '../../api/client';

interface Props { detail: CycleDetailDto; onUpdated: () => void }

export function TabPiques({ detail, onUpdated }: Props) {
  const { cycle } = detail;
  const [deleting, setDeleting] = useState<number | null>(null);

  const entries = useMemo(() =>
    cycle.expenseEntries.filter(e => e.source === 'Piques' && !e.informationalOnly),
  [cycle.expenseEntries]);

  const total = entries.reduce((s, e) => s + e.amount, 0);

  const byTag = useMemo(() => {
    const map: Record<string, number> = {};
    for (const e of entries) {
      const prefix = extractTagPrefix(e.description);
      const tag = prefix ? TAG_PREFIXES[prefix]!.label : (e.tag ?? 'Outros');
      map[tag] = (map[tag] ?? 0) + e.amount;
    }
    return Object.entries(map).map(([tag, val]) => ({
      name: tag,
      value: val,
      color: (() => {
        for (const [, cfg] of Object.entries(TAG_PREFIXES)) {
          if (cfg.label === tag) return cfg.color;
        }
        return CATEGORY_COLORS[tag] ?? CHART_COLORS.piques;
      })(),
    })).sort((a, b) => b.value - a.value);
  }, [entries]);

  async function handleDelete(id: number) {
    if (!confirm('Remover este lançamento?')) return;
    setDeleting(id);
    try { await api.deleteEntry(cycle.id, id); onUpdated(); }
    finally { setDeleting(null); }
  }

  return (
    <div className="flex flex-col gap-5">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="card p-6 flex items-center justify-between">
        <div>
          <p className="text-xs text-slate-500 uppercase tracking-wider font-medium">Dinheiro / Piques</p>
          <p className="mono text-3xl font-bold text-amber-600 mt-1">{brl(total)}</p>
          <p className="text-xs text-slate-400 mt-1">{entries.length} lançamento(s)</p>
        </div>
        <div className="text-5xl opacity-20">💵</div>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.1 }} className="card p-5">
          <span className="text-xs text-slate-500 uppercase tracking-wider font-medium mb-4 block">Por Categoria</span>
          <div className="flex items-center gap-4">
            <div style={{ width: 120, height: 120, flexShrink: 0 }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={byTag} dataKey="value" innerRadius={35} outerRadius={55} paddingAngle={3} stroke="none">
                    {byTag.map((d, i) => <Cell key={i} fill={d.color} />)}
                  </Pie>
                  <Tooltip formatter={fmtBrl} contentStyle={tooltipStyle} labelStyle={tooltipLabelStyle} itemStyle={tooltipItemStyle} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex flex-col gap-2 flex-1">
              {byTag.map((d, i) => (
                <div key={i} className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full" style={{ background: d.color }} />
                    <span className="text-xs text-slate-500">{d.name}</span>
                  </div>
                  <span className="mono text-xs text-slate-700">{brl(d.value)}</span>
                </div>
              ))}
            </div>
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.15 }} className="card p-5">
          <span className="text-xs text-slate-500 uppercase tracking-wider font-medium mb-4 block">Barras por Categoria</span>
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={byTag} margin={{ left: 0, right: 60, top: 4, bottom: 0 }} layout="vertical">
              <XAxis type="number" tickFormatter={(v: number) => `R$${v}`} tick={{ fill: '#94A3B8', fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis type="category" dataKey="name" width={80} tick={{ fill: '#64748B', fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip formatter={fmtBrl} contentStyle={tooltipStyle} labelStyle={tooltipLabelStyle} itemStyle={tooltipItemStyle} />
              <Bar dataKey="value" radius={[0, 4, 4, 0]} maxBarSize={18}>
                {byTag.map((d, i) => <Cell key={i} fill={d.color} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </motion.div>
      </div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="card overflow-hidden">
        <div className="px-5 py-3 border-b border-slate-100">
          <span className="text-xs text-slate-500 uppercase tracking-wider font-medium">Lançamentos</span>
        </div>
        <div className="divide-y divide-slate-100">
          <AnimatePresence>
            {entries.sort((a, b) => a.date.localeCompare(b.date)).map(e => {
              const prefix = extractTagPrefix(e.description);
              const color = prefix ? TAG_PREFIXES[prefix]!.color : (CATEGORY_COLORS[e.tag] ?? CHART_COLORS.piques);
              return (
                <motion.div key={e.id} initial={{ opacity: 1 }} exit={{ opacity: 0, height: 0 }}
                  className="flex items-center justify-between px-5 py-2.5 hover:bg-slate-50 transition-colors group"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: color }} />
                    <div className="min-w-0">
                      <p className="text-sm text-slate-800 truncate">
                        {prefix && <span className="text-xs font-bold mr-1" style={{ color }}>{prefix}</span>}
                        {prefix ? e.description.slice(prefix.length).trim() : e.description}
                      </p>
                      <p className="text-xs text-slate-400">{e.date} · {e.tag}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0 ml-3">
                    <span className="mono text-sm text-amber-600 font-medium">{brl(e.amount)}</span>
                    <button onClick={() => { void handleDelete(e.id); }} disabled={deleting === e.id}
                      className="opacity-0 group-hover:opacity-100 text-slate-300 hover:text-red-500 text-xs px-1 transition-all"
                    >{deleting === e.id ? '…' : '✕'}</button>
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
