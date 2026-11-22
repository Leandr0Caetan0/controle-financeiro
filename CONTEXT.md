# CaetanoFinanças — Contexto do Projeto

## O que é

Aplicação web para **controle financeiro pessoal** do Leandro Caetano da Silva, substituindo uma planilha Google Sheets que ele usa há anos. O app replica a lógica da planilha com fidelidade total — mesmos cálculos, mesmos valores, mesma "Prova Real" do Nubank Ultra.

---

## Stack Tecnológica

| Camada | Tecnologia |
|--------|-----------|
| Frontend | Vite + React 19 + TypeScript + Tailwind CSS v4.0.9 |
| Backend | .NET 10 (Web API com Controllers clássicos, `[ApiController]`) |
| Banco de dados | SQLite + EF Core 10 (WAL mode) |
| Gráficos | Recharts 3 + Framer Motion 14 |
| Deploy Frontend | Vercel (`controle-financeiro-sigma-drab.vercel.app`) |
| Deploy Backend | Fly.io — **pendente** (grátis, região São Paulo `gru`) |

---

## Estrutura de Pastas

```
controle-financeiro/
├── app/                        # Frontend React/Vite
│   ├── src/
│   │   ├── api/client.ts       # HTTP client (usa VITE_API_URL em prod)
│   │   ├── types/api.ts        # Tipos TypeScript espelhando o JSON da API
│   │   ├── vite-env.d.ts       # Tipos de import.meta.env
│   │   ├── components/
│   │   │   ├── tabs/           # Abas do dashboard (6 componentes)
│   │   │   │   ├── TabResumo.tsx         # KPIs, gauge semi-circular, donut por fonte, barras obrigações, Prova Real
│   │   │   │   ├── TabReceitas.tsx       # Donut + barras por fonte de renda + lista detalhada
│   │   │   │   ├── TabValoresReceber.tsx # Donut + barras por pessoa + listas (Xus, Jaum, Tia, Geovane, Elvis)
│   │   │   │   ├── TabNubank.tsx         # KPIs fatura/meus gastos/terceiros, donut/barras por tag, lista com delete, edit fatura inline
│   │   │   │   ├── TabPiques.tsx         # Donut + barras por categoria + lista Dinheiro/Pix com delete
│   │   │   │   └── TabAmazon.tsx         # KPIs, donut + barras por categoria, parcelas fixas, lista com delete
│   │   │   ├── AddEntryModal.tsx         # 3 modos: ⚡ Rápido, 📋 Guiado, 📄 Lote
│   │   │   └── CsvImportModal.tsx        # Importar CSV/Google Sheets
│   │   ├── lib/fmt.ts          # brl(), CHART_COLORS, CATEGORY_COLORS, TAG_PREFIXES, SOURCE_COLORS (dark)
│   │   └── lib/parser.ts       # Parser de comandos rápidos e faturas coladas
│   ├── .env.example            # VITE_API_URL=https://sua-api.fly.dev (SEM /api no final)
│   └── vite.config.ts          # Proxy /api → localhost:5148 (dev apenas)
│
├── src/CaetanoFinancas.Api/    # Backend .NET 10
│   ├── Entities/               # MonthCycle, IncomeItem, FixedObligation, ExpenseEntry, ThirdPartyPerson
│   ├── Infrastructure/
│   │   ├── AppDbContext.cs
│   │   └── DbSeeder.cs         # Seed Jul-Dez 2026 — Nubank até 21/11, Piques até 20/11, novas entradas de Xus
│   ├── Services/
│   │   └── FinancialCalculationService.cs
│   ├── Controllers/
│   │   ├── CyclesController.cs            # /api/cycles: CRUD + POST /next (clonar mês)
│   │   ├── ImportController.cs            # POST /api/import/csv
│   │   ├── MonthCyclesController.cs       # /api/month-cycles (legado)
│   │   └── ThirdPartyPersonsController.cs # /api/third-party-persons
│   ├── Dtos/                   # CycleDtos.cs, ImportDtos.cs (records)
│   └── Program.cs              # AddControllers, CORS, WAL, seed, JSON options
│
├── Dockerfile                  # Build multi-stage .NET 10, porta 8080
├── .dockerignore               # Exclui bin/obj, *.db, app/ da imagem
├── fly.toml                    # Fly.io config (gru/SP, volume /app/data, 256mb)
└── scripts/
    └── backup-sqlite.ps1       # Backup SQLite → Google Drive (PowerShell)
```

---

## Modelo de Dados

### MonthCycle
- **Id**: `"YYYY-MM"` (ex: `"2026-12"`)
- **Convenção importante**: "Dezembro/2026" = gastos feitos em Novembro, pagos em Dezembro
- **UltraInvoiceTotal**: fatura bruta do Nubank Ultra (editável inline na UI)
- **EmergencyReserveTarget**: meta de reserva (R$300)

### FixedObligation
- **SubtractFromUltraInvoice**: `true` → FullInvoiceAmount entra em TotalAssinaturas na Prova Real
- **IncludeInMyAccounts**: `false` → não entra no Saldo Livre (ex: Empréstimo Itaú)
- **CriticalAlert**: exibe alerta vermelho no topo (Punto Dia 5, Itaú Dia 22)

### ExpenseEntry
- **SubtractFromUltra**: `true` → entra em TotalTerceiros (gasto de terceiro que passa pela fatura)
- **InformationalOnly**: `true` → só rastreamento, fora de todos os cálculos
- **SubTag**: `J | U | C`
  - `[J]` = Júlio (marido da mãe da Xus) — paga via Xus → Leandro
  - `[U]` = Julia (cunhada)
  - `[C]` = Claudia/Sogra

### ThirdPartyPerson (IDs no banco)
`xus`, `jaum`, `sogra`, `julio`, `julia`, `tia`, `geovane`, `elvis`

---

## Lógica de Cálculo

### Prova Real (CalculateUltraReconciliation)
Replica a fórmula da planilha: `=B18-H11-H24-E5-E10-E11-(E6*2)-H36-H39-E9`

```
FaturaTotal (5000.64)
- TotalAssinaturas (SubtractFromUltraInvoice=true, usa FullInvoiceAmount)
  → Netflix full (59.90), Amazon Prime (19.90), YouTube (26.90), NuCel (30.00), WellHub (59.99)
  → Spotify e Disney+ AINDA NÃO estão na fórmula → SubtractFromUltraInvoice=false por enquanto
- TotalTerceiros (Source=NubankUltra, SubtractFromUltra=true, !InformationalOnly)
  → Xus Nu pessoal H11=369.84, Tia H24=280.55, Geovane H36=748.65, Elvis H39=1000
- TotalMeusGastos (Source=NubankUltra, SubtractFromUltra=false, !InformationalOnly)
  → 36 lançamentos pessoais = R$2.404,92
= Diferença: -R$0,01 → Status: Arredondamento ✓
```

### Saldo Livre (CalculateMonthSummary)
```
SaldoLivre = Receitas - TotalObrigacoesFixas - TotalGastosPorFonte - ReservaEmergencia
```
- **TotalObrigacoesFixas**: FixedObligations com `IncludeInMyAccounts=true`
- **TotalGastosPorFonte**: APENAS entries `!SubtractFromUltra && !InformationalOnly`
  - Terceiros (Xus, Tia, Geovane, Elvis) têm `SubtractFromUltra=true` → **não** entram
  - Apenas gastos próprios: Nubank (2404.92) + Amazon (1074.30) + Piques (413.98) = 3893.20

**Dezembro/2026**: Saldo = **-R$1.240,77** ✓

---

## Seed de Dados (Dezembro/2026)

| Item | Valor |
|------|-------|
| CLT Líquido Próprio | R$5.287,72 (férias parciais) |
| CFT Jaum | R$900,00 |
| Nu Fatura Total | R$5.000,64 |
| Gastos Amazon | R$1.074,30 (11 itens) |
| Gastos Piques | R$413,98 (4 itens: FII, ETF, Toyota, BBAS3) |
| Total Contas | R$7.428,49 |
| Saldo Livre | -R$1.240,77 |

Obrigações fixas mensais: Aluguel (800), Punto 13/23 (1340.78), Amazon Prime (19.90), Netflix ÷2 (29.95), Spotify ÷6 (6.82), Disney+ ÷4 (14.98), YouTube (26.90), NuCel (30), WellHub (59.99), Copel (267.87), Voxx (145), Sanepar (148.62), Óculos 3B 02/02 (122.50), Conserto Embreagem 04/10 (222)

---

## Frontend — Componentes

| Componente | Função |
|------------|--------|
| `AlertsPanel` | Alertas críticos (Punto Dia 5, Itaú Dia 22) |
| `UltraCard` | Prova Real com fatura editável inline |
| `SummaryCard` | Saldo Livre com indicador de reserva |
| `ExpenseList` | Lançamentos agrupados por fonte |
| `AddEntryModal` | 3 modos: ⚡ Rápido, 📋 Guiado, 📄 Lote |
| `CsvImportModal` | Importar CSV/Google Sheets |

- **Atalho**: `Ctrl+K` / `Cmd+K` → abre Lançamento Rápido
- **Cores**: Nubank=violet, Amazon=blue, Piques=amber, Boleto=slate
- **Tema**: claro (light), fundo slate-100, fontes Inter + JetBrains Mono

---

## Problemas Resolvidos (histórico)

1. **Prova Real não batia** → `CalculateMonthSummary` filtrado por `!SubtractFromUltra`
2. **Saldo Livre errado** → Voxx corrigido R$125→R$145, Óculos e Embreagem adicionados
3. **Enums como números no frontend** → `JsonStringEnumConverter` no Program.cs
4. **Referência circular JSON (500)** → `ReferenceHandler.IgnoreCycles`
5. **Tailwind CSS v4 crash no dev server** → pinado em v4.0.9, fontes em `:root` fora do `@theme`
6. **Vercel 404 para /api/*** → `VITE_API_URL` env var + CORS no backend
7. **Minimal APIs → Controllers clássicos** → `Endpoints/` removida; rotas e JSON idênticos.
9. **Dashboard redesenhado** → tema dark (`#0F1117`), fonte Plus Jakarta Sans + JetBrains Mono, 6 abas animadas com Recharts (donut, barras, gauge, área). `types/api.ts` e `vite-env.d.ts` recriados.
10. **Seed atualizado 22/11/2026** → Nubank até 21/11 (+R$725,81), Piques [CAR] Conserto Pneu +R$20, Xus +R$435,35 (Manga, Abacate, Vacina Lara).
   No `Program.cs` o JSON agora é configurado em `AddControllers().AddJsonOptions(...)`
   (`ConfigureHttpJsonOptions` só vale para Minimal APIs) e
   `SuppressImplicitRequiredAttributeForNonNullableReferenceTypes = true` evita 400 nas entidades com navegação.
8. **Prefixo `/api` em produção** → `BASE` em `client.ts` = `${VITE_API_URL}/api` (exportado e usado também no `CsvImportModal`).
   `VITE_API_URL` deve ser SEM `/api` no final.

---

## Estado do Deploy

| Serviço | Status | URL |
|---------|--------|-----|
| Frontend | ✅ Online | `controle-financeiro-sigma-drab.vercel.app` |
| Backend | ⏳ Pendente | Fly.io — `fly deploy` não feito ainda |

---

## Deploy Pendente — Fly.io (Backend)

### Pré-requisitos
```powershell
winget install flyio.flyctl
fly auth signup   # pede cartão para verificação, não cobra no free tier
```

### Comandos (na raiz do projeto)
```bash
git add . && git commit -m "deploy: controllers + Dockerfile + fly.toml" && git push
fly auth login
fly apps create caetano-financas-api     # se o nome estiver ocupado, mude `app` no fly.toml
fly volumes create data --region gru --size 1
fly deploy --ha=false                    # 1 máquina só (SQLite em volume)
fly status
```
Teste: `https://caetano-financas-api.fly.dev/api/cycles` deve devolver JSON.

### Vercel após o deploy
```
Settings → Environment Variables
VITE_API_URL = https://caetano-financas-api.fly.dev   (SEM /api no final)
→ Redeploy
```

### Observações
- Terminal da máquina nova: `git`/`dotnet` no cmd podem falhar com `'rtk' is not recognized`;
  usar `powershell -NoProfile -Command "..."`.
- `app/src/types/api.ts` e `app/src/vite-env.d.ts` NÃO estão versionados (o build `vite build` funciona,
  mas `npm run typecheck` falha). Recriar/commitar esses arquivos.
- Saldo Livre de Dez/2026 calculado hoje pela API: -R$1.240,79 (o valor -1.240,77 acima está desatualizado).

---

## Itens Pendentes / Próximos Passos

- [x] Migrar API para Controllers clássicos (build OK, 6/6 testes, smoke test OK)
- [x] Dashboard redesenhado: tema dark, Plus Jakarta Sans, 6 abas com Recharts + Framer Motion
- [x] Seed atualizado com dados reais de 22/11/2026
- [x] `app/src/types/api.ts` e `app/src/vite-env.d.ts` recriados e versionados
- [ ] **DEPLOY**: criar app + volume + `fly deploy --ha=false` + configurar VITE_API_URL no Vercel
- [ ] Ativar Spotify na Prova Real: `SubtractFromUltraInvoice=true`, `FullInvoiceAmount=40.90`
- [ ] Ativar Disney+ na Prova Real: `SubtractFromUltraInvoice=true`, `FullInvoiceAmount=59.90`
- [ ] Preencher `UltraInvoiceTotal` para Jul, Ago, Nov/2026 (atualmente = 0)
- [ ] Importar histórico de outros meses via botão 📥 CSV
- [ ] Backup automático: `scripts/backup-sqlite.ps1` (copia .db para Google Drive)

---

## Repositório

- GitHub: `https://github.com/Leandr0Caetan0/controle-financeiro`
- Branch: `main`
- Vercel: conectado ao GitHub (auto-deploy no push)
