import { useEffect, useState, useCallback } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import type { CycleSummaryDto, CycleDetailDto } from './types/api';
import { api } from './api/client';
import { AddEntryModal } from './components/AddEntryModal';
import { CsvImportModal } from './components/CsvImportModal';
import { TabResumo } from './components/tabs/TabResumo';
import { TabReceitas } from './components/tabs/TabReceitas';
import { TabValoresReceber } from './components/tabs/TabValoresReceber';
import { TabNubank } from './components/tabs/TabNubank';
import { TabPiques } from './components/tabs/TabPiques';
import { TabAmazon } from './components/tabs/TabAmazon';

type Tab = 'resumo' | 'receitas' | 'receber' | 'nubank' | 'piques' | 'amazon';

const TABS: { id: Tab; label: string; emoji: string; color: string }[] = [
  { id: 'resumo',   label: 'Resumo',           emoji: '📊', color: 'text-slate-700'  },
  { id: 'receitas', label: 'Receitas',          emoji: '💰', color: 'text-emerald-700'},
  { id: 'receber',  label: 'Valores a Receber', emoji: '🤝', color: 'text-emerald-700'},
  { id: 'nubank',   label: 'Nubank',            emoji: '🟣', color: 'text-violet-700' },
  { id: 'piques',   label: 'Dinheiro/Piques',   emoji: '💵', color: 'text-amber-700'  },
  { id: 'amazon',   label: 'Amazon',            emoji: '📦', color: 'text-blue-700'   },
];

export default function App() {
  const [cycles, setCycles] = useState<CycleSummaryDto[]>([]);
  const [selectedId, setSelectedId] = useState<string>('');
  const [detail, setDetail] = useState<CycleDetailDto | null>(null);
  const [loadingCycles, setLoadingCycles] = useState(true);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showCsvModal, setShowCsvModal] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>('resumo');

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
  const refresh = useCallback(() => { if (selectedId) loadDetail(selectedId); }, [selectedId, loadDetail]);

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg-base)' }}>
      {/* Header */}
      <header style={{ background: 'var(--bg-card)', borderBottom: '1px solid var(--border)' }} className="sticky top-0 z-30 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
          {/* Logo */}
          <div className="flex items-center gap-2.5 flex-shrink-0">
            <div className="w-8 h-8 rounded-lg bg-violet-600 flex items-center justify-center text-white font-black text-sm">₢</div>
            <div>
              <p className="font-bold text-slate-800 text-sm leading-tight">CaetanoFinanças</p>
              <p className="text-xs text-slate-400 leading-tight">controle financeiro</p>
            </div>
          </div>

          {/* Seletor de mês */}
          <div className="flex items-center gap-2 flex-1 justify-center max-w-xs">
            {loadingCycles ? (
              <span className="text-slate-500 text-sm">Carregando...</span>
            ) : (
              <select
                value={selectedId}
                onChange={e => setSelectedId(e.target.value)}
              style={{ background: 'var(--bg-card2)', border: '1px solid var(--border)' }}
                className="text-slate-700 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400 cursor-pointer w-full"
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
          </div>

          {/* Ações */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              onClick={() => setShowAddModal(true)}
              className="bg-violet-600 hover:bg-violet-500 text-white rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors"
              title="Ctrl+K"
            >
              + Lançamento
            </button>
            <button
              onClick={() => setShowCsvModal(true)}
              disabled={!selectedId}
              style={{ background: 'var(--bg-card2)', border: '1px solid var(--border)' }}
              className="text-slate-500 hover:text-slate-700 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors disabled:opacity-40"
            >
              📥 CSV
            </button>
            <button
              onClick={() => { void handleCreateNext(); }}
              disabled={!selectedId}
              style={{ background: 'var(--bg-card2)', border: '1px solid var(--border)' }}
              className="text-slate-500 hover:text-slate-700 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors disabled:opacity-40"
            >
              + Próx. Mês
            </button>
          </div>
        </div>

        {/* Tabs navigation */}
        <div className="max-w-7xl mx-auto px-4 flex gap-1 overflow-x-auto pb-px scrollbar-none">
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium transition-all border-b-2 whitespace-nowrap flex-shrink-0 ${
                activeTab === tab.id
                  ? `border-violet-600 ${tab.color}`
                  : 'border-transparent text-slate-400 hover:text-slate-600'
              }`}
            >
              <span>{tab.emoji}</span>
              <span>{tab.label}</span>
            </button>
          ))}
        </div>
      </header>

      {/* Modals */}
      {showCsvModal && cycle && (
        <CsvImportModal
          cycleId={cycle.id}
          onClose={() => setShowCsvModal(false)}
          onImported={() => { setShowCsvModal(false); refresh(); }}
        />
      )}
      {showAddModal && cycle && (
        <AddEntryModal
          cycleId={cycle.id}
          onClose={() => setShowAddModal(false)}
          onSaved={() => { setShowAddModal(false); refresh(); }}
        />
      )}

      {/* Main content */}
      <main className="max-w-7xl mx-auto px-4 py-6">
        {/* Error banner */}
        {error && (
          <div className="mb-5 bg-red-950/60 border border-red-800/60 rounded-xl px-4 py-3 text-red-300 text-sm flex justify-between items-center">
            <span>⚠️ {error}</span>
            <button onClick={() => setError(null)} className="text-red-500 hover:text-red-300 ml-4 text-lg leading-none">✕</button>
          </div>
        )}

        {/* Loading */}
        {loadingDetail && !detail && (
          <div className="flex items-center justify-center py-20">
            <div className="flex flex-col items-center gap-3">
              <div className="w-8 h-8 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
              <span className="text-slate-500 text-sm">Carregando dados...</span>
            </div>
          </div>
        )}

        {/* Tab content */}
        {detail && (
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
            >
              {activeTab === 'resumo' && (
                <TabResumo detail={detail} onEditFatura={refresh} />
              )}
              {activeTab === 'receitas' && (
                <TabReceitas incomes={detail.cycle.incomeItems} />
              )}
              {activeTab === 'receber' && (
                <TabValoresReceber entries={detail.cycle.expenseEntries} />
              )}
              {activeTab === 'nubank' && (
                <TabNubank detail={detail} onUpdated={refresh} />
              )}
              {activeTab === 'piques' && (
                <TabPiques detail={detail} onUpdated={refresh} />
              )}
              {activeTab === 'amazon' && (
                <TabAmazon detail={detail} onUpdated={refresh} />
              )}
            </motion.div>
          </AnimatePresence>
        )}
      </main>
    </div>
  );
}
