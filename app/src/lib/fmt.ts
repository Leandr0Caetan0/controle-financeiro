/** Formata valor monetário em R$ com tabular-nums */
export function brl(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
  }).format(value);
}

/** Retorna classe de cor pelo sinal do valor */
export function signClass(value: number): string {
  if (value > 0) return 'text-emerald-600';
  if (value < 0) return 'text-red-500';
  return 'text-slate-400';
}

export const SOURCE_LABELS: Record<string, string> = {
  NubankUltra: 'Nubank Ultra',
  AmazonCard:  'Cartão Amazon',
  Piques:      'Dinheiro / Pix',
  BoletoOutros:'Boleto / Outros',
};

/** Cores por fonte — light theme */
export const SOURCE_COLORS: Record<string, { bg: string; text: string; dot: string; border: string }> = {
  NubankUltra:  { bg: 'bg-violet-50',  text: 'text-violet-700',  dot: 'bg-violet-500',  border: 'border-violet-200' },
  AmazonCard:   { bg: 'bg-blue-50',    text: 'text-blue-700',    dot: 'bg-blue-500',    border: 'border-blue-200'   },
  Piques:       { bg: 'bg-amber-50',   text: 'text-amber-700',   dot: 'bg-amber-500',   border: 'border-amber-200'  },
  BoletoOutros: { bg: 'bg-slate-50',   text: 'text-slate-600',   dot: 'bg-slate-400',   border: 'border-slate-200'  },
};

export const SUBTAG_COLORS: Record<string, string> = {
  J: 'text-emerald-600',
  U: 'text-sky-600',
  C: 'text-orange-600',
};
