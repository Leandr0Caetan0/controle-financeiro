/** Formata valor monetário em R$ com tabular-nums */
export function brl(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
  }).format(value);
}

/** Retorna classe de cor pelo sinal do valor */
export function signClass(value: number, options?: { zeroDim?: boolean }): string {
  if (value > 0) return 'text-green-400';
  if (value < 0) return 'text-red-400';
  return options?.zeroDim ? 'text-zinc-500' : 'text-zinc-300';
}

export const SOURCE_LABELS: Record<string, string> = {
  NubankUltra: 'Nubank Ultra',
  AmazonCard: 'Cartão Amazon',
  Piques: 'Dinheiro / Pix',
  BoletoOutros: 'Boleto / Outros',
};

export const SOURCE_COLORS: Record<string, { bg: string; text: string; dot: string; border: string }> = {
  NubankUltra:  { bg: 'bg-violet-950/60',  text: 'text-violet-300',  dot: 'bg-violet-500',  border: 'border-violet-700' },
  AmazonCard:   { bg: 'bg-blue-950/60',    text: 'text-blue-300',    dot: 'bg-blue-500',    border: 'border-blue-700'   },
  Piques:       { bg: 'bg-amber-950/60',   text: 'text-amber-300',   dot: 'bg-amber-500',   border: 'border-amber-700'  },
  BoletoOutros: { bg: 'bg-zinc-800/60',    text: 'text-zinc-300',    dot: 'bg-zinc-500',    border: 'border-zinc-600'   },
};

export const SUBTAG_COLORS: Record<string, string> = {
  J: 'text-emerald-400',
  U: 'text-sky-400',
  C: 'text-orange-400',
};
