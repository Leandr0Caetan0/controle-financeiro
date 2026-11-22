// Estilo compartilhado para tooltips dos gráficos — light theme
export const tooltipStyle = {
  background: '#FFFFFF',
  border: '1px solid rgba(0,0,0,0.08)',
  borderRadius: 10,
  boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
};

export const tooltipLabelStyle = { color: '#64748B' };
export const tooltipItemStyle  = { color: '#0F172A' };

/** Formata valor monetário para tooltips (sem importar brl para evitar ciclos) */
export const fmtBrl = (v: unknown): string =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 2 }).format(Number(v));
