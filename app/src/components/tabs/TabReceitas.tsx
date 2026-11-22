import { motion } from 'framer-motion';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, BarChart, Bar, XAxis, YAxis } from 'recharts';
import type { IncomeItem } from '../../types/api';
import { brl, CHART_COLORS } from '../../lib/fmt';
import { tooltipStyle, tooltipLabelStyle, tooltipItemStyle, fmtBrl } from './chartUtils';

interface Props { incomes: IncomeItem[] }

const CAT_CFG: Record<string, { label: string; color: string }> = {
  Clt:    { label: 'CLT',       color: CHART_COLORS.receita },
  Cft:    { label: 'CFT',       color: CHART_COLORS.ciano   },
  Ferias: { label: 'Férias',    color: CHART_COLORS.roxo    },
  Ppr:    { label: 'PPR/PLR',   color: CHART_COLORS.rosa    },
  Outros: { label: 'Outros',    color: CHART_COLORS.slate   },
};

export function TabReceitas({ incomes }: Props) {
  const total = incomes.reduce((s, i) => s + i.amount, 0);

  const byCategory = Object.entries(
    incomes.reduce<Record<string, number>>((acc, item) => {
      acc[item.category] = (acc[item.category] ?? 0) + item.amount;
      return acc;
    }, {})
  ).map(([cat, val]) => ({
    name: CAT_CFG[cat]?.label ?? cat,
    value: val,
    color: CAT_CFG[cat]?.color ?? CHART_COLORS.slate,
  }));

  return (
    <div className="flex flex-col gap-5">
      {/* KPI */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="card p-6 flex items-center justify-between">
        <div>
          <p className="text-xs text-slate-500 uppercase tracking-wider font-medium">Total de Receitas</p>
          <p className="mono text-3xl font-bold text-emerald-600 mt-1">{brl(total)}</p>
          <p className="text-xs text-slate-400 mt-1">{incomes.length} fonte(s) cadastrada(s)</p>
        </div>
        <div className="text-5xl opacity-20">💰</div>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Donut por categoria */}
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.5, delay: 0.1 }} className="card p-5 flex flex-col gap-4">
          <span className="text-xs text-slate-500 uppercase tracking-wider font-medium">Distribuição por Tipo</span>
          <div className="flex items-center gap-6">
            <div style={{ width: 130, height: 130, flexShrink: 0 }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={byCategory} dataKey="value" innerRadius={38} outerRadius={60} paddingAngle={4} stroke="none">
                    {byCategory.map((d, i) => <Cell key={i} fill={d.color} />)}
                  </Pie>
                  <Tooltip formatter={fmtBrl} contentStyle={tooltipStyle} labelStyle={tooltipLabelStyle} itemStyle={tooltipItemStyle} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex flex-col gap-2 flex-1">
              {byCategory.map((d, i) => (
                <div key={i} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ background: d.color }} />
                    <span className="text-sm text-slate-700">{d.name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="mono text-sm text-slate-800">{brl(d.value)}</span>
                    <span className="text-xs text-slate-400">{total > 0 ? Math.round((d.value / total) * 100) : 0}%</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </motion.div>

        {/* Barras por fonte */}
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.5, delay: 0.15 }} className="card p-5 flex flex-col gap-4">
          <span className="text-xs text-slate-500 uppercase tracking-wider font-medium">Valor por Fonte</span>
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={incomes.map(i => ({ name: i.title.length > 18 ? i.title.slice(0, 16) + '…' : i.title, value: i.amount }))} margin={{ left: 0, right: 10, top: 4, bottom: 0 }}>
              <XAxis dataKey="name" tick={{ fill: '#94A3B8', fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis tickFormatter={(v: number) => `R$${(v / 1000).toFixed(0)}k`} tick={{ fill: '#94A3B8', fontSize: 10 }} axisLine={false} tickLine={false} width={48} />
              <Tooltip formatter={fmtBrl} contentStyle={tooltipStyle} labelStyle={tooltipLabelStyle} itemStyle={tooltipItemStyle} />
              <Bar dataKey="value" fill={CHART_COLORS.receita} radius={[4, 4, 0, 0]} maxBarSize={40} />
            </BarChart>
          </ResponsiveContainer>
        </motion.div>
      </div>

      {/* Lista detalhada */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.2 }} className="card overflow-hidden">
        <div className="px-5 py-3 border-b border-slate-100">
          <span className="text-xs text-slate-500 uppercase tracking-wider font-medium">Detalhamento</span>
        </div>
        <div className="divide-y divide-slate-100">
          {incomes.map(item => {
            const cfg = CAT_CFG[item.category] ?? { label: item.category, color: CHART_COLORS.slate };
            return (
              <div key={item.id} className="flex items-center justify-between px-5 py-3 hover:bg-slate-50 transition-colors">
                <div className="flex items-center gap-3">
                  <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: cfg.color }} />
                  <div>
                    <p className="text-sm text-slate-800">{item.title}</p>
                    <p className="text-xs text-slate-400">
                      {cfg.label} · {item.recurrence === 'Mensal' ? 'Mensal' : 'Pontual'}
                      {item.receivedDay ? ` · Dia ${item.receivedDay}` : ''}
                    </p>
                  </div>
                </div>
                <span className="mono text-sm font-semibold text-emerald-600">{brl(item.amount)}</span>
              </div>
            );
          })}
        </div>
      </motion.div>
    </div>
  );
}
