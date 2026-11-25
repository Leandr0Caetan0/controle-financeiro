import { useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis,
} from 'recharts';
import type { ExpenseEntry } from '../../types/api';
import { brl, CHART_COLORS, CATEGORY_COLORS } from '../../lib/fmt';
import { tooltipStyle, tooltipLabelStyle, tooltipItemStyle, fmtBrl } from './chartUtils';

interface Props { entries: ExpenseEntry[] }

// Cores por sub-pessoa da Xus
const XUS_SUB_COLORS: Record<string, string> = {
  proprio: '#7C3AED',  // dela própria
  julio:   '#10B981',  // Julio
  claudia: '#F59E0B',  // Claudia
  biel:    '#3B82F6',  // Biel
  outros:  '#94A3B8',
};

// Detecta por quem foi o gasto da Xus (baseado na descrição)
function getXusSubPerson(e: ExpenseEntry): string {
  const d = e.description.toLowerCase();
  if (d.includes('[j]') || d.includes('julio')) return 'julio';
  if (d.includes('claudia') || d.includes('[c]')) return 'claudia';
  if (d.includes('biel')) return 'biel';
  return 'proprio';
}

export function TabXus({ entries }: Props) {
  // Lançamentos normais da Xus (valor real que ela deve)
  const xusEntries = useMemo(() =>
    entries.filter(e => e.ownerId === 'xus' && !e.informationalOnly),
  [entries]);

  // Informativos onde Julio paga via Xus → aparece separado mas conta no total do Julio
  const julioViaXus = useMemo(() =>
    entries.filter(e =>
      e.ownerId === 'xus' &&
      e.informationalOnly &&
      e.description.includes('[J]')
    ),
  [entries]);

  // Outros informativos (Netflix Xus = dela, não conta no total a receber)
  const xusInfoPuro = useMemo(() =>
    entries.filter(e =>
      e.ownerId === 'xus' &&
      e.informationalOnly &&
      !e.description.includes('[J]')
    ),
  [entries]);

  const totalNetflixXus = xusInfoPuro.reduce((s, e) => s + e.amount, 0);
  const totalXus = xusEntries.reduce((s, e) => s + e.amount, 0) + totalNetflixXus;
  const totalJulioViaXus = julioViaXus.reduce((s, e) => s + e.amount, 0);
  const totalGeral = totalXus + totalJulioViaXus;

  // Por sub-pessoa (inclui informativos puros como "proprio")
  const bySubPerson = useMemo(() => {
    const map: Record<string, { items: ExpenseEntry[]; total: number }> = {};
    // Lançamentos reais
    for (const e of xusEntries) {
      const sp = getXusSubPerson(e);
      if (!map[sp]) map[sp] = { items: [], total: 0 };
      map[sp].items.push(e);
      map[sp].total += e.amount;
    }
    // Netflix etc. → considera como gasto da própria Letícia
    for (const e of xusInfoPuro) {
      if (!map['proprio']) map['proprio'] = { items: [], total: 0 };
      map['proprio'].items.push(e);
      map['proprio'].total += e.amount;
    }
    return Object.entries(map).sort(([, a], [, b]) => b.total - a.total);
  }, [xusEntries, xusInfoPuro]);

  // Por categoria/tag
  const byTag = useMemo(() => {
    const map: Record<string, number> = {};
    for (const e of xusEntries) {
      map[e.tag] = (map[e.tag] ?? 0) + e.amount;
    }
    return Object.entries(map)
      .map(([tag, val]) => ({ name: tag, value: val, color: CATEGORY_COLORS[tag] ?? CHART_COLORS.slate }))
      .sort((a, b) => b.value - a.value);
  }, [xusEntries]);

  const subPersonData = [
    // Julio via Xus também aparece no donut
    ...(totalJulioViaXus > 0 ? [{ name: 'Julio (via Xus)', value: totalJulioViaXus, color: XUS_SUB_COLORS.julio }] : []),
    ...bySubPerson.map(([sp, v]) => ({
      name: sp === 'proprio' ? 'Dela própria' : sp === 'julio' ? 'Julio' : sp === 'claudia' ? 'Claudia' : sp === 'biel' ? 'Biel' : sp,
      value: v.total,
      color: XUS_SUB_COLORS[sp] ?? CHART_COLORS.slate,
    })),
  ];
  return (
    <div className="flex flex-col gap-5">
      {/* KPI */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0 }} className="card p-5">
          <p className="text-xs text-slate-500 uppercase tracking-wider font-medium mb-1">Total a Receber (Xus)</p>
          <p className="mono text-2xl font-bold text-violet-700">{brl(totalGeral)}</p>
          <p className="text-xs text-slate-400 mt-1">inclui Julio via Xus</p>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="card p-5">
          <p className="text-xs text-slate-500 uppercase tracking-wider font-medium mb-1">Apenas Letícia</p>
          <p className="mono text-2xl font-bold text-violet-700">
            {brl(bySubPerson.find(([sp]) => sp === 'proprio')?.[1].total ?? totalXus)}
          </p>
          <p className="text-xs text-slate-400 mt-1">gastos próprios + Netflix</p>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="card p-5">
          <p className="text-xs text-slate-500 uppercase tracking-wider font-medium mb-1">Julio (via Xus)</p>
          <p className="mono text-2xl font-bold" style={{ color: XUS_SUB_COLORS.julio }}>{brl(totalJulioViaXus)}</p>
          <p className="text-xs text-slate-400 mt-1">Disney+ e outros [J]</p>
        </motion.div>
      </div>

      {/* Gráficos */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Donut por sub-pessoa */}
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.15 }} className="card p-5">
          <span className="text-xs text-slate-500 uppercase tracking-wider font-medium mb-4 block">Por Pessoa</span>
          <div className="flex items-center gap-4">
            <div style={{ width: 130, height: 130, flexShrink: 0 }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={subPersonData} dataKey="value" innerRadius={38} outerRadius={60} paddingAngle={4} stroke="none">
                    {subPersonData.map((d, i) => <Cell key={i} fill={d.color} />)}
                  </Pie>
                  <Tooltip formatter={fmtBrl} contentStyle={tooltipStyle} labelStyle={tooltipLabelStyle} itemStyle={tooltipItemStyle} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex flex-col gap-2 flex-1">
              {subPersonData.map((d, i) => (
                <div key={i} className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ background: d.color }} />
                    <span className="text-sm text-slate-700">{d.name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="mono text-sm text-slate-800">{brl(d.value)}</span>
                    <span className="text-xs text-slate-400">
                      {totalXus > 0 ? Math.round((d.value / totalXus) * 100) : 0}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </motion.div>

        {/* Barras por categoria */}
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.2 }} className="card p-5">
          <span className="text-xs text-slate-500 uppercase tracking-wider font-medium mb-4 block">Por Categoria</span>
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={byTag.slice(0, 6)} margin={{ left: 0, right: 60, top: 4, bottom: 0 }} layout="vertical">
              <XAxis type="number" tickFormatter={(v: number) => `R$${v}`} tick={{ fill: '#94A3B8', fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis type="category" dataKey="name" width={80} tick={{ fill: '#64748B', fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip formatter={fmtBrl} contentStyle={tooltipStyle} labelStyle={tooltipLabelStyle} itemStyle={tooltipItemStyle} />
              <Bar dataKey="value" radius={[0, 4, 4, 0]} maxBarSize={18}>
                {byTag.slice(0, 6).map((d, i) => <Cell key={i} fill={d.color} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </motion.div>
      </div>

      {/* Listas por sub-pessoa */}
      {bySubPerson.map(([sp, data], idx) => {
        const label = sp === 'proprio' ? '👩 Letícia (dela própria)' : sp === 'julio' ? '🧔 Julio' : sp === 'claudia' ? '👩‍🦳 Claudia' : sp === 'biel' ? '👦 Biel' : sp;
        const color = XUS_SUB_COLORS[sp] ?? CHART_COLORS.slate;
        return (
          <motion.div key={sp} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 + idx * 0.05 }} className="card overflow-hidden">
            <div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between">
              <span className="font-semibold text-slate-800">{label}</span>
              <span className="mono text-sm font-bold text-emerald-600">{brl(data.total)}</span>
            </div>
            <div className="divide-y divide-slate-100">
              {data.items.map(e => (
                <div key={e.id} className="flex items-center justify-between px-5 py-2.5 hover:bg-slate-50 transition-colors">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: color }} />
                    <div className="min-w-0">
                      <p className="text-sm text-slate-700 truncate">{e.description}</p>
                      <p className="text-xs text-slate-400">{e.date} · {e.tag}</p>
                    </div>
                  </div>
                  <span className="mono text-sm text-emerald-600 font-medium flex-shrink-0 ml-3">{brl(e.amount)}</span>
                </div>
              ))}
            </div>
          </motion.div>
        );
      })}

      {/* Julio via Xus */}
      {julioViaXus.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.45 }} className="card overflow-hidden">
          <div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between">
            <span className="font-semibold text-slate-800">🧔 Julio (pago via Xus)</span>
            <span className="mono text-sm font-bold" style={{ color: XUS_SUB_COLORS.julio }}>{brl(totalJulioViaXus)}</span>
          </div>
          <div className="divide-y divide-slate-100">
            {julioViaXus.map(e => (
              <div key={e.id} className="flex items-center justify-between px-5 py-2.5 hover:bg-slate-50 transition-colors">
                <div>
                  <p className="text-sm text-slate-700">{e.description}</p>
                  <p className="text-xs text-slate-400">{e.date} · {e.tag}</p>
                </div>
                <span className="mono text-sm font-medium" style={{ color: XUS_SUB_COLORS.julio }}>{brl(e.amount)}</span>
              </div>
            ))}
          </div>
        </motion.div>
      )}

    </div>
  );
}
