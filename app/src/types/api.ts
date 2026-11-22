// Tipos espelhando o JSON da API (.NET): camelCase, enums como string, DateOnly como "YYYY-MM-DD".

export type IncomeCategory = 'Clt' | 'Cft' | 'Ferias' | 'Ppr' | 'Outros';
export type Recurrence = 'Mensal' | 'Pontual';
export type ExpenseSource = 'NubankUltra' | 'AmazonCard' | 'Piques' | 'BoletoOutros';
export type SubTag = 'J' | 'U' | 'C';
export type ReconciliationStatus = 'Exata' | 'Arredondamento' | 'Divergente';

export interface ThirdPartyPerson {
  id: string;
  name: string;
  relationship?: string;
  defaultDueDay?: number | null;
  isRecurring?: boolean;
}

export interface IncomeItem {
  id: number;
  title: string;
  category: IncomeCategory;
  amount: number;
  recurrence: Recurrence;
  receivedDay?: number | null;
  monthCycleId: string;
}

export interface FixedObligation {
  id: number;
  title: string;
  amount: number;
  fullInvoiceAmount?: number | null;
  splitPeople?: number | null;
  dueDay: number;
  source: ExpenseSource;
  category: string;
  installmentCurrent?: number | null;
  installmentTotal?: number | null;
  subtractFromUltraInvoice: boolean;
  criticalAlert: boolean;
  includeInMyAccounts: boolean;
  paid: boolean;
  monthCycleId: string;
}

export interface ExpenseEntry {
  id: number;
  description: string;
  amount: number;
  date: string;
  dueDay?: number | null;
  source: ExpenseSource;
  ownerId?: string | null;
  owner?: ThirdPartyPerson | null;
  subTag?: SubTag | null;
  tag: string;
  installmentCurrent?: number | null;
  installmentTotal?: number | null;
  subtractFromUltra: boolean;
  informationalOnly: boolean;
  criticalAlert: boolean;
  monthCycleId: string;
}

export interface MonthCycle {
  id: string;
  label: string;
  referencePeriod: string;
  ultraInvoiceTotal: number;
  emergencyReserveTarget: number;
  incomeItems: IncomeItem[];
  fixedObligations: FixedObligation[];
  expenseEntries: ExpenseEntry[];
}

export interface UltraReconciliationResult {
  faturaTotal: number;
  totalAssinaturas: number;
  totalTerceiros: number;
  totalMeusGastos: number;
  diferenca: number;
  status: ReconciliationStatus;
}

export interface ThirdPartySummaryResult {
  totalGeral: number;
  totalApenasProprio: number;
  totalNubank: number;
  totalNaoNubank: number;
  informationalItems: ExpenseEntry[];
}

export interface MonthSummaryResult {
  totalReceitas: number;
  totalObrigacoesFixas: number;
  totalGastosPorFonte: number;
  reservaEmergencia: number;
  saldoLivreDoMes: number;
  gastosPorFonte: Record<string, number>;
}

export interface CycleSummaryDto {
  id: string;
  label: string;
  referencePeriod: string;
  ultraInvoiceTotal: number;
  totalReceitas: number;
  totalObrigacoes: number;
  totalGastos: number;
  saldoLivre: number;
  reconciliationStatus: ReconciliationStatus;
}

export interface CycleDetailDto {
  cycle: MonthCycle;
  summary: MonthSummaryResult;
  reconciliation: UltraReconciliationResult;
  thirdParty: ThirdPartySummaryResult;
}

export interface UpdateCycleRequest {
  ultraInvoiceTotal: number;
  emergencyReserveTarget: number;
  incomes?: IncomeItem[] | null;
  obligations?: FixedObligation[] | null;
}

export interface PatchEntryRequest {
  description?: string;
  amount?: number;
  date?: string;
  dueDay?: number;
  source?: ExpenseSource;
  ownerId?: string;
  subTag?: SubTag;
  tag?: string;
  installmentCurrent?: number;
  installmentTotal?: number;
  subtractFromUltra?: boolean;
  informationalOnly?: boolean;
  criticalAlert?: boolean;
}
