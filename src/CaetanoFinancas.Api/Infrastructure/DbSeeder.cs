using CaetanoFinancas.Api.Entities;
using Microsoft.EntityFrameworkCore;

namespace CaetanoFinancas.Api.Infrastructure;

/// <summary>
/// Seed inicial: Jul/2026 → Dez/2026 com dados reais de Dezembro.
/// Executado apenas se o banco estiver vazio.
/// </summary>
public static class DbSeeder
{
    private static readonly string[] MonthNames =
    [
        "Janeiro","Fevereiro","Março","Abril","Maio","Junho",
        "Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"
    ];

    public static async Task SeedAsync(AppDbContext db)
    {
        if (await db.MonthCycles.AnyAsync()) return;

        // ── Terceiros ──────────────────────────────────────────────────────
        var people = new List<ThirdPartyPerson>
        {
            new() { Id = "xus",     Name = "Xus",     Relationship = "Cônjuge",  DefaultDueDay = 10, IsRecurring = true  },
            new() { Id = "jaum",    Name = "Jaum",    Relationship = "Amigo",    DefaultDueDay = 10, IsRecurring = true  },
            new() { Id = "sogra",   Name = "Sogra",   Relationship = "Familiar", DefaultDueDay = 10, IsRecurring = true  },
            new() { Id = "geovane", Name = "Geovane", Relationship = "Amigo",    DefaultDueDay = 10, IsRecurring = false },
            new() { Id = "elvis",   Name = "Elvis",   Relationship = "Amigo",    DefaultDueDay = 10, IsRecurring = false },
        };
        db.ThirdPartyPersons.AddRange(people);

        // ── Ciclos Jul→Dez 2026 ───────────────────────────────────────────
        for (int month = 7; month <= 12; month++)
        {
            var cycleId = $"2026-{month:D2}";
            var refDate = new DateOnly(2026, month, 1);
            var label = $"{MonthNames[month - 1]} 2026";

            var cycle = new MonthCycle
            {
                Id = cycleId,
                Label = label,
                ReferencePeriod = refDate,
                UltraInvoiceTotal = month == 12 ? 1_823.47m : 0m,
                EmergencyReserveTarget = 500m
            };
            db.MonthCycles.Add(cycle);

            // Receitas padrão (todos os meses)
            db.IncomeItems.Add(new IncomeItem
            {
                Title = "CLT Líquido",
                Category = IncomeCategory.Clt,
                Amount = 6_336.05m,
                Recurrence = Recurrence.Mensal,
                ReceivedDay = 5,
                MonthCycleId = cycleId
            });
            db.IncomeItems.Add(new IncomeItem
            {
                Title = "CFT Jaum",
                Category = IncomeCategory.Cft,
                Amount = 900.00m,
                Recurrence = Recurrence.Mensal,
                ReceivedDay = 10,
                MonthCycleId = cycleId
            });

            // Obrigações fixas aplicáveis a todos os meses
            SeedCommonObligations(db, cycleId, month);

            // Lançamentos específicos de Dezembro
            if (month == 12)
            {
                SeedDecemberEntries(db, cycleId);
            }
        }

        await db.SaveChangesAsync();
    }

    // ── Obrigações fixas comuns (assinaturas rateadas + financiamento) ────

    private static void SeedCommonObligations(AppDbContext db, string cycleId, int month)
    {
        // Financiamento Fiat Punto — Pix Valdete (13/23 em Dez/2026)
        // Dez=13, Nov=12, Out=11 … Jul=8
        int puntoInstallment = month - 4; // Jul=3, Ago=4 … Dez=8 → ajuste para 13 em Dez
        // Recalcular: se Dez=13, então: installment = 13 - (12 - month) = month + 1
        puntoInstallment = month + 1; // Jul=8, Ago=9, Set=10, Out=11, Nov=12, Dez=13
        db.FixedObligations.Add(new FixedObligation
        {
            Title = "Financiamento Fiat Punto — Pix Valdete",
            Amount = 583.00m,
            DueDay = 5,
            Source = ExpenseSource.Piques,
            Category = "Financiamento",
            InstallmentCurrent = puntoInstallment,
            InstallmentTotal = 23,
            SubtractFromUltraInvoice = false,
            CriticalAlert = false,
            IncludeInMyAccounts = true,
            Paid = false,
            MonthCycleId = cycleId
        });

        // Netflix ÷ 2 (SubtractFromUltraInvoice=true: valor cheio aparece na fatura Ultra)
        db.FixedObligations.Add(new FixedObligation
        {
            Title = "Netflix (÷2)",
            Amount = 22.45m,          // minha parte
            FullInvoiceAmount = 44.90m, // valor cheio na fatura
            SplitPeople = 2,
            DueDay = 10,
            Source = ExpenseSource.NubankUltra,
            Category = "Streaming",
            SubtractFromUltraInvoice = true,
            CriticalAlert = false,
            IncludeInMyAccounts = true,
            Paid = false,
            MonthCycleId = cycleId
        });

        // Spotify ÷ 6
        db.FixedObligations.Add(new FixedObligation
        {
            Title = "Spotify (÷6)",
            Amount = 4.48m,
            FullInvoiceAmount = 26.90m,
            SplitPeople = 6,
            DueDay = 10,
            Source = ExpenseSource.NubankUltra,
            Category = "Streaming",
            SubtractFromUltraInvoice = true,
            CriticalAlert = false,
            IncludeInMyAccounts = true,
            Paid = false,
            MonthCycleId = cycleId
        });

        // Disney+ ÷ 4
        db.FixedObligations.Add(new FixedObligation
        {
            Title = "Disney+ (÷4)",
            Amount = 8.48m,
            FullInvoiceAmount = 33.90m,
            SplitPeople = 4,
            DueDay = 10,
            Source = ExpenseSource.NubankUltra,
            Category = "Streaming",
            SubtractFromUltraInvoice = true,
            CriticalAlert = false,
            IncludeInMyAccounts = true,
            Paid = false,
            MonthCycleId = cycleId
        });

        // Empréstimo Itaú Tia/Gui — apenas informativo + alerta crítico
        // Em Dez=32, calcula para meses anteriores
        int itauInstallment = 32 - (12 - month); // Dez=32, Nov=31 … Jul=27
        db.FixedObligations.Add(new FixedObligation
        {
            Title = "Empréstimo Itaú Tia/Gui",
            Amount = 1_235.00m,
            DueDay = 22,
            Source = ExpenseSource.BoletoOutros,
            Category = "Empréstimo",
            InstallmentCurrent = itauInstallment,
            InstallmentTotal = 54,
            SubtractFromUltraInvoice = false,
            CriticalAlert = true,
            IncludeInMyAccounts = false, // informacional: não entra no saldo
            Paid = false,
            MonthCycleId = cycleId
        });

        // Wellhub Sogra
        db.FixedObligations.Add(new FixedObligation
        {
            Title = "Wellhub Sogra",
            Amount = 89.90m,
            DueDay = 10,
            Source = ExpenseSource.NubankUltra,
            Category = "Saúde",
            SubtractFromUltraInvoice = false,
            CriticalAlert = false,
            IncludeInMyAccounts = true,
            Paid = false,
            MonthCycleId = cycleId
        });
    }

    // ── Lançamentos específicos de Dezembro/2026 ─────────────────────────

    private static void SeedDecemberEntries(AppDbContext db, string cycleId)
    {
        var dec = new DateOnly(2026, 12, 1);

        // Xus [J] — cota Disney+ de Xus (3/4 do valor cheio - minha parte)
        // Minha parte = 1/4 de R$33,90 = R$8,48; as outras 3 cotas = R$25,42
        db.ExpenseEntries.Add(new ExpenseEntry
        {
            Description = "Disney+ [J] Xus",
            Amount = 25.42m,
            Date = dec,
            DueDay = 10,
            Source = ExpenseSource.NubankUltra,
            OwnerId = "xus",
            SubTag = Entities.SubTag.J,
            Tag = "Streaming",
            SubtractFromUltra = true,
            InformationalOnly = false,
            CriticalAlert = false,
            MonthCycleId = cycleId
        });

        // Jaum [J] — cota Spotify de Jaum (não abatido = SubtractFromUltra=false)
        // Jaum paga a própria parte mas o lançamento fica registrado sem abater da fatura
        db.ExpenseEntries.Add(new ExpenseEntry
        {
            Description = "Spotify [J] Jaum (não abatido)",
            Amount = 22.42m,
            Date = dec,
            DueDay = 10,
            Source = ExpenseSource.NubankUltra,
            OwnerId = "jaum",
            SubTag = Entities.SubTag.J,
            Tag = "Streaming",
            SubtractFromUltra = false,
            InformationalOnly = false,
            CriticalAlert = false,
            MonthCycleId = cycleId
        });

        // Jaum — cerveja (abatimento negativo: Jaum devolveu dinheiro de cerveja)
        db.ExpenseEntries.Add(new ExpenseEntry
        {
            Description = "Cerveja [J] Jaum (abatimento)",
            Amount = -50.00m,
            Date = dec,
            DueDay = null,
            Source = ExpenseSource.Piques,
            OwnerId = "jaum",
            SubTag = Entities.SubTag.J,
            Tag = "Alimentação",
            SubtractFromUltra = false,
            InformationalOnly = false,
            CriticalAlert = false,
            MonthCycleId = cycleId
        });

        // Sogra — Wellhub (já como FixedObligation, mas aqui registramos o repasse como lançamento)
        db.ExpenseEntries.Add(new ExpenseEntry
        {
            Description = "Wellhub Sogra (repasse Dez)",
            Amount = 89.90m,
            Date = dec,
            DueDay = 10,
            Source = ExpenseSource.NubankUltra,
            OwnerId = "sogra",
            SubTag = Entities.SubTag.U,
            Tag = "Saúde",
            SubtractFromUltra = true,
            InformationalOnly = false,
            CriticalAlert = false,
            MonthCycleId = cycleId
        });

        // Geovane — R$1.000
        db.ExpenseEntries.Add(new ExpenseEntry
        {
            Description = "Repasse Geovane",
            Amount = 1_000.00m,
            Date = dec,
            DueDay = 10,
            Source = ExpenseSource.Piques,
            OwnerId = "geovane",
            SubTag = Entities.SubTag.C,
            Tag = "Repasse",
            SubtractFromUltra = false,
            InformationalOnly = false,
            CriticalAlert = false,
            MonthCycleId = cycleId
        });

        // Elvis — R$1.000
        db.ExpenseEntries.Add(new ExpenseEntry
        {
            Description = "Repasse Elvis",
            Amount = 1_000.00m,
            Date = dec,
            DueDay = 10,
            Source = ExpenseSource.Piques,
            OwnerId = "elvis",
            SubTag = Entities.SubTag.C,
            Tag = "Repasse",
            SubtractFromUltra = false,
            InformationalOnly = false,
            CriticalAlert = false,
            MonthCycleId = cycleId
        });

        // Empréstimo Itaú Tia/Gui — lançamento informacional no mês de Dez
        // (além da FixedObligation, registra como ExpenseEntry informacional para aparecer nos resumos)
        db.ExpenseEntries.Add(new ExpenseEntry
        {
            Description = "Empréstimo Itaú Tia/Gui — Dia 22 (32/54)",
            Amount = 1_235.00m,
            Date = new DateOnly(2026, 12, 22),
            DueDay = 22,
            Source = ExpenseSource.BoletoOutros,
            OwnerId = null,
            SubTag = null,
            Tag = "Empréstimo",
            SubtractFromUltra = false,
            InformationalOnly = true,
            CriticalAlert = true,
            MonthCycleId = cycleId
        });
    }
}
