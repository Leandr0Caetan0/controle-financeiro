import type { ExpenseEntry, ExpenseSource, SubTag } from '../types/api';

// ── Mapeamento de tokens de fonte ─────────────────────────────────────────────

const SOURCE_ALIASES: Record<string, ExpenseSource> = {
  ultra: 'NubankUltra',
  nubank: 'NubankUltra',
  nu: 'NubankUltra',
  amazon: 'AmazonCard',
  amz: 'AmazonCard',
  prime: 'AmazonCard',
  piques: 'Piques',
  pix: 'Piques',
  dinheiro: 'Piques',
  cash: 'Piques',
  boleto: 'BoletoOutros',
  outros: 'BoletoOutros',
  outro: 'BoletoOutros',
};

// ── Resultado do parse ────────────────────────────────────────────────────────

export interface ParsedCommand {
  description: string;
  amount: number | null;
  source: ExpenseSource;
  ownerId: string | null;
  subTag: SubTag | null;
  tag: string;
  installmentCurrent: number | null;
  installmentTotal: number | null;
  subtractFromUltra: boolean;
  informationalOnly: boolean;
}

export function parseCommand(input: string): ParsedCommand {
  let remaining = input.trim();

  // SubTag [J], [U], [C]
  let subTag: SubTag | null = null;
  remaining = remaining.replace(/\[(J|U|C)\]/gi, (_, t: string) => {
    subTag = t.toUpperCase() as SubTag;
    return '';
  });

  // Owner @nome
  let ownerId: string | null = null;
  remaining = remaining.replace(/@(\w+)/g, (_, name: string) => {
    const n = name.toLowerCase();
    if (n !== 'eu' && n !== 'me' && n !== 'meu') ownerId = n;
    return '';
  });

  // Tag #tag
  let tag = '';
  remaining = remaining.replace(/#(\S+)/g, (_, t: string) => {
    tag = t;
    return '';
  });

  // Parcela X/Y (ex: 2/6)
  let installmentCurrent: number | null = null;
  let installmentTotal: number | null = null;
  remaining = remaining.replace(/\b(\d+)\/(\d+)\b/g, (_, c: string, t: string) => {
    installmentCurrent = parseInt(c);
    installmentTotal = parseInt(t);
    return '';
  });

  // Fonte (token isolado)
  let source: ExpenseSource = 'NubankUltra';
  const sourcePattern = new RegExp(
    `\\b(${Object.keys(SOURCE_ALIASES).join('|')})\\b`,
    'gi'
  );
  remaining = remaining.replace(sourcePattern, (_, s: string) => {
    source = SOURCE_ALIASES[s.toLowerCase()];
    return '';
  });

  // Valor: número com sinal opcional, vírgula ou ponto
  let amount: number | null = null;
  remaining = remaining.replace(/([-+]?\d+(?:[.,]\d+)?)/g, (_, n: string) => {
    if (amount === null) {
      amount = parseFloat(n.replace(',', '.'));
    }
    return '';
  });

  // Descrição: o que sobrou, limpo
  const description = remaining.replace(/\s+/g, ' ').trim();

  // subtractFromUltra: automático quando há terceiro + fonte Ultra
  const subtractFromUltra = source === 'NubankUltra' && ownerId !== null;

  return {
    description,
    amount,
    source,
    ownerId,
    subTag,
    tag,
    installmentCurrent,
    installmentTotal,
    subtractFromUltra,
    informationalOnly: false,
  };
}

// ── Parser de fatura colada (Nubank / Amazon) ─────────────────────────────────

export interface ParsedInvoiceLine {
  date: string;        // "2026-11-15"
  description: string;
  amount: number;
  rawLine: string;
}

const MONTH_MAP: Record<string, string> = {
  jan: '01', fev: '02', mar: '03', abr: '04', mai: '05', jun: '06',
  jul: '07', ago: '08', set: '09', out: '10', nov: '11', dez: '12',
  feb: '02', apr: '04', may: '05', aug: '08', sep: '09', oct: '10',
  dec: '12',
};

function parseDate(raw: string, refYear = new Date().getFullYear()): string {
  // "15/11" or "15 nov" or "15 de nov"
  const slash = raw.match(/^(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?$/);
  if (slash) {
    const d = slash[1].padStart(2, '0');
    const m = slash[2].padStart(2, '0');
    const y = slash[3] ? (slash[3].length === 2 ? `20${slash[3]}` : slash[3]) : String(refYear);
    return `${y}-${m}-${d}`;
  }
  const text = raw.match(/^(\d{1,2})\s+(?:de\s+)?([a-z]{3})/i);
  if (text) {
    const d = text[1].padStart(2, '0');
    const m = MONTH_MAP[text[2].toLowerCase()] ?? '01';
    return `${refYear}-${m}-${d}`;
  }
  return `${refYear}-01-01`;
}

export function parseInvoiceLines(text: string, refYear?: number): ParsedInvoiceLine[] {
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
  const results: ParsedInvoiceLine[] = [];
  const year = refYear ?? new Date().getFullYear();

  for (const line of lines) {
    // Padrão: "15/11 Descrição R$ 34,90" ou "15 nov Descrição R$ 34,90"
    // Nubank: "15 nov Uber *Trip R$ 34,90"
    // Amazon: "15/11/2026 Amazon Prime R$ 21,00"
    const match = line.match(
      /^(\d{1,2}[\/\s][a-z]{3}(?:[\s\/]\d{2,4})?|\d{1,2}\/\d{1,2}(?:\/\d{2,4})?)\s+(.+?)\s+R\$\s*([\d.,]+)\s*$/i
    );
    if (match) {
      const date = parseDate(match[1].trim(), year);
      const description = match[2].trim();
      const amount = parseFloat(match[3].replace('.', '').replace(',', '.'));
      if (!isNaN(amount)) {
        results.push({ date, description, amount, rawLine: line });
      }
      continue;
    }

    // Fallback: "Descrição R$ 34,90" sem data
    const noDate = line.match(/^(.+?)\s+R\$\s*([\d.,]+)\s*$/i);
    if (noDate) {
      const description = noDate[1].trim();
      const amount = parseFloat(noDate[2].replace('.', '').replace(',', '.'));
      if (!isNaN(amount) && description.length > 1) {
        const today = new Date();
        const date = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
        results.push({ date, description, amount, rawLine: line });
      }
    }
  }

  return results;
}

// ── Converte ParsedCommand em ExpenseEntry parcial ────────────────────────────

export function parsedToEntry(
  parsed: ParsedCommand,
  cycleId: string,
): Partial<ExpenseEntry> {
  return {
    description: parsed.description || 'Lançamento',
    amount: parsed.amount ?? 0,
    date: new Date().toISOString().slice(0, 10),
    source: parsed.source,
    ownerId: parsed.ownerId ?? undefined,
    subTag: parsed.subTag ?? undefined,
    tag: parsed.tag || 'Geral',
    installmentCurrent: parsed.installmentCurrent ?? undefined,
    installmentTotal: parsed.installmentTotal ?? undefined,
    subtractFromUltra: parsed.subtractFromUltra,
    informationalOnly: parsed.informationalOnly,
    criticalAlert: false,
    monthCycleId: cycleId,
  };
}
