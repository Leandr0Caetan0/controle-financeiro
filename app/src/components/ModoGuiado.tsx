import { useState } from 'react';
import type { ExpenseEntry, ExpenseSource, SubTag } from '../types/api';
import { SOURCE_COLORS, SUBTAG_COLORS } from '../lib/fmt';

const SOURCES: { key: ExpenseSource; short: string }[] = [
  { key: 'NubankUltra',  short: 'Ultra'  },
  { key: 'AmazonCard',   short: 'Amazon' },
  { key: 'Piques',       short: 'Piques' },
  { key: 'BoletoOutros', short: 'Boleto' },
];

const PEOPLE: { id: string; label: string; tag: SubTag | null }[] = [
  { id: 'eu',    label: 'Eu',      tag: null },
  { id: 'xus',   label: 'Xus',     tag: 'J'  },
  { id: 'jaum',  label: 'Jaum',    tag: 'J'  },
  { id: 'sogra', label: 'Sogra',   tag: 'U'  },
  { id: 'tia',   label: 'Tia/Gui', tag: 'C'  },
];

interface Props {
  cycleId: string;
  saving: boolean;
  onSave: (entries: Partial<ExpenseEntry>[]) => void;
}

export function ModoGuiado({ cycleId, saving, onSave }: Props) {
  const [description, setDescription] = useState('');
  const [amountStr, setAmountStr] = useState('');
  const [source, setSource] = useState<ExpenseSource>('NubankUltra');
  const [ownerId, setOwnerId] = useState('eu');
  const [subTag, setSubTag] = useState<SubTag | null>(null);
  const [tag, setTag] = useState('');
  const [subtractFromUltra, setSubtractFromUltra] = useState(false);
  const [informationalOnly, setInformationalOnly] = useState(false);
  const [installStr, setInstallStr] = useState('');

  function selectPerson(id: string, defaultTag: SubTag | null) {
    setOwnerId(id);
    setSubTag(defaultTag);
    setSubtractFromUltra(id !== 'eu' && source === 'NubankUltra');
  }

  function handleSave() {
    const amount = parseFloat(amountStr.replace(',', '.'));
    if (isNaN(amount) || !description.trim()) return;
    const im = installStr.match(/^(\d+)\/(\d+)$/);
    onSave([{
      description: description.trim(),
      amount,
      date: new Date().toISOString().slice(0, 10),
      source,
      ownerId: ownerId === 'eu' ? undefined : ownerId,
      subTag: subTag ?? undefined,
      tag: tag.trim() || 'Geral',
      installmentCurrent: im ? parseInt(im[1]) : undefined,
      installmentTotal: im ? parseInt(im[2]) : undefined,
      subtractFromUltra,
      informationalOnly,
      criticalAlert: false,
      monthCycleId: cycleId,
    }]);
  }

  const isThirdParty = ownerId !== 'eu';

  return (
    <div className="flex flex-col gap-4">
      {/* Fonte */}
      <div>
        <label className="block text-xs text-zinc-500 mb-1.5 uppercase tracking-wider">Fonte</label>
        <div className="grid grid-cols-4 gap-2">
          {SOURCES.map(s => {
            const sc = SOURCE_COLORS[s.key];
            const active = source === s.key;
            return (
              <button key={s.key} onClick={() => setSource(s.key)}
                className={`py-2 rounded-lg text-xs font-medium border transition-colors ${active ? `${sc.bg} ${sc.text} ${sc.border}` : 'bg-zinc-800 text-zinc-500 border-zinc-700 hover:border-zinc-500'}`}
              >{s.short}</button>
            );
          })}
        </div>
      </div>

      {/* Pessoa */}
      <div>
        <label className="block text-xs text-zinc-500 mb-1.5 uppercase tracking-wider">Pessoa</label>
        <div className="flex flex-wrap gap-2">
          {PEOPLE.map(p => {
            const active = ownerId === p.id;
            const tagCls = p.tag ? (SUBTAG_COLORS[p.tag] ?? '') : '';
            return (
              <button key={p.id} onClick={() => selectPerson(p.id, p.tag)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors flex items-center gap-1 ${active ? 'bg-emerald-900/60 border-emerald-600 text-emerald-200' : 'bg-zinc-800 border-zinc-700 text-zinc-400 hover:border-zinc-500'}`}
              >
                {p.label}
                {p.tag && <span className={`text-xs mono font-bold ${tagCls}`}>[{p.tag}]</span>}
              </button>
            );
          })}
        </div>
      </div>

      {/* Descrição + Valor */}
      <div className="grid grid-cols-3 gap-3">
        <div className="col-span-2">
          <label className="block text-xs text-zinc-500 mb-1 uppercase tracking-wider">Descrição</label>
          <input value={description} onChange={e => setDescription(e.target.value)}
            placeholder="Ex: Ifood, Netflix, Uber..."
            className="w-full bg-zinc-800 border border-zinc-600 rounded-lg px-3 py-2 text-zinc-100 placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-violet-500 text-sm"
          />
        </div>
        <div>
          <label className="block text-xs text-zinc-500 mb-1 uppercase tracking-wider">Valor (R$)</label>
          <input value={amountStr} onChange={e => setAmountStr(e.target.value)}
            placeholder="-50 ou 34,90"
            className="w-full bg-zinc-800 border border-zinc-600 rounded-lg px-3 py-2 text-zinc-100 placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-violet-500 mono text-sm"
          />
        </div>
      </div>

      {/* Tag + Parcela */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs text-zinc-500 mb-1 uppercase tracking-wider">Tag</label>
          <input value={tag} onChange={e => setTag(e.target.value)}
            placeholder="Alimentação, Transporte…"
            className="w-full bg-zinc-800 border border-zinc-600 rounded-lg px-3 py-2 text-zinc-100 placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-violet-500 text-sm"
          />
        </div>
        <div>
          <label className="block text-xs text-zinc-500 mb-1 uppercase tracking-wider">Parcela (ex: 2/6)</label>
          <input value={installStr} onChange={e => setInstallStr(e.target.value)}
            placeholder="2/6"
            className="w-full bg-zinc-800 border border-zinc-600 rounded-lg px-3 py-2 text-zinc-100 placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-violet-500 mono text-sm"
          />
        </div>
      </div>

      {/* Toggles */}
      <div className="flex flex-wrap gap-3">
        {isThirdParty && source === 'NubankUltra' && (
          <Toggle
            value={subtractFromUltra}
            onChange={setSubtractFromUltra}
            label="Abater da Fatura Ultra"
            activeClass="bg-violet-900/60 border-violet-600 text-violet-200"
          />
        )}
        <Toggle
          value={informationalOnly}
          onChange={setInformationalOnly}
          label="Apenas Informativo"
          activeClass="bg-zinc-700 border-zinc-500 text-zinc-200"
        />
      </div>

      <button onClick={handleSave} disabled={saving || !description.trim() || !amountStr}
        className="w-full bg-violet-600 hover:bg-violet-500 disabled:opacity-40 text-white font-medium rounded-lg py-2.5 transition-colors text-sm"
      >{saving ? 'Salvando…' : '📋 Salvar Lançamento'}</button>
    </div>
  );
}

function Toggle({ value, onChange, label, activeClass }: {
  value: boolean;
  onChange: (v: boolean) => void;
  label: string;
  activeClass: string;
}) {
  return (
    <button onClick={() => onChange(!value)}
      className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${value ? activeClass : 'bg-zinc-800 border-zinc-700 text-zinc-500 hover:border-zinc-500'}`}
    >
      {value ? '✓' : '○'} {label}
    </button>
  );
}
