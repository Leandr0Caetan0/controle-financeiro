import { useEffect, useState, useCallback } from 'react';
import type { CycleSummaryDto, CycleDetailDto } from './types/api';
import { api } from './api/client';
import { AddEntryModal } from './components/AddEntryModal';
import { CsvImportModal } from './components/CsvImportModal';
import { AlertsPanel } from './components/AlertsPanel';
import { UltraCard } from './components/UltraCard';
import { SummaryCard } from './components/SummaryCard';
import { ThirdPartyCard } from './components/ThirdPartyCard';
import { ObligationsCard } from './components/ObligationsCard';
import { IncomeCard } from './components/IncomeCard';
import { ExpenseList } from './components/ExpenseList';

export default function App() {
  const [cycles, setCycles] = useState<CycleSummaryDto[]>([]);
  const [selectedId, setSelectedId] = useState<string>('');
  const [detail, setDetail] = useState<CycleDetailDto | null>(null);
  const [loadingCycles, setLoadingCycles] = useState(true);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showCsvModal, setShowCsvModal] = useState(false);

  useEffect(() => {
    void (async () => {
      setLoadingCycles(true);
      try {
        const data = await api.getCycles();
        setCycles(data);
        if (data.length > 0) setSelectedId(data[0].id);
      } catch (err: unknown) {
        setError(String(err));
      } finally {
        setLoadingCycles(false);
      }
    })();
  }, []);

  const loadDetail = useCallback((id: string) => {
    if (!id) return;
    void (async () => {
      setLoadingDetail(true);
      setError(null);
      try {
        const data = await api.getCycle(id);
        setDetail(data);
      } catch (err: unknown) {
        setError(String(err));
      } finally {
        setLoadingDetail(false);
      }
    })();
  }, []);

  useEffect(() => {
    if (selectedId) loadDetail(selectedId);
  }, [selectedId, loadDetail]);

  // Atalho global Ctrl+K / Cmd+K → abre Lançamento Rápido
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        if (detail?.cycle) setShowAddModal(v => !v);
      }
    };
    document.addEventListener('keydown', h);
    return () => document.removeEventListener('keydown', h);
  }, [detail]);

  async function handleCreateNext() {
    if (!selectedId) return;
    try {
      const next = await api.createNext(selectedId);
      const updated = await api.getCycles();
      setCycles(updated);
      setSelectedId(next.id);
    } catch (err: unknown) {
      setError(String(err));
    }
  }

  const cycle = detail?.cycle;
  const summary = detail?.summary;
  const reconciliation = detail?.reconciliation;
  const thirdParty = detail?.thirdParty;

  return (
    <div className="min-h-screen bg-[#0F0F13] text-zinc-100">
      {/* ── Header ── */}
      <header className="border-b border-zinc-800 bg-zinc-900/80 backdrop-blur sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="text-violet-400 text-xl font-black mono">₢</span>
            <h1 className="font-bold text-zinc-100">CaetanoFinanças</h1>
          </div>

          <div className="flex items-center gap-3">
            {loadingCycles ? (
              <span className="text-zinc-500 text-sm">Carregando...</span>
            ) : (
              <select
                value={selectedId}
                onChange={e => setSelectedId(e.target.value)}
                className="bg-zinc-800 border border-zinc-600 text-zinc-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-violet-500 cursor-pointer"
              >
                {cycles.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.label}
                    {c.reconciliationStatus === 'Exata' ? ' ✅' :
                     c.reconciliationStatus === 'Arredondamento' ? ' 🟡' :
                     c.reconciliationStatus === 'Divergente' ? ' ❌' : ''}
                  </option>
                ))}
              </select>
            )}
            <button
              onClick={() => setShowAddModal(true)}
              className="bg-violet-600 hover:bg-violet-500 border border-violet-500 text-white rounded-lg px-3 py-1.5 text-xs font-bold transition-colors"
              title="Novo lançamento (Ctrl+K)"
            >
              + Lançamento
            </button>
            <button
              onClick={() => setShowCsvModal(true)}
              disabled={!selectedId}
              className="bg-zinc-700 hover:bg-zinc-600 disabled:opacity-40 border border-zinc-600 text-zinc-200 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors"
              title="Importar CSV / Google Sheets"
            >
              📥 CSV
            </button>
            <button
              onClick={() => { void handleCreateNext(); }}
              disabled={!selectedId}
              className="bg-violet-900/60 hover:bg-violet-800/60 disabled:opacity-40 border border-violet-700 text-violet-200 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors"
            >
              + Próximo Mês
            </button>
          </div>
        </div>
      </header>

      {/* ── Modal CSV Import ── */}
      {showCsvModal && cycle && (
        <CsvImportModal
          cycleId={cycle.id}
          onClose={() => setShowCsvModal(false)}
          onImported={() => { if (cycle) loadDetail(cycle.id); }}
        />
      )}

      {/* ── Modal de lançamento ── */}
      {showAddModal && cycle && (
        <AddEntryModal
          cycleId={cycle.id}
          onClose={() => setShowAddModal(false)}
          onSaved={() => { setShowAddModal(false); if (cycle) loadDetail(cycle.id); }}
        />
      )}

      {/* ── Main ── */}
      <main className="max-w-7xl mx-auto px-4 py-6 flex flex-col gap-5">
        {error && (
          <div className="bg-red-950/60 border border-red-800 rounded-lg px-4 py-3 text-red-300 text-sm flex justify-between items-center">
            <span>⚠️ {error}</span>
            <button onClick={() => setError(null)} className="text-red-500 hover:text-red-300 ml-4 text-lg leading-none">✕</button>
          </div>
        )}

        {loadingDetail && !detail && (
          <div className="text-center text-zinc-500 py-16">Carregando ciclo...</div>
        )}

        {cycle && summary && reconciliation && thirdParty && (
          <>
            <AlertsPanel obligations={cycle.fixedObligations} entries={cycle.expenseEntries} />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <SummaryCard summary={summary} />
              <UltraCard
                cycleId={cycle.id}
                reconciliation={reconciliation}
                emergencyReserveTarget={cycle.emergencyReserveTarget}
                onUpdated={() => loadDetail(cycle.id)}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <IncomeCard incomes={cycle.incomeItems} />
              <ObligationsCard obligations={cycle.fixedObligations} />
              <ThirdPartyCard thirdParty={thirdParty} />
            </div>

            <ExpenseList
              cycleId={cycle.id}
              entries={cycle.expenseEntries}
              onUpdated={() => loadDetail(cycle.id)}
            />
          </>
        )}
      </main>
    </div>
  );
}
