import { useState, useRef } from 'react';
import { BASE } from '../api/client';

type Sheet = 'receitas' | 'obrigacoes' | 'lancamentos' | 'ultra';

interface ParsedCsv {
  headers: string[];
  rows: Record<string, string>[];
}

interface ImportResult { created: number; skipped: number; errors: string[]; }

interface Props { cycleId: string; onClose: () => void; onImported: () => void; }

const SHEET_INFO: Record<Sheet, { label: string; cols: string }> = {
  receitas:    { label: '💰 Receitas',         cols: 'titulo, valor, categoria, recorrencia, dia' },
  obrigacoes:  { label: '📋 Obrigações Fixas', cols: 'titulo, valor, vencimento, fonte, parcela (13/23), abater_ultra' },
  lancamentos: { label: '💳 Lançamentos',      cols: 'descricao, valor, data (dd/MM/yyyy), fonte, dono, subtag, tag' },
  ultra:       { label: '🟣 Fatura Ultra',     cols: 'total' },
};

function parseCsv(text: string): ParsedCsv {
  const lines = text.trim().split('\n').filter(Boolean);
  if (lines.length < 2) return { headers: [], rows: [] };
  const sep = lines[0].includes('\t') ? '\t' : ',';
  const clean = (s: string) => s.trim().replace(/^["']|["']$/g, '');
  const headers = lines[0].split(sep).map(clean);
  const rows = lines.slice(1).map(line => {
    const cells = line.split(sep).map(clean);
    const row: Record<string, string> = {};
    headers.forEach((h, i) => { row[h] = cells[i] ?? ''; });
    return row;
  });
  return { headers, rows };
}

export function CsvImportModal({ cycleId, onClose, onImported }: Props) {
  const [sheet, setSheet] = useState<Sheet>('lancamentos');
  const [csvText, setCsvText] = useState('');
  const [parsed, setParsed] = useState<ParsedCsv | null>(null);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  function handleAnalyze() {
    if (!csvText.trim()) return;
    setParsed(parseCsv(csvText));
    setResult(null);
    setError(null);
  }

  function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      const text = ev.target?.result as string;
      setCsvText(text);
      setParsed(parseCsv(text));
    };
    reader.readAsText(file, 'UTF-8');
  }

  async function handleImport() {
    if (!parsed || parsed.rows.length === 0) return;
    setImporting(true);
    setError(null);
    try {
      const res = await fetch(`${BASE}/import/csv`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cycleId, sheet, rows: parsed.rows }),
      });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json() as ImportResult;
      setResult(data);
      if (data.created > 0) onImported();
    } catch (err: unknown) {
      setError(String(err));
    } finally {
      setImporting(false);
    }
  }

  const info = SHEET_INFO[sheet];
  const SHEETS: Sheet[] = ['receitas', 'obrigacoes', 'lancamentos', 'ultra'];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-3xl bg-white border border-slate-200 rounded-2xl shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100 flex-shrink-0">
          <h2 className="font-bold text-slate-800 text-sm">📥 Importar CSV / Google Sheets</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700 text-lg leading-none px-1">✕</button>
        </div>

        <div className="overflow-y-auto flex-1 px-5 py-4 flex flex-col gap-4">
          {/* Seleção de aba */}
          <div>
            <label className="block text-xs text-slate-500 mb-1.5 uppercase tracking-wider font-medium">Aba da Planilha</label>
            <div className="flex gap-2 flex-wrap">
              {SHEETS.map(s => (
                <button key={s} onClick={() => setSheet(s)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                    sheet === s
                      ? 'bg-violet-50 border-violet-400 text-violet-700'
                      : 'bg-slate-50 border-slate-200 text-slate-500 hover:border-slate-400 hover:text-slate-700'
                  }`}
                >{SHEET_INFO[s].label}</button>
              ))}
            </div>
            <p className="mt-1.5 text-slate-400 text-xs">Colunas esperadas: <span className="text-slate-500 font-medium">{info.cols}</span></p>
          </div>

          {/* Upload ou colar */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs text-slate-500 uppercase tracking-wider font-medium">CSV / TSV</label>
              <div className="flex gap-2">
                <button onClick={() => fileRef.current?.click()}
                  className="text-xs text-violet-600 hover:text-violet-700 border border-violet-300 rounded px-2 py-0.5 hover:bg-violet-50 transition-colors">
                  📂 Abrir arquivo
                </button>
                <input ref={fileRef} type="file" accept=".csv,.tsv,.txt" className="hidden" onChange={handleFileUpload} />
              </div>
            </div>
            <textarea
              value={csvText}
              onChange={e => { setCsvText(e.target.value); setParsed(null); }}
              rows={6}
              placeholder={`Cole aqui o CSV exportado do Google Sheets...\n\nExemplo para ${sheet}:\n${sheet === 'lancamentos' ? 'descricao,valor,data,fonte\nUber,34.90,15/12/2026,NubankUltra' : sheet === 'receitas' ? 'titulo,valor,categoria\nCLT Líquido,6336.05,Clt' : sheet === 'ultra' ? 'total\n6202.70' : 'titulo,valor,vencimento,fonte\nNetflix ÷2,22.45,10,NubankUltra'}`}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-800 placeholder-slate-300 focus:outline-none focus:ring-2 focus:ring-violet-400 focus:border-violet-400 font-mono text-xs resize-none"
            />
          </div>

          <button onClick={handleAnalyze} disabled={!csvText.trim()}
            className="self-start bg-slate-100 hover:bg-slate-200 disabled:opacity-40 text-slate-700 rounded-lg px-4 py-1.5 text-xs font-medium transition-colors border border-slate-200">
            🔍 Analisar
          </button>

          {/* Preview da tabela */}
          {parsed && parsed.rows.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs text-slate-500">{parsed.rows.length} linha(s) encontradas</span>
                <span className="text-xs text-slate-400">Colunas: {parsed.headers.join(', ')}</span>
              </div>
              <div className="overflow-x-auto rounded-lg border border-slate-200">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-slate-50">
                      {parsed.headers.map(h => (
                        <th key={h} className="text-left px-2 py-1.5 text-slate-500 font-medium border-b border-slate-200">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {parsed.rows.slice(0, 8).map((row, i) => (
                      <tr key={i} className="border-b border-slate-100 hover:bg-slate-50">
                        {parsed.headers.map(h => (
                          <td key={h} className="px-2 py-1.5 text-slate-700 font-mono truncate max-w-[140px]">{row[h]}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
                {parsed.rows.length > 8 && (
                  <div className="text-center text-slate-400 text-xs py-1.5 bg-slate-50">
                    + {parsed.rows.length - 8} linhas adicionais
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Erros e resultado */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-red-700 text-sm">{error}</div>
          )}

          {result && (
            <div className={`rounded-lg border px-3 py-2.5 text-sm ${result.errors.length > 0 ? 'bg-yellow-50 border-yellow-200 text-yellow-700' : 'bg-emerald-50 border-emerald-200 text-emerald-700'}`}>
              <div>✅ {result.created} criados · ⏭️ {result.skipped} ignorados</div>
              {result.errors.length > 0 && (
                <ul className="mt-1 text-red-600 text-xs list-disc list-inside">
                  {result.errors.map((e, i) => <li key={i}>{e}</li>)}
                </ul>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 px-5 py-3.5 border-t border-slate-100 flex-shrink-0">
          <button onClick={onClose} className="text-slate-500 hover:text-slate-700 text-sm px-4 py-2">Cancelar</button>
            <button
              onClick={() => { void handleImport(); }}
              disabled={importing || !parsed || parsed.rows.length === 0 || !!result}
              className="bg-violet-600 hover:bg-violet-500 disabled:opacity-40 text-white rounded-lg px-5 py-2 text-sm font-medium transition-colors flex items-center gap-2"
            >
              {importing ? (
                <>
                  <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Importando…
                </>
              ) : `📥 Importar ${parsed?.rows.length ?? 0} linha(s)`}
            </button>
        </div>
      </div>
    </div>
  );
}
