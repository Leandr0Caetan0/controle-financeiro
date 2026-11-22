import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, BarChart, Bar, XAxis, YAxis } from 'recharts';
import type { ExpenseEntry } from '../../types/api';
import { brl, CHART_COLORS } from '../../lib/fmt';
import { tooltipStyle, tooltipLabelStyle, tooltipItemStyle, fmtBrl } from './chartUtils';

interface Props { entries: ExpenseEntry[] }

const PERSON_CFG: Record<string, { label: string; color: string; emoji: string }> = {
  xus:     { label: 'Xus',          color: '#7C3AED', emoji: '👩' },
  jaum:    { label: 'Jaum',         color: '#0891B2', emoji: '👨' },
  sogra:   { label: 'Sogra/Claudia',color: '#D97706', emoji: '👩‍🦳' },
  tia:     { label: 'Tia/Gui',      color: '#059669', emoji: '👩‍🦱' },
  geovane: { label: 'Geovane',      color: '#DB2777', emoji: '👦' },
  elvis:   { label: 'Elvis',        color: '#8B5CF6', emoji: '🎸' },
  julio:   { label: 'Júlio',        color: '#10B981', emoji: '🧔' },
  julia:   { label: 'Julia (U)',    color: '#2563EB', emoji: '👧' },
};

export function TabValoresReceber({ entries }: Props) {
  const thirdPartyEntries = useMemo(() =>
    entries.filter(e => e.subtractFromUltra && !e.informationalOnly && e.ownerId),
  [entries]);

  const infoEntries = useMemo(() =>
    entries.filter(e => e.informationalOnly && e.ownerId),
  [entries]);

  const byPerson = useMemo(() => {
    const map: Record<string, { items: ExpenseEntry[]; total: number }> = {};
    for (const e of thirdPartyEntries) {
      if (!e.ownerId) continue;
      if (!map[e.ownerId]) map[e.ownerId] = { items: [], total: 0 };
      map[e.ownerId].items.push(e);
      map[e.ownerId].total += e.amount;
    }
    return Object.entries(map).sort(([, a], [, b]) => b.total - a.total);
  }, [thirdPartyEntries]);

  const grandTotal = byPerson.reduce((s, [, v]) => s + v.total, 0);

  const chartData = byPerson.map(([id, v]) => ({
    name: PERSON_CFG[id]?.label ?? id,
    value: v.total,
    color: PERSON_CFG[id]?.color ?? CHART_COLORS.slate,
  }));

  return (
    <div className="flex flex-col gap-5">
      {/* KPI */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="card p-6 flex items-center justify-between">
        <div>
          <p className="text-xs text-slate-500 uppercase tracking-wider font-medium">Total a Receber</p>
          <p className="mono text-3xl font-bold text-emerald-600 mt-1">{brl(grandTotal)}</p>
          <p className="text-xs text-slate-400 mt-1">{byPerson.length} pessoa(s) com lançamentos</p>
        </div>
        <div className="text-5xl opacity-20">🤝</div>
      </motion.div>

      {/* Gráficos */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.1 }} className="card p-5 flex flex-col gap-4">
          <span className="text-xs text-slate-500 uppercase tracking-wider font-medium">Distribuição por Pessoa</span>
          <div className="flex items-center gap-4">
            <div style={{ width: 130, height: 130, flexShrink: 0 }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={chartData} dataKey="value" innerRadius={38} outerRadius={60} paddingAngle={4} stroke="none">
                    {chartData.map((d, i) => <Cell key={i} fill={d.color} />)}
                  </Pie>
                  <Tooltip formatter={fmtBrl} contentStyle={tooltipStyle} labelStyle={tooltipLabelStyle} itemStyle={tooltipItemStyle} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex flex-col gap-2 flex-1">
              {chartData.map((d, i) => (
                <div key={i} className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full" style={{ background: d.color }} />
                    <span className="text-xs text-slate-600">{d.name}</span>
                  </div>
                  <span className="mono text-xs text-slate-800 font-medium">{brl(d.value)}</span>
                </div>
              ))}
            </div>
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.15 }} className="card p-5 flex flex-col gap-4">
          <span className="text-xs text-slate-500 uppercase tracking-wider font-medium">Valor por Pessoa</span>
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={chartData} margin={{ left: 0, right: 10, top: 4, bottom: 0 }}>
              <XAxis dataKey="name" tick={{ fill: '#94A3B8', fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis tickFormatter={(v: number) => `R$${(v / 1000).toFixed(1)}k`} tick={{ fill: '#94A3B8', fontSize: 10 }} axisLine={false} tickLine={false} width={52} />
              <Tooltip formatter={fmtBrl} contentStyle={tooltipStyle} labelStyle={tooltipLabelStyle} itemStyle={tooltipItemStyle} />
              <Bar dataKey="value" radius={[4, 4, 0, 0]} maxBarSize={40}>
                {chartData.map((d, i) => <Cell key={i} fill={d.color} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </motion.div>
      </div>

      {/* Listas por pessoa */}
      {byPerson.map(([personId, data], idx) => {
        const cfg = PERSON_CFG[personId] ?? { label: personId, color: CHART_COLORS.slate, emoji: '👤' };
        return (
          <motion.div key={personId} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 + idx * 0.05 }} className="card overflow-hidden">
            <div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-lg">{cfg.emoji}</span>
                <span className="font-semibold text-slate-800">{cfg.label}</span>
              </div>
              <span className="mono text-sm font-bold text-emerald-600">{brl(data.total)}</span>
            </div>
            <div className="divide-y divide-slate-100">
              {data.items.map(e => (
                <div key={e.id} className="flex items-center justify-between px-5 py-2.5 hover:bg-slate-50 transition-colors">
                  <div>
                    <p className="text-sm text-slate-700">{e.description}</p>
                    <p className="text-xs text-slate-400">{e.tag} · {e.date}</p>
                  </div>
                  <span className="mono text-sm text-emerald-600 font-medium">{brl(e.amount)}</span>
                </div>
              ))}
            </div>
          </motion.div>
        );
      })}

      {/* Informativos */}
      {infoEntries.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="card overflow-hidden opacity-60">
          <div className="px-5 py-3 border-b border-slate-100">
            <span className="text-xs text-slate-500 uppercase tracking-wider font-medium">ℹ Apenas Informativos</span>
          </div>
          <div className="divide-y divide-slate-100">
            {infoEntries.map(e => {
              const cfg = PERSON_CFG[e.ownerId ?? ''] ?? { label: e.ownerId, color: CHART_COLORS.slate };
              return (
                <div key={e.id} className="flex items-center justify-between px-5 py-2.5">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full" style={{ background: cfg.color }} />
                    <div>
                      <p className="text-sm text-slate-600">{e.description}</p>
                      <p className="text-xs text-slate-400">{cfg.label} · {e.tag}</p>
                    </div>
                  </div>
                  <span className="mono text-sm text-slate-500">{brl(e.amount)}</span>
                </div>
              );
            })}
          </div>
        </motion.div>
      )}
    </div>
  );
}
