using CaetanoFinancas.Api.Entities;
using Microsoft.EntityFrameworkCore;

namespace CaetanoFinancas.Api.Infrastructure;

/// <summary>
/// Seed inicial: Jul/2026 → Dez/2026 com dados reais da planilha Controle Financeiro.
/// NOTA: Para re-executar, apague caetanofinancas.db antes de iniciar a API.
/// </summary>
public static class DbSeeder
{
    private static readonly string[] MonthNames =
    [
        "Janeiro","Fevereiro","Março","Abril","Maio","Junho",
        "Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"
    ];

    // UltraInvoiceTotal por mês (fatura bruta Nubank Ultra – deixe 0 se desconhecido)
    private static readonly Dictionary<int, decimal> UltraTotals = new()
    {
        { 7,  0m        }, // Julho   – preencher
        { 8,  0m        }, // Agosto  – preencher
        { 9,  6_236.32m }, // Setembro – visível na planilha
        { 10, 7_994.01m }, // Outubro  – visível na planilha
        { 11, 0m        }, // Novembro – preencher
        { 12, 4_699.79m }, // Dezembro – aprox. da planilha
    };

    public static async Task SeedAsync(AppDbContext db)
    {
        if (await db.MonthCycles.AnyAsync()) return;

        // ── Terceiros ─────────────────────────────────────────────────────────
        // [J] = Júlio  (marido da mãe da Xus – paga coisas via Xus → Leandro)
        // [U] = Julia  (cunhada)
        // [C] = Claudia/Sogra
        var people = new List<ThirdPartyPerson>
        {
            new() { Id = "xus",     Name = "Xus (Letícia)",   Relationship = "Cônjuge/Amiga",  DefaultDueDay = 9,  IsRecurring = true  },
            new() { Id = "jaum",    Name = "Jaum (João Paulo)",Relationship = "Amigo",          DefaultDueDay = 9,  IsRecurring = true  },
            new() { Id = "sogra",   Name = "Sogra (Claudia)",  Relationship = "Familiar [C]",   DefaultDueDay = 9,  IsRecurring = true  },
            new() { Id = "julio",   Name = "Júlio",            Relationship = "Familiar Xus [J]",DefaultDueDay = null, IsRecurring = true  },
            new() { Id = "julia",   Name = "Julia (U)",        Relationship = "Cunhada [U]",    DefaultDueDay = null, IsRecurring = false },
            new() { Id = "tia",     Name = "Tia/Gui",          Relationship = "Familiar",       DefaultDueDay = 9,  IsRecurring = true  },
            new() { Id = "geovane", Name = "Geovane",          Relationship = "Amigo",          DefaultDueDay = 9,  IsRecurring = false },
            new() { Id = "elvis",   Name = "Elvis",            Relationship = "Amigo",          DefaultDueDay = 9,  IsRecurring = false },
        };
        db.ThirdPartyPersons.AddRange(people);

        // ── Ciclos Jul→Dez 2026 ──────────────────────────────────────────────
        for (int month = 7; month <= 12; month++)
        {
            var cycleId = $"2026-{month:D2}";
            var refDate = new DateOnly(2026, month, 1);
            var label   = $"{MonthNames[month - 1]} 2026";

            db.MonthCycles.Add(new MonthCycle
            {
                Id                    = cycleId,
                Label                 = label,
                ReferencePeriod       = refDate,
                UltraInvoiceTotal     = UltraTotals[month],
                EmergencyReserveTarget = 300.00m,   // R$300 conforme planilha
            });

            // ── Receitas padrão ──────────────────────────────────────────────
            if (month == 11)
            {
                // Novembro: mês de Férias + Vale (recibo anexado)
                db.IncomeItems.Add(new IncomeItem { Title = "Férias + Vale",   Category = IncomeCategory.Ferias, Amount = 11_083.05m, Recurrence = Recurrence.Pontual, ReceivedDay = 1,  MonthCycleId = cycleId });
                db.IncomeItems.Add(new IncomeItem { Title = "CFT Jaum",        Category = IncomeCategory.Cft,    Amount = 900.00m,    Recurrence = Recurrence.Mensal,  ReceivedDay = 9,  MonthCycleId = cycleId });
                db.IncomeItems.Add(new IncomeItem { Title = "Salário Parcial", Category = IncomeCategory.Clt,    Amount = 2_284.24m,  Recurrence = Recurrence.Pontual, ReceivedDay = 15, MonthCycleId = cycleId });
            }
            else if (month == 8)
            {
                // Agosto: mês com PPR/PLR
                db.IncomeItems.Add(new IncomeItem { Title = "CLT Líquido", Category = IncomeCategory.Clt,    Amount = 6_336.05m, Recurrence = Recurrence.Mensal,  ReceivedDay = 5,  MonthCycleId = cycleId });
                db.IncomeItems.Add(new IncomeItem { Title = "CFT Jaum",    Category = IncomeCategory.Cft,    Amount = 900.00m,   Recurrence = Recurrence.Mensal,  ReceivedDay = 9,  MonthCycleId = cycleId });
                db.IncomeItems.Add(new IncomeItem { Title = "PPR",         Category = IncomeCategory.Ppr,    Amount = 1_066.78m, Recurrence = Recurrence.Pontual, ReceivedDay = 10, MonthCycleId = cycleId });
            }
            else
            {
                // Padrão (Jul, Set, Out, Dez) = CLT + CFT Jaum
                db.IncomeItems.Add(new IncomeItem { Title = "CLT Líquido", Category = IncomeCategory.Clt, Amount = 6_336.05m, Recurrence = Recurrence.Mensal, ReceivedDay = 5, MonthCycleId = cycleId });
                db.IncomeItems.Add(new IncomeItem { Title = "CFT Jaum",    Category = IncomeCategory.Cft, Amount = 900.00m,   Recurrence = Recurrence.Mensal, ReceivedDay = 9, MonthCycleId = cycleId });
            }

            // ── Obrigações fixas ─────────────────────────────────────────────
            SeedObligations(db, cycleId, month);

            // ── Lançamentos específicos de Dezembro/2026 ─────────────────────
            if (month == 12) SeedDecemberEntries(db, cycleId);
        }

        await db.SaveChangesAsync();
    }

    private static void SeedObligations(AppDbContext db, string cycleId, int month)
    {
        // Parcelas: Punto → Dec=13, Nov=12... Jul=8 → parcela = month+1
        // Itaú    → Dec=32, Nov=31... Jul=27 → parcela = 32-(12-month)
        int puntoInst = month + 1;
        int itauInst  = 32 - (12 - month);

        // ── Aluguel ──────────────────────────────────────────────────────────
        db.FixedObligations.Add(new FixedObligation
        {
            Title = "Aluguel - Venc. dia 10", Amount = 800.00m, DueDay = 10,
            Source = ExpenseSource.Piques, Category = "Moradia",
            SubtractFromUltraInvoice = false, CriticalAlert = false, IncludeInMyAccounts = true, Paid = false, MonthCycleId = cycleId
        });

        // ── Financiamento Punto – Pix Valdete (Dia 5) ────────────────────────
        db.FixedObligations.Add(new FixedObligation
        {
            Title = $"Financiamento Punto — Pix Valdete",
            Amount = 1_340.78m, DueDay = 5, Source = ExpenseSource.Piques, Category = "Financiamento",
            InstallmentCurrent = puntoInst, InstallmentTotal = 23,
            SubtractFromUltraInvoice = false, CriticalAlert = true, IncludeInMyAccounts = true, Paid = false, MonthCycleId = cycleId
        });

        // ── Assinaturas rateadas (SubtractFromUltraInvoice=true: valor cheio aparece na fatura) ──

        // Amazon Prime – Dia 02 (só minha)
        db.FixedObligations.Add(new FixedObligation
        {
            Title = "Amazon Prime — Dia 02", Amount = 19.90m, FullInvoiceAmount = 19.90m,
            DueDay = 2, Source = ExpenseSource.NubankUltra, Category = "Streaming",
            SubtractFromUltraInvoice = true, CriticalAlert = false, IncludeInMyAccounts = true, Paid = false, MonthCycleId = cycleId
        });

        // Netflix ÷ 2 — Dia 12 (eu + Xus/esposa)
        db.FixedObligations.Add(new FixedObligation
        {
            Title = "Netflix (÷2) — Dia 12", Amount = 29.95m, FullInvoiceAmount = 59.90m, SplitPeople = 2,
            DueDay = 12, Source = ExpenseSource.NubankUltra, Category = "Streaming",
            SubtractFromUltraInvoice = true, CriticalAlert = false, IncludeInMyAccounts = true, Paid = false, MonthCycleId = cycleId
        });

        // Spotify ÷ 6 — Dia 20 (eu + 5 amigos; Jaum paga a cota dele separado)
        db.FixedObligations.Add(new FixedObligation
        {
            Title = "Spotify (÷6) — Dia 20", Amount = 6.82m, FullInvoiceAmount = 40.90m, SplitPeople = 6,
            DueDay = 20, Source = ExpenseSource.NubankUltra, Category = "Streaming",
            SubtractFromUltraInvoice = true, CriticalAlert = false, IncludeInMyAccounts = true, Paid = false, MonthCycleId = cycleId
        });

        // Disney+ ÷ 4 — Dia 23 (Meli+)
        db.FixedObligations.Add(new FixedObligation
        {
            Title = "Disney+ (÷4) — Dia 23", Amount = 14.98m, FullInvoiceAmount = 59.92m, SplitPeople = 4,
            DueDay = 23, Source = ExpenseSource.NubankUltra, Category = "Streaming",
            SubtractFromUltraInvoice = true, CriticalAlert = false, IncludeInMyAccounts = true, Paid = false, MonthCycleId = cycleId
        });

        // YouTube Premium — Dia 18
        db.FixedObligations.Add(new FixedObligation
        {
            Title = "YouTube Premium — Dia 18", Amount = 26.90m, FullInvoiceAmount = 26.90m,
            DueDay = 18, Source = ExpenseSource.NubankUltra, Category = "Streaming",
            SubtractFromUltraInvoice = true, CriticalAlert = false, IncludeInMyAccounts = true, Paid = false, MonthCycleId = cycleId
        });

        // NuCel — Dia 04
        db.FixedObligations.Add(new FixedObligation
        {
            Title = "NuCel — Dia 04", Amount = 30.00m, FullInvoiceAmount = 30.00m,
            DueDay = 4, Source = ExpenseSource.NubankUltra, Category = "Telefonia",
            SubtractFromUltraInvoice = true, CriticalAlert = false, IncludeInMyAccounts = true, Paid = false, MonthCycleId = cycleId
        });

        // WellHub — Dia 11 (minha parte)
        db.FixedObligations.Add(new FixedObligation
        {
            Title = "WellHub — Dia 11", Amount = 59.99m, FullInvoiceAmount = 59.99m,
            DueDay = 11, Source = ExpenseSource.NubankUltra, Category = "Saúde",
            SubtractFromUltraInvoice = true, CriticalAlert = false, IncludeInMyAccounts = true, Paid = false, MonthCycleId = cycleId
        });

        // Copel — Venc. 10
        db.FixedObligations.Add(new FixedObligation
        {
            Title = "Copel — Venc. 10", Amount = 267.87m, DueDay = 10,
            Source = ExpenseSource.BoletoOutros, Category = "Moradia",
            SubtractFromUltraInvoice = false, CriticalAlert = false, IncludeInMyAccounts = true, Paid = false, MonthCycleId = cycleId
        });

        // Internet Voxx — Venc. 11
        db.FixedObligations.Add(new FixedObligation
        {
            Title = "Internet Voxx — Venc. 11", Amount = 125.00m, DueDay = 11,
            Source = ExpenseSource.BoletoOutros, Category = "Moradia",
            SubtractFromUltraInvoice = false, CriticalAlert = false, IncludeInMyAccounts = true, Paid = false, MonthCycleId = cycleId
        });

        // Sanepar — Venc. 14
        db.FixedObligations.Add(new FixedObligation
        {
            Title = "Sanepar — Venc. 14", Amount = 148.62m, DueDay = 14,
            Source = ExpenseSource.BoletoOutros, Category = "Moradia",
            SubtractFromUltraInvoice = false, CriticalAlert = false, IncludeInMyAccounts = true, Paid = false, MonthCycleId = cycleId
        });

        // Empréstimo Itaú Tia/Gui — Dia 22 — ALERTA CRÍTICO (informacional)
        db.FixedObligations.Add(new FixedObligation
        {
            Title = $"Empréstimo Itaú Tia/Gui — Dia 22",
            Amount = 1_581.72m, DueDay = 22,
            Source = ExpenseSource.BoletoOutros, Category = "Empréstimo",
            InstallmentCurrent = itauInst, InstallmentTotal = 54,
            SubtractFromUltraInvoice = false, CriticalAlert = true,
            IncludeInMyAccounts = false, // informacional: boleto pago com dinheiro recebido da Tia
            Paid = false, MonthCycleId = cycleId
        });

        // WellHub Sogra (repasse mensal da Sogra)
        db.FixedObligations.Add(new FixedObligation
        {
            Title = "WellHub Sogra — Dia 11", Amount = 59.99m, FullInvoiceAmount = 59.99m,
            DueDay = 11, Source = ExpenseSource.NubankUltra, Category = "Saúde",
            SubtractFromUltraInvoice = false, // cobrado via terceiro, não entra na dedução direta
            CriticalAlert = false, IncludeInMyAccounts = true, Paid = false, MonthCycleId = cycleId
        });
    }

    private static void SeedDecemberEntries(AppDbContext db, string cycleId)
    {
        var dec = new DateOnly(2026, 12, 1);

        // [J] Disney+ de Xus (Júlio paga → Xus repassa → Leandro)
        // Valor = R$16,73 conforme planilha Dezembro/2026
        db.ExpenseEntries.Add(new ExpenseEntry
        {
            Description = "Disney+ [J] Xus", Amount = 16.73m, Date = dec, DueDay = 23,
            Source = ExpenseSource.NubankUltra, OwnerId = "xus", SubTag = Entities.SubTag.J,
            Tag = "Streaming", SubtractFromUltra = true, InformationalOnly = false, CriticalAlert = false,
            MonthCycleId = cycleId
        });

        // Spotify Jaum + Thais (2 cotas × R$6,82 = R$13,64 — NÃO abate da fatura pois Jaum paga separado)
        db.ExpenseEntries.Add(new ExpenseEntry
        {
            Description = "Spotify [J] Jaum + Thais (não abatido)", Amount = 13.64m, Date = dec, DueDay = 20,
            Source = ExpenseSource.NubankUltra, OwnerId = "jaum", SubTag = Entities.SubTag.J,
            Tag = "Streaming", SubtractFromUltra = false, InformationalOnly = false, CriticalAlert = false,
            MonthCycleId = cycleId
        });

        // WellHub Sogra (repasse Sogra → aparece na fatura Ultra de Leandro)
        db.ExpenseEntries.Add(new ExpenseEntry
        {
            Description = "WellHub Sogra (repasse Dez)", Amount = 59.99m, Date = dec, DueDay = 11,
            Source = ExpenseSource.NubankUltra, OwnerId = "sogra", SubTag = Entities.SubTag.C,
            Tag = "Saúde", SubtractFromUltra = true, InformationalOnly = false, CriticalAlert = false,
            MonthCycleId = cycleId
        });

        // Geovane — compras para o filho recém-nascido (Nubank)
        db.ExpenseEntries.Add(new ExpenseEntry
        {
            Description = "Repasse Geovane (nascimento filho)", Amount = 748.65m, Date = dec, DueDay = 9,
            Source = ExpenseSource.NubankUltra, OwnerId = "geovane", SubTag = Entities.SubTag.C,
            Tag = "Repasse", SubtractFromUltra = true, InformationalOnly = false, CriticalAlert = false,
            MonthCycleId = cycleId
        });

        // Elvis — R$1.000 no cartão
        db.ExpenseEntries.Add(new ExpenseEntry
        {
            Description = "Cartão Elvis", Amount = 1_000.00m, Date = dec, DueDay = 9,
            Source = ExpenseSource.NubankUltra, OwnerId = "elvis", SubTag = Entities.SubTag.C,
            Tag = "Repasse", SubtractFromUltra = true, InformationalOnly = false, CriticalAlert = false,
            MonthCycleId = cycleId
        });

        // Empréstimo Itaú Tia/Gui — APENAS INFORMATIVO (boleto externo, Dia 22)
        db.ExpenseEntries.Add(new ExpenseEntry
        {
            Description = "Empréstimo Itaú Tia/Gui — Dia 22 (32/54)",
            Amount = 1_581.72m, Date = new DateOnly(2026, 12, 22), DueDay = 22,
            Source = ExpenseSource.BoletoOutros, OwnerId = null, SubTag = null,
            Tag = "Empréstimo", InstallmentCurrent = 32, InstallmentTotal = 54,
            SubtractFromUltra = false, InformationalOnly = true, CriticalAlert = true,
            MonthCycleId = cycleId
        });

        // Tia/Gui — Nubank parcelado (Carro + Elisangela)
        db.ExpenseEntries.Add(new ExpenseEntry
        {
            Description = "Carro Tia/Gui (07/10)", Amount = 134.55m, Date = dec, DueDay = 9,
            Source = ExpenseSource.NubankUltra, OwnerId = "tia", SubTag = Entities.SubTag.C,
            Tag = "Parcela", InstallmentCurrent = 7, InstallmentTotal = 10,
            SubtractFromUltra = true, InformationalOnly = false, CriticalAlert = false,
            MonthCycleId = cycleId
        });
        db.ExpenseEntries.Add(new ExpenseEntry
        {
            Description = "Elisangela de Cassia Tia/Gui (01/03)", Amount = 146.00m, Date = dec, DueDay = 9,
            Source = ExpenseSource.NubankUltra, OwnerId = "tia", SubTag = Entities.SubTag.C,
            Tag = "Parcela", InstallmentCurrent = 1, InstallmentTotal = 3,
            SubtractFromUltra = true, InformationalOnly = false, CriticalAlert = false,
            MonthCycleId = cycleId
        });
    }
}
