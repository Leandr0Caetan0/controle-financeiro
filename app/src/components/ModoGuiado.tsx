import { useState } from 'react';
import type { ExpenseEntry, ExpenseSource, SubTag } from '../types/api';
import { SOURCE_COLORS, CATEGORY_COLORS } from '../lib/fmt';

const SOURCES: { key: ExpenseSource; short: string }[] = [
  { key: 'NubankUltra',  short: 'Ultra'  },
  { key: 'AmazonCard',   short: 'Amazon' },
  { key: 'Piques',       short: 'Piques' },
  { key: 'BoletoOutros', short: 'Boleto' },
];

const PEOPLE: { id: string; label: string; tag: SubTag | null; hasSubPeople?: boolean }[] = [
  { id: 'eu',    label: 'Eu',       tag: null                       },
  { id: 'xus',   label: 'Leticia',  tag: 'J', hasSubPeople: true   },
  { id: 'jaum',  label: 'Jaum',     tag: null                       },
  { id: 'sogra', label: 'Sogra',    tag: 'C'                        },
  { id: 'tia',   label: 'Tia/Gui',  tag: 'C'                        },
];

const XUS_SUB_PEOPLE: { id: string; label: string }[] = [
  { id: 'proprio', label: 'Dela própria' },
  { id: 'julio',   label: 'Julio'        },
  { id: 'claudia', label: 'Claudia'      },
  { id: 'biel',    label: 'Biel'         },
];

// Tags predefinidas agrupadas por categoria
const TAG_GROUPS: { group: string; tags: string[] }[] = [
  { group: 'Alimentação',    tags: ['Alimentação', 'Farmácia', 'Higiene', 'Bebê'] },
  { group: 'Transporte',     tags: ['Transporte', 'Carro', 'Moto'] },
  { group: 'Casa & Lazer',   tags: ['Casa', 'Entretenimento', 'Beleza', 'Vestuário'] },
  { group: 'Finanças',       tags: ['Investimento', 'Parcela', 'Repasse', 'Estorno', 'Empréstimo'] },
  { group: 'Saúde',          tags: ['Saúde'] },
  { group: 'Compras',        tags: ['Compras', 'Streaming', 'Telefonia', 'Outros'] },
];

const ALL_TAGS = TAG_GROUPS.flatMap(g => g.tags);

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
  const [xusSubPerson, setXusSubPerson] = useState('proprio');
  const [tag, setTag] = useState('Alimentação');
  const [customTag, setCustomTag] = useState('');
  const [showCustom, setShowCustom] = useState(false);
  const [subtractFromUltra, setSubtractFromUltra] = useState(false);
  const [informationalOnly, setInformationalOnly] = useState(false);
  const [installStr, setInstallStr] = useState('');

  function selectPerson(id: string, defaultTag: SubTag | null) {
    setOwnerId(id);
    setSubTag(defaultTag);
    setSubtractFromUltra(id !== 'eu' && source === 'NubankUltra');
    if (id !== 'xus') setXusSubPerson('proprio');
  }

  function handleSelectTag(t: string) {
    setTag(t);
    setShowCustom(false);
    setCustomTag('');
  }

  function handleCustomTag(v: string) {
    setCustomTag(v);
    setTag(v);
  }

  const effectiveTag = showCustom ? (customTag.trim() || 'Geral') : (tag || 'Geral');

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
      tag: effectiveTag,
      installmentCurrent: im ? parseInt(im[1]) : undefined,
      installmentTotal: im ? parseInt(im[2]) : undefined,
      subtractFromUltra,
      informationalOnly,
      criticalAlert: false,
      monthCycleId: cycleId,
    }]);
  }

  const isThirdParty = ownerId !== 'eu';
  const selectedPerson = PEOPLE.find(p => p.id === ownerId);

  return (
    <div className="flex flex-col gap-4">
      {/* Fonte */}
      <div>
        <label className="block text-xs text-slate-500 mb-1.5 uppercase tracking-wider font-medium">Fonte</label>
        <div className="grid grid-cols-4 gap-2">
          {SOURCES.map(s => {
            const sc = SOURCE_COLORS[s.key];
            const active = source === s.key;
            return (
              <button key={s.key} onClick={() => setSource(s.key)}
                className={`py-2 rounded-lg text-xs font-medium border transition-colors ${
                  active
                    ? `${sc.bg} ${sc.text} ${sc.border}`
                    : 'bg-slate-50 text-slate-500 border-slate-200 hover:border-slate-400 hover:text-slate-700'
                }`}
              >{s.short}</button>
            );
          })}
        </div>
      </div>

      {/* Pessoa */}
      <div>
        <label className="block text-xs text-slate-500 mb-1.5 uppercase tracking-wider font-medium">Pessoa</label>
        <div className="flex flex-wrap gap-2">
          {PEOPLE.map(p => {
            const active = ownerId === p.id;
            return (
              <button key={p.id} onClick={() => selectPerson(p.id, p.tag)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
                  active
                    ? 'bg-violet-50 border-violet-400 text-violet-700'
                    : 'bg-slate-50 border-slate-200 text-slate-600 hover:border-slate-400'
                }`}
              >
                {p.label}
              </button>
            );
          })}
        </div>

        {ownerId === 'xus' && (
          <div className="mt-2">
            <label className="block text-xs text-slate-400 mb-1">Pagando por quem?</label>
            <div className="flex flex-wrap gap-1.5">
              {XUS_SUB_PEOPLE.map(sp => (
                <button key={sp.id} onClick={() => setXusSubPerson(sp.id)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors ${
                    xusSubPerson === sp.id
                      ? 'bg-violet-100 border-violet-400 text-violet-700'
                      : 'bg-slate-50 border-slate-200 text-slate-500 hover:border-slate-400'
                  }`}
                >{sp.label}</button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Descrição + Valor */}
      <div className="grid grid-cols-3 gap-3">
        <div className="col-span-2">
          <label className="block text-xs text-slate-500 mb-1 uppercase tracking-wider font-medium">Descrição</label>
          <input value={description} onChange={e => setDescription(e.target.value)}
            placeholder="Ex: Ifood, Netflix, Uber..."
            className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-800 placeholder-slate-300 focus:outline-none focus:ring-2 focus:ring-violet-400 focus:border-violet-400 text-sm"
          />
        </div>
        <div>
          <label className="block text-xs text-slate-500 mb-1 uppercase tracking-wider font-medium">Valor (R$)</label>
          <input value={amountStr} onChange={e => setAmountStr(e.target.value)}
            placeholder="-50 ou 34,90"
            className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-800 placeholder-slate-300 focus:outline-none focus:ring-2 focus:ring-violet-400 focus:border-violet-400 mono text-sm"
          />
        </div>
      </div>

      {/* Tag (dropdown) + Parcela */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs text-slate-500 mb-1 uppercase tracking-wider font-medium">Tag</label>

          {/* Grid de tags rápidas */}
          {!showCustom ? (
            <div className="flex flex-wrap gap-1.5">
              {ALL_TAGS.map(t => {
                const color = CATEGORY_COLORS[t] ?? '#94A3B8';
                const active = tag === t;
                return (
                  <button
                    key={t}
                    onClick={() => handleSelectTag(t)}
                    className={`px-2 py-1 rounded-md text-xs font-medium border transition-all ${
                      active
                        ? 'text-white border-transparent shadow-sm'
                        : 'bg-slate-50 border-slate-200 text-slate-600 hover:border-slate-400'
                    }`}
                    style={active ? { background: color, borderColor: color } : {}}
                  >
                    {t}
                  </button>
                );
              })}
              <button
                onClick={() => { setShowCustom(true); setCustomTag(''); }}
                className="px-2 py-1 rounded-md text-xs font-medium border border-dashed border-slate-300 text-slate-400 hover:border-violet-400 hover:text-violet-600 transition-colors"
              >
                + outra
              </button>
            </div>
          ) : (
            <div className="flex gap-2 items-center">
              <input
                autoFocus
                value={customTag}
                onChange={e => handleCustomTag(e.target.value)}
                placeholder="Digite a tag..."
                className="flex-1 bg-slate-50 border border-violet-400 rounded-lg px-3 py-2 text-slate-800 placeholder-slate-300 focus:outline-none focus:ring-2 focus:ring-violet-400 text-sm"
              />
              <button
                onClick={() => { setShowCustom(false); if (!customTag.trim()) setTag(ALL_TAGS[0]); }}
                className="text-xs text-slate-400 hover:text-slate-600 px-1"
              >✕</button>
            </div>
          )}
        </div>

        <div>
          <label className="block text-xs text-slate-500 mb-1 uppercase tracking-wider font-medium">Parcela (ex: 2/6)</label>
          <input value={installStr} onChange={e => setInstallStr(e.target.value)}
            placeholder="2/6"
            className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-800 placeholder-slate-300 focus:outline-none focus:ring-2 focus:ring-violet-400 focus:border-violet-400 mono text-sm"
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
            activeClass="bg-violet-50 border-violet-400 text-violet-700"
          />
        )}
        <Toggle
          value={informationalOnly}
          onChange={setInformationalOnly}
          label="Apenas Informativo"
          activeClass="bg-slate-100 border-slate-400 text-slate-700"
        />
      </div>

      {/* Preview rápido */}
      {description.trim() && amountStr && (
        <div className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-500 flex items-center justify-between">
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-slate-700 font-medium truncate">{description}</span>
            <span
              className="px-1.5 py-0.5 rounded text-white text-xs flex-shrink-0"
              style={{ background: CATEGORY_COLORS[effectiveTag] ?? '#94A3B8' }}
            >
              {effectiveTag}
            </span>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0 ml-2">
            {selectedPerson && selectedPerson.id !== 'eu' && (
              <span className="bg-violet-100 text-violet-700 px-1.5 py-0.5 rounded">@{selectedPerson.label}</span>
            )}
            <span className="mono font-semibold text-slate-800">
              {isNaN(parseFloat(amountStr.replace(',', '.'))) ? '?' : `R$ ${parseFloat(amountStr.replace(',', '.')).toFixed(2)}`}
            </span>
          </div>
        </div>
      )}

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
      className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${value ? activeClass : 'bg-slate-50 border-slate-200 text-slate-500 hover:border-slate-400'}`}
    >
      {value ? '✓' : '○'} {label}
    </button>
  );
}
