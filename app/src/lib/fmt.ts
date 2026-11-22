/** Formata valor monetário em R$ com tabular-nums */
export function brl(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
  }).format(value);
}

/** Retorna classe Tailwind de cor pelo sinal do valor */
export function signClass(value: number): string {
  if (value > 0) return 'text-emerald-600';
  if (value < 0) return 'text-red-500';
  return 'text-slate-400';
}

/** Cores HEX para gráficos (Recharts) */
export const CHART_COLORS = {
  nubank:   '#7C3AED',
  amazon:   '#2563EB',
  piques:   '#D97706',
  boleto:   '#64748B',
  receita:  '#059669',
  verde:    '#10B981',
  rosa:     '#EC4899',
  ciano:    '#0891B2',
  laranja:  '#EA580C',
  roxo:     '#7C3AED',
  perigo:   '#DC2626',
  slate:    '#64748B',
};

/** Paleta de categorias para gráficos de pizza/donut */
export const CATEGORY_COLORS: Record<string, string> = {
  'Alimentação':    '#D97706',
  'Transporte':     '#2563EB',
  'Farmácia':       '#059669',
  'Entretenimento': '#7C3AED',
  'Saúde':          '#EC4899',
  'Casa':           '#0891B2',
  'Compras':        '#EA580C',
  'Vestuário':      '#8B5CF6',
  'Higiene':        '#10B981',
  'Bebê':           '#F59E0B',
  'Outros':         '#64748B',
  'Estorno':        '#DC2626',
  'Repasse':        '#059669',
  'Parcela':        '#3B82F6',
  'Investimento':   '#16A34A',
  'Carro':          '#EA580C',
  'Beleza':         '#DB2777',
  'Streaming':      '#7C3AED',
};

/** Prefixo de tag → categoria (para classificação automática) */
export const TAG_PREFIXES: Record<string, { label: string; color: string }> = {
  '[MCD]':  { label: 'Mercado',   color: '#059669' },
  '[CAR]':  { label: 'Carro',     color: '#EA580C' },
  '[MOTO]': { label: 'Moto',      color: '#2563EB' },
};

/** Extrai prefixo de tag de uma descrição */
export function extractTagPrefix(description: string): string | null {
  for (const prefix of Object.keys(TAG_PREFIXES)) {
    if (description.startsWith(prefix)) return prefix;
  }
  return null;
}

/** Label legível da fonte */
export const SOURCE_LABELS: Record<string, string> = {
  NubankUltra:  'Nubank Ultra',
  AmazonCard:   'Cartão Amazon',
  Piques:       'Dinheiro / Pix',
  BoletoOutros: 'Boleto / Outros',
};

/** Cores por fonte — LIGHT theme */
export const SOURCE_COLORS: Record<string, {
  bg: string; text: string; dot: string; border: string;
  hex: string; gradient: string;
}> = {
  NubankUltra: {
    bg: 'bg-violet-50',   text: 'text-violet-700',  dot: 'bg-violet-500',  border: 'border-violet-200',
    hex: '#7C3AED',        gradient: 'from-violet-50 to-transparent',
  },
  AmazonCard: {
    bg: 'bg-blue-50',     text: 'text-blue-700',    dot: 'bg-blue-500',    border: 'border-blue-200',
    hex: '#2563EB',        gradient: 'from-blue-50 to-transparent',
  },
  Piques: {
    bg: 'bg-amber-50',    text: 'text-amber-700',   dot: 'bg-amber-500',   border: 'border-amber-200',
    hex: '#D97706',        gradient: 'from-amber-50 to-transparent',
  },
  BoletoOutros: {
    bg: 'bg-slate-50',    text: 'text-slate-600',   dot: 'bg-slate-400',   border: 'border-slate-200',
    hex: '#64748B',        gradient: 'from-slate-50 to-transparent',
  },
};

export const SUBTAG_COLORS: Record<string, string> = {
  J: 'text-emerald-600',
  U: 'text-sky-600',
  C: 'text-orange-600',
};

export const SUBTAG_LABELS: Record<string, string> = {
  J: 'Júlio',
  U: 'Julia',
  C: 'Sogra/Claudia',
};
