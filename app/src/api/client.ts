import type {
  CycleSummaryDto,
  CycleDetailDto,
  UpdateCycleRequest,
  ExpenseEntry,
  PatchEntryRequest,
} from '../types/api';

// Em desenvolvimento com proxy Vite: usa '/api' (proxied para localhost:5148)
// Em produção (Vercel etc): define VITE_API_URL=https://sua-api.com
const BASE = (import.meta.env.VITE_API_URL as string | undefined) ?? '/api';

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json', ...options?.headers },
    ...options,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`${res.status} ${res.statusText}: ${text}`);
  }
  if (res.status === 204) return undefined as T;
  // eslint-disable-next-line @typescript-eslint/no-unsafe-return
  return (await res.json()) as T;
}

export const api = {
  getCycles: (): Promise<CycleSummaryDto[]> =>
    request<CycleSummaryDto[]>('/cycles'),

  getCycle: (id: string): Promise<CycleDetailDto> =>
    request<CycleDetailDto>(`/cycles/${id}`),

  updateCycle: (id: string, data: UpdateCycleRequest): Promise<unknown> =>
    request<unknown>(`/cycles/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  createNext: (id: string): Promise<{ id: string; label: string }> =>
    request<{ id: string; label: string }>(`/cycles/${id}/next`, {
      method: 'POST',
      body: JSON.stringify({}),
    }),

  addEntries: (cycleId: string, entries: Partial<ExpenseEntry>[]): Promise<ExpenseEntry[]> =>
    request<ExpenseEntry[]>(`/cycles/${cycleId}/entries`, {
      method: 'POST',
      body: JSON.stringify(entries),
    }),

  patchEntry: (cycleId: string, entryId: number, patch: PatchEntryRequest): Promise<ExpenseEntry> =>
    request<ExpenseEntry>(`/cycles/${cycleId}/entries/${entryId}`, {
      method: 'PATCH',
      body: JSON.stringify(patch),
    }),

  deleteEntry: (cycleId: string, entryId: number): Promise<void> =>
    request<void>(`/cycles/${cycleId}/entries/${entryId}`, {
      method: 'DELETE',
    }),
};
