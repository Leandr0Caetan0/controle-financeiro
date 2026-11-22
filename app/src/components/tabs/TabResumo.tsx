import { useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  RadialBarChart, RadialBar,
} from 'recharts';
import type { CycleDetailDto } from '../../types/api';
import { brl, CHART_COLORS, SOURCE_COLORS, SOURCE_LABELS } from '../../lib/fmt';
import { tooltipStyle, tooltipLabelStyle, tooltipItemStyle, fmtBrl } from './chartUtils';

interface Props {
  detail: CycleDetailDto;
  onEditFatura: () => void;
}

function StatCard({ label, value, sub, color, delay = 0 }: {
  label: string; value: string; sub?: string; color: string; delay?: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay }}
      className="card p-5 flex flex-col gap-1"
    >
      <span className="text-xs text-slate-500 font-medium uppercase tracking-wider">{label}</span>
      <span className={`mono text-2xl font-bold ${color}`}>{value}</span>
      {sub && <span className="text-xs text-slate-400">{sub}</span>}
    </motion.div>
  );
}

export function TabResumo({ detail }: Props) {
  const { cycle, summary, reconciliation } = detail;
  const today = new Date();
  const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
  const daysPassed = today.getDate();
  const progressPct = Math.round((daysPassed / daysInMonth) * 100);

  // Gastos por fonte (donut)
  const sourceData = useMemo(() => {
    return Object.entries(summary.gastosPorFonte)
      .map(([src, val]) => ({
        name: SOURCE_LABELS[src] ?? src,
        value: val,
        color: SOURCE_COLORS[src]?.hex ?? '#64748B',
      }))
      .filter(d => d.value > 0)
      .sort((a, b) => b.value - a.value);
  }, [summary.gastosPorFonte]);

  const totalGastos = sourceData.reduce((s, d) => s + d.value, 0);

  // Gauge do saldo livre
  const saldo = summary.saldoLivreDoMes;
  const receitas = summary.totalReceitas;
  const pctUsado = receitas > 0 ? Math.min(100, Math.max(0, ((receitas - Math.max(0, saldo)) / receitas) * 100)) : 100;

  const gaugeData = [
    { name: 'Usado', value: pctUsado, fill: saldo < 0 ? CHART_COLORS.perigo : saldo < receitas * 0.2 ? CHART_COLORS.laranja : CHART_COLORS.receita },
    { name: 'Livre', value: 100 - pctUsado, fill: '#E2E8F0' },
  ];

  // Obrigações por categoria (barras horizontais)
  const obligationsByCategory = useMemo(() => {
    const map: Record<string, number> = {};
    for (const obl of cycle.fixedObligations.filter(o => o.includeInMyAccounts)) {
      map[obl.category] = (map[obl.category] ?? 0) + obl.amount;
    }
    return Object.entries(map)
      .map(([cat, val]) => ({ name: cat, value: val }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 8);
  }, [cycle.fixedObligations]);

  const statusCfg = {
    Exata:          { label: 'Prova Real OK',  color: 'text-emerald-600', icon: '✅' },
    Arredondamento: { label: 'Arredondamento', color: 'text-amber-600',   icon: '🟡' },
    Divergente:     { label: 'Divergente',     color: 'text-red-600',     icon: '❌' },
  };
  const st = statusCfg[reconciliation.status] ?? statusCfg.Divergente;

  return (
    <div className="flex flex-col gap-5">
      {/* KPI cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Receitas" value={brl(summary.totalReceitas)} color="text-emerald-600" delay={0} />
        <StatCard label="Obrigações Fixas" value={brl(summary.totalObrigacoesFixas)} color="text-orange-600" delay={0.05} />
        <StatCard label="Gastos Variáveis" value={brl(summary.totalGastosPorFonte)} color="text-violet-700" delay={0.1} />
        <StatCard
          label="Saldo Livre"
          value={brl(saldo)}
          color={saldo >= 0 ? 'text-emerald-600' : 'text-red-600'}
          sub={`Reserva: ${brl(summary.reservaEmergencia)}`}
          delay={0.15}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Gauge saldo */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="card p-5 flex flex-col items-center gap-3"
        >
          <span className="text-xs text-slate-500 uppercase tracking-wider font-medium">Saldo do Mês</span>
          <div className="relative w-48 h-24 overflow-hidden">
            <ResponsiveContainer width="100%" height={160}>
              <RadialBarChart
                cx="50%" cy="100%"
                innerRadius="70%" outerRadius="100%"
                startAngle={180} endAngle={0}
                data={gaugeData}
              >
                <RadialBar dataKey="value" cornerRadius={4} />
              </RadialBarChart>
            </ResponsiveContainer>
            <div className="absolute bottom-0 left-0 right-0 flex flex-col items-center">
              <span className={`mono font-bold text-xl ${saldo >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                {brl(Math.abs(saldo))}
              </span>
              <span className="text-xs text-slate-400">{saldo >= 0 ? 'disponível' : 'negativo'}</span>
            </div>
          </div>
          <div className="w-full flex justify-between text-xs text-slate-400 mt-1">
            <span>Dia {daysPassed}/{daysInMonth}</span>
            <span>{progressPct}% do mês</span>
          </div>
          <div className="w-full bg-slate-200 rounded-full h-1.5">
            <div
              className="h-1.5 rounded-full bg-gradient-to-r from-violet-600 to-violet-400 transition-all duration-700"
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </motion.div>

        {/* Donut gastos por fonte */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.25 }}
          className="card p-5 flex flex-col gap-3"
        >
          <span className="text-xs text-slate-500 uppercase tracking-wider font-medium">Gastos por Fonte</span>
          <div className="flex items-center gap-4">
            <div style={{ width: 110, height: 110, flexShrink: 0 }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={sourceData} dataKey="value" innerRadius={32} outerRadius={50} paddingAngle={3} stroke="none">
                    {sourceData.map((d, i) => <Cell key={i} fill={d.color} />)}
                  </Pie>
                  <Tooltip formatter={fmtBrl} contentStyle={tooltipStyle} labelStyle={tooltipLabelStyle} itemStyle={tooltipItemStyle} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex flex-col gap-1.5 flex-1 min-w-0">
              {sourceData.map((d, i) => (
                <div key={i} className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: d.color }} />
                    <span className="text-xs text-slate-500 truncate">{d.name}</span>
                  </div>
                  <span className="mono text-xs text-slate-700 flex-shrink-0">
                    {totalGastos > 0 ? Math.round((d.value / totalGastos) * 100) : 0}%
                  </span>
                </div>
              ))}
            </div>
          </div>
        </motion.div>

        {/* Prova Real status */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="card p-5 flex flex-col gap-3"
        >
          <span className="text-xs text-slate-500 uppercase tracking-wider font-medium">Prova Real — Nubank Ultra</span>
          <div className="flex flex-col gap-2 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-500">Fatura Total</span>
              <span className="mono text-slate-800 font-medium">{brl(reconciliation.faturaTotal)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">− Assinaturas</span>
              <span className="mono text-orange-600">−{brl(reconciliation.totalAssinaturas)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">− Terceiros</span>
              <span className="mono text-blue-600">−{brl(reconciliation.totalTerceiros)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">− Meus gastos</span>
              <span className="mono text-violet-700">−{brl(reconciliation.totalMeusGastos)}</span>
            </div>
            <div className="border-t border-slate-100 pt-2 flex justify-between">
              <span className="text-slate-700 font-semibold">Diferença</span>
              <span className={`mono font-bold ${
                reconciliation.diferenca === 0
                  ? 'text-emerald-600'
                  : Math.abs(reconciliation.diferenca) <= 0.02
                    ? 'text-amber-600'
                    : 'text-red-600'
              }`}>
                {brl(reconciliation.diferenca)}
              </span>
            </div>
          </div>
          <div className={`mt-auto rounded-lg px-3 py-2 text-center text-sm font-semibold ${st.color}`}>
            {st.icon} {st.label}
          </div>
        </motion.div>
      </div>

      {/* Barras de obrigações por categoria */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.35 }}
        className="card p-5"
      >
        <div className="flex items-center justify-between mb-4">
          <span className="text-xs text-slate-500 uppercase tracking-wider font-medium">Obrigações Fixas por Categoria</span>
          <span className="mono text-sm text-orange-600 font-semibold">{brl(summary.totalObrigacoesFixas)}</span>
        </div>
        <ResponsiveContainer width="100%" height={Math.max(180, obligationsByCategory.length * 36)}>
          <BarChart data={obligationsByCategory} layout="vertical" margin={{ left: 10, right: 60, top: 0, bottom: 0 }}>
            <CartesianGrid horizontal={false} stroke="rgba(0,0,0,0.04)" />
            <XAxis
              type="number"
              tickFormatter={(v: number) => `R$${(v / 1000).toFixed(1)}k`}
              tick={{ fill: '#94A3B8', fontSize: 11 }}
              axisLine={false} tickLine={false}
            />
            <YAxis
              type="category" dataKey="name" width={120}
              tick={{ fill: '#64748B', fontSize: 12 }}
              axisLine={false} tickLine={false}
            />
            <Tooltip formatter={fmtBrl} contentStyle={tooltipStyle} labelStyle={tooltipLabelStyle} itemStyle={tooltipItemStyle} />
            <Bar dataKey="value" fill={CHART_COLORS.laranja} radius={[0, 4, 4, 0]} maxBarSize={22} />
          </BarChart>
        </ResponsiveContainer>
      </motion.div>
    </div>
  );
}
