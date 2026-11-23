using CaetanoFinancas.Api.Entities;
using Microsoft.EntityFrameworkCore;

namespace CaetanoFinancas.Api.Infrastructure;

/// <summary>
/// Seed inicial: Jul/2026 → Dez/2026 com dados reais da planilha Controle Financeiro.
/// NOTA: Para re-executar, apague caetanofinancas.db antes de iniciar a API.
/// Última atualização: 22/11/2026 — Nubank até 21/11, Piques até 20/11.
/// </summary>
public static class DbSeeder
{
    private static readonly string[] MonthNames =
    [
        "Janeiro","Fevereiro","Março","Abril","Maio","Junho",
        "Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"
    ];

    private static readonly Dictionary<int, decimal> UltraTotals = new()
    {
        { 7,  0m        },
        { 8,  0m        },
        { 9,  6_236.32m },
        { 10, 7_994.01m },
        { 11, 0m        },
        { 12, 6_202.70m },
    };

    public static async Task SeedAsync(AppDbContext db)
    {
        if (await db.MonthCycles.AnyAsync()) return;

        var people = new List<ThirdPartyPerson>
        {
            new() { Id = "xus",     Name = "Xus (Letícia)",    Relationship = "Cônjuge/Amiga",    DefaultDueDay = 9,  IsRecurring = true  },
            new() { Id = "jaum",    Name = "Jaum (João Paulo)", Relationship = "Amigo",            DefaultDueDay = 9,  IsRecurring = true  },
            new() { Id = "sogra",   Name = "Sogra (Claudia)",   Relationship = "Familiar [C]",     DefaultDueDay = 9,  IsRecurring = true  },
            new() { Id = "julio",   Name = "Júlio",             Relationship = "Familiar Xus [J]", DefaultDueDay = null, IsRecurring = true  },
            new() { Id = "julia",   Name = "Julia (U)",         Relationship = "Cunhada [U]",      DefaultDueDay = null, IsRecurring = false },
            new() { Id = "tia",     Name = "Tia/Gui",           Relationship = "Familiar",         DefaultDueDay = 9,  IsRecurring = true  },
            new() { Id = "geovane", Name = "Geovane",           Relationship = "Amigo",            DefaultDueDay = 9,  IsRecurring = false },
            new() { Id = "elvis",   Name = "Elvis",             Relationship = "Amigo",            DefaultDueDay = 9,  IsRecurring = false },
        };
        db.ThirdPartyPersons.AddRange(people);

        for (int month = 7; month <= 12; month++)
        {
            var cycleId = $"2026-{month:D2}";
            var refDate = new DateOnly(2026, month, 1);
            var label   = $"{MonthNames[month - 1]} 2026";

            db.MonthCycles.Add(new MonthCycle
            {
                Id                     = cycleId,
                Label                  = label,
                ReferencePeriod        = refDate,
                UltraInvoiceTotal      = UltraTotals[month],
                EmergencyReserveTarget = 300.00m,
            });

            // ── Receitas ─────────────────────────────────────────────────────
            if (month == 11)
            {
                db.IncomeItems.Add(new IncomeItem { Title = "Férias + Vale",   Category = IncomeCategory.Ferias, Amount = 11_083.05m, Recurrence = Recurrence.Pontual, ReceivedDay = 1,  MonthCycleId = cycleId });
                db.IncomeItems.Add(new IncomeItem { Title = "CFT Jaum",        Category = IncomeCategory.Cft,    Amount = 900.00m,    Recurrence = Recurrence.Mensal,  ReceivedDay = 9,  MonthCycleId = cycleId });
                db.IncomeItems.Add(new IncomeItem { Title = "Salário Parcial", Category = IncomeCategory.Clt,    Amount = 2_284.24m,  Recurrence = Recurrence.Pontual, ReceivedDay = 15, MonthCycleId = cycleId });
            }
            else if (month == 8)
            {
                db.IncomeItems.Add(new IncomeItem { Title = "CLT Líquido", Category = IncomeCategory.Clt,    Amount = 6_336.05m, Recurrence = Recurrence.Mensal,  ReceivedDay = 5,  MonthCycleId = cycleId });
                db.IncomeItems.Add(new IncomeItem { Title = "CFT Jaum",    Category = IncomeCategory.Cft,    Amount = 900.00m,   Recurrence = Recurrence.Mensal,  ReceivedDay = 9,  MonthCycleId = cycleId });
                db.IncomeItems.Add(new IncomeItem { Title = "PPR",         Category = IncomeCategory.Ppr,    Amount = 1_066.78m, Recurrence = Recurrence.Pontual, ReceivedDay = 10, MonthCycleId = cycleId });
            }
            else if (month == 12)
            {
                db.IncomeItems.Add(new IncomeItem { Title = "CLT Líquido Próprio",        Category = IncomeCategory.Clt,    Amount = 5_287.72m, Recurrence = Recurrence.Pontual, ReceivedDay = 5,  MonthCycleId = cycleId });
                db.IncomeItems.Add(new IncomeItem { Title = "CFT Jaum",                   Category = IncomeCategory.Cft,    Amount = 900.00m,   Recurrence = Recurrence.Mensal,  ReceivedDay = 9,  MonthCycleId = cycleId });
                db.IncomeItems.Add(new IncomeItem { Title = "Sobra Mês Anterior (Nov)",   Category = IncomeCategory.Outros, Amount = 2_200.00m, Recurrence = Recurrence.Pontual, ReceivedDay = 1,  MonthCycleId = cycleId });
            }
            else
            {
                db.IncomeItems.Add(new IncomeItem { Title = "CLT Líquido", Category = IncomeCategory.Clt, Amount = 6_336.05m, Recurrence = Recurrence.Mensal, ReceivedDay = 5, MonthCycleId = cycleId });
                db.IncomeItems.Add(new IncomeItem { Title = "CFT Jaum",    Category = IncomeCategory.Cft, Amount = 900.00m,   Recurrence = Recurrence.Mensal, ReceivedDay = 9, MonthCycleId = cycleId });
            }

            SeedObligations(db, cycleId, month);

            if (month == 12) SeedDecemberEntries(db, cycleId);
        }

        await db.SaveChangesAsync();
    }

    private static void SeedObligations(AppDbContext db, string cycleId, int month)
    {
        int puntoInst = month + 1;
        int itauInst  = 32 - (12 - month);

        db.FixedObligations.Add(new FixedObligation
        {
            Title = "Aluguel — Venc. dia 10", Amount = 800.00m, DueDay = 10,
            Source = ExpenseSource.Piques, Category = "Moradia",
            SubtractFromUltraInvoice = false, CriticalAlert = false, IncludeInMyAccounts = true, Paid = false, MonthCycleId = cycleId
        });

        db.FixedObligations.Add(new FixedObligation
        {
            Title = "Financiamento Punto — Pix Valdete",
            Amount = 1_340.78m, DueDay = 5, Source = ExpenseSource.Piques, Category = "Financiamento",
            InstallmentCurrent = puntoInst, InstallmentTotal = 23,
            SubtractFromUltraInvoice = false, CriticalAlert = true, IncludeInMyAccounts = true, Paid = false, MonthCycleId = cycleId
        });

        // Amazon Prime — Dia 02
        db.FixedObligations.Add(new FixedObligation
        {
            Title = "Amazon Prime — Dia 02", Amount = 19.90m, FullInvoiceAmount = 19.90m,
            DueDay = 2, Source = ExpenseSource.NubankUltra, Category = "Streaming",
            SubtractFromUltraInvoice = true, CriticalAlert = false, IncludeInMyAccounts = true, Paid = false, MonthCycleId = cycleId
        });

        // Netflix ÷ 2 — Dia 12
        db.FixedObligations.Add(new FixedObligation
        {
            Title = "Netflix (÷2) — Dia 12", Amount = 29.95m, FullInvoiceAmount = 59.90m, SplitPeople = 2,
            DueDay = 12, Source = ExpenseSource.NubankUltra, Category = "Streaming",
            SubtractFromUltraInvoice = true, CriticalAlert = false, IncludeInMyAccounts = true, Paid = false, MonthCycleId = cycleId
        });

        // Spotify ÷ 6 — Dia 20 (cobrado em 20/11 — SubtractFromUltraInvoice=true: valor cheio entra na Prova Real)
        db.FixedObligations.Add(new FixedObligation
        {
            Title = "Spotify (÷6) — Dia 20", Amount = 6.82m, FullInvoiceAmount = 40.90m, SplitPeople = 6,
            DueDay = 20, Source = ExpenseSource.NubankUltra, Category = "Streaming",
            SubtractFromUltraInvoice = true, CriticalAlert = false, IncludeInMyAccounts = true, Paid = false, MonthCycleId = cycleId
        });

        // Disney+ ÷ 4 — Dia 23 (SubtractFromUltraInvoice=false até incluir na fórmula)
        db.FixedObligations.Add(new FixedObligation
        {
            Title = "Disney+ (÷4) — Dia 23", Amount = 14.98m, FullInvoiceAmount = 59.90m, SplitPeople = 4,
            DueDay = 23, Source = ExpenseSource.NubankUltra, Category = "Streaming",
            SubtractFromUltraInvoice = false, CriticalAlert = false, IncludeInMyAccounts = true, Paid = false, MonthCycleId = cycleId
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
            Title = "Copel — Venc. 10", Amount = 232.85m, DueDay = 10,
            Source = ExpenseSource.BoletoOutros, Category = "Moradia",
            SubtractFromUltraInvoice = false, CriticalAlert = false, IncludeInMyAccounts = true, Paid = false, MonthCycleId = cycleId
        });

        // Internet Voxx — Venc. 11
        db.FixedObligations.Add(new FixedObligation
        {
            Title = "Internet Voxx — Venc. 11", Amount = 145.00m, DueDay = 11,
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

        // Empréstimo Itaú Tia/Gui — Dia 22 (informacional)
        db.FixedObligations.Add(new FixedObligation
        {
            Title = "Empréstimo Itaú Tia/Gui — Dia 22",
            Amount = 1_581.72m, DueDay = 22,
            Source = ExpenseSource.BoletoOutros, Category = "Empréstimo",
            InstallmentCurrent = itauInst, InstallmentTotal = 54,
            SubtractFromUltraInvoice = false, CriticalAlert = true,
            IncludeInMyAccounts = false, Paid = false, MonthCycleId = cycleId
        });

        // WellHub Sogra (repasse mensal da Sogra — NÃO sai do bolso de Leandro)
        db.FixedObligations.Add(new FixedObligation
        {
            Title = "WellHub Sogra — Dia 26", Amount = 59.99m, FullInvoiceAmount = 59.99m,
            DueDay = 26, Source = ExpenseSource.NubankUltra, Category = "Saúde",
            SubtractFromUltraInvoice = false,
            CriticalAlert = false, IncludeInMyAccounts = false, Paid = false, MonthCycleId = cycleId
        });

        // Óculos - Ótica 3B 02/02 e Conserto Embreagem (parcelas de Dez/2026)
        if (month == 12)
        {
            db.FixedObligations.Add(new FixedObligation
            {
                Title = "Óculos - Ótica 3B — 02/02", Amount = 122.50m, DueDay = 2,
                Source = ExpenseSource.AmazonCard, Category = "Saúde",
                InstallmentCurrent = 2, InstallmentTotal = 2,
                SubtractFromUltraInvoice = false, CriticalAlert = false, IncludeInMyAccounts = true, Paid = false, MonthCycleId = cycleId
            });
            db.FixedObligations.Add(new FixedObligation
            {
                Title = "[CAR] Conserto Embreagem — 04/10", Amount = 222.00m, DueDay = 10,
                Source = ExpenseSource.AmazonCard, Category = "Carro",
                InstallmentCurrent = 4, InstallmentTotal = 10,
                SubtractFromUltraInvoice = false, CriticalAlert = false, IncludeInMyAccounts = true, Paid = false, MonthCycleId = cycleId
            });
        }
    }

    private static void SeedDecemberEntries(AppDbContext db, string cycleId)
    {
        var dec = new DateOnly(2026, 12, 1);

        // ── Xus (SubtractFromUltra=true: aparecem na fatura Ultra, Xus paga de volta) ──

        // [J] Disney+ de Xus — Informativo
        db.ExpenseEntries.Add(new ExpenseEntry { Description = "Disney+ [J] Xus", Amount = 16.73m, Date = dec, DueDay = 23, Source = ExpenseSource.NubankUltra, OwnerId = "xus", SubTag = Entities.SubTag.J, Tag = "Streaming", SubtractFromUltra = false, InformationalOnly = true, CriticalAlert = false, MonthCycleId = cycleId });

        // Netflix Xus — Informativo
        db.ExpenseEntries.Add(new ExpenseEntry { Description = "Netflix Xus", Amount = 29.95m, Date = dec, DueDay = 12, Source = ExpenseSource.NubankUltra, OwnerId = "xus", SubTag = null, Tag = "Streaming", SubtractFromUltra = false, InformationalOnly = true, CriticalAlert = false, MonthCycleId = cycleId });

        // Compras pessoais Xus no Nubank — SubtractFromUltra=true
        db.ExpenseEntries.Add(new ExpenseEntry { Description = "RiHappy - 02/02", Amount = 107.49m, Date = new DateOnly(2026, 11, 5), Source = ExpenseSource.NubankUltra, OwnerId = "xus", SubTag = null, Tag = "Compras", SubtractFromUltra = true, InformationalOnly = false, CriticalAlert = false, MonthCycleId = cycleId });
        db.ExpenseEntries.Add(new ExpenseEntry { Description = "Cotton On Catuai", Amount = 129.80m, Date = new DateOnly(2026, 11, 5), Source = ExpenseSource.NubankUltra, OwnerId = "xus", SubTag = null, Tag = "Compras", SubtractFromUltra = true, InformationalOnly = false, CriticalAlert = false, MonthCycleId = cycleId });
        db.ExpenseEntries.Add(new ExpenseEntry { Description = "½ Balloarts Xus", Amount = 47.90m, Date = new DateOnly(2026, 11, 7), Source = ExpenseSource.NubankUltra, OwnerId = "xus", SubTag = null, Tag = "Entretenimento", SubtractFromUltra = true, InformationalOnly = false, CriticalAlert = false, MonthCycleId = cycleId });
        db.ExpenseEntries.Add(new ExpenseEntry { Description = "Balões Lara", Amount = 37.00m, Date = new DateOnly(2026, 11, 9), Source = ExpenseSource.NubankUltra, OwnerId = "xus", SubTag = null, Tag = "Compras", SubtractFromUltra = true, InformationalOnly = false, CriticalAlert = false, MonthCycleId = cycleId });
        db.ExpenseEntries.Add(new ExpenseEntry { Description = "½ Kaloba + Livro - Raia Xus", Amount = 47.65m, Date = new DateOnly(2026, 11, 9), Source = ExpenseSource.NubankUltra, OwnerId = "xus", SubTag = null, Tag = "Farmácia", SubtractFromUltra = true, InformationalOnly = false, CriticalAlert = false, MonthCycleId = cycleId });
        db.ExpenseEntries.Add(new ExpenseEntry { Description = "Manga + Mertilo - Feira", Amount = 26.60m, Date = new DateOnly(2026, 11, 8), Source = ExpenseSource.NubankUltra, OwnerId = "xus", SubTag = null, Tag = "Alimentação", SubtractFromUltra = true, InformationalOnly = false, CriticalAlert = false, MonthCycleId = cycleId });
        db.ExpenseEntries.Add(new ExpenseEntry { Description = "Abacate - Feira Zerão", Amount = 5.00m, Date = new DateOnly(2026, 11, 8), Source = ExpenseSource.NubankUltra, OwnerId = "xus", SubTag = null, Tag = "Alimentação", SubtractFromUltra = true, InformationalOnly = false, CriticalAlert = false, MonthCycleId = cycleId });
        db.ExpenseEntries.Add(new ExpenseEntry { Description = "½ Vacina Lara - Unimed", Amount = 403.75m, Date = new DateOnly(2026, 11, 21), Source = ExpenseSource.NubankUltra, OwnerId = "xus", SubTag = null, Tag = "Saúde", SubtractFromUltra = true, InformationalOnly = false, CriticalAlert = false, MonthCycleId = cycleId });

        // Spotify Jaum + Thais — Informativo: cotas de Jaum/Thais (pago via Pix, não pela fatura Ultra)
        db.ExpenseEntries.Add(new ExpenseEntry { Description = "Spotify Jaum + Thais", Amount = 13.64m, Date = dec, DueDay = 20, Source = ExpenseSource.NubankUltra, OwnerId = "jaum", SubTag = Entities.SubTag.J, Tag = "Streaming", SubtractFromUltra = false, InformationalOnly = true, CriticalAlert = false, MonthCycleId = cycleId });

        // CFT Jaum — recebido via Pix diretamente, não passa pela fatura do Nubank Ultra
        db.ExpenseEntries.Add(new ExpenseEntry { Description = "CFT Responsabilidade Técnica (Jaum)", Amount = 900.00m, Date = dec, DueDay = 9, Source = ExpenseSource.NubankUltra, OwnerId = "jaum", SubTag = Entities.SubTag.J, Tag = "Repasse", SubtractFromUltra = false, InformationalOnly = true, CriticalAlert = false, MonthCycleId = cycleId });

        // WellHub Sogra — Informativo
        db.ExpenseEntries.Add(new ExpenseEntry { Description = "WellHub Sogra (repasse Dez)", Amount = 59.99m, Date = dec, DueDay = 26, Source = ExpenseSource.NubankUltra, OwnerId = "sogra", SubTag = Entities.SubTag.C, Tag = "Saúde", SubtractFromUltra = false, InformationalOnly = true, CriticalAlert = false, MonthCycleId = cycleId });

        // Geovane — Nubank
        db.ExpenseEntries.Add(new ExpenseEntry { Description = "Repasse Geovane (nascimento filho)", Amount = 748.65m, Date = dec, DueDay = 9, Source = ExpenseSource.NubankUltra, OwnerId = "geovane", SubTag = Entities.SubTag.C, Tag = "Repasse", SubtractFromUltra = true, InformationalOnly = false, CriticalAlert = false, MonthCycleId = cycleId });

        // Elvis — R$1.000 no cartão
        db.ExpenseEntries.Add(new ExpenseEntry { Description = "Cartão Elvis", Amount = 1_000.00m, Date = dec, DueDay = 9, Source = ExpenseSource.NubankUltra, OwnerId = "elvis", SubTag = Entities.SubTag.C, Tag = "Repasse", SubtractFromUltra = true, InformationalOnly = false, CriticalAlert = false, MonthCycleId = cycleId });

        // Empréstimo Itaú Tia/Gui — Apenas Informativo
        db.ExpenseEntries.Add(new ExpenseEntry { Description = "Empréstimo Itaú Tia/Gui — Dia 22 (32/54)", Amount = 1_581.72m, Date = new DateOnly(2026, 12, 22), DueDay = 22, Source = ExpenseSource.BoletoOutros, OwnerId = null, SubTag = null, Tag = "Empréstimo", InstallmentCurrent = 32, InstallmentTotal = 54, SubtractFromUltra = false, InformationalOnly = true, CriticalAlert = true, MonthCycleId = cycleId });

        // Tia/Gui — Nubank parcelado
        db.ExpenseEntries.Add(new ExpenseEntry { Description = "Carro Tia/Gui (07/10)", Amount = 134.55m, Date = dec, DueDay = 9, Source = ExpenseSource.NubankUltra, OwnerId = "tia", SubTag = Entities.SubTag.C, Tag = "Parcela", InstallmentCurrent = 7, InstallmentTotal = 10, SubtractFromUltra = true, InformationalOnly = false, CriticalAlert = false, MonthCycleId = cycleId });
        db.ExpenseEntries.Add(new ExpenseEntry { Description = "Elisangela de Cassia Tia/Gui (01/03)", Amount = 146.00m, Date = dec, DueDay = 9, Source = ExpenseSource.NubankUltra, OwnerId = "tia", SubTag = Entities.SubTag.C, Tag = "Parcela", InstallmentCurrent = 1, InstallmentTotal = 3, SubtractFromUltra = true, InformationalOnly = false, CriticalAlert = false, MonthCycleId = cycleId });

        // ── Meus gastos pessoais no Nubank — até 21/11/2026 ──────────────────
        // TOTAL: R$3.130,73 (planilha mostra R$3.130,72 por arredondamento)
        var nuEntries = new[]
        {
            ("Frangos Lara",                        53.00m,  "02/11", "Alimentação"),
            ("Mixer + Potes - Havan",              172.86m,  "02/11", "Casa"),
            ("Bananas - Maxi Carne",                 9.00m,  "03/11", "Alimentação"),
            ("Soro + camisinha + sorvetes",         52.96m,  "05/11", "Farmácia"),
            ("Insano Burger",                       58.00m,  "05/11", "Alimentação"),
            ("Ovos",                               19.99m,  "06/11", "Alimentação"),
            ("Camiseta renner - niver pat",         79.90m,  "06/11", "Vestuário"),
            ("Estacionamento",                      18.00m,  "06/11", "Transporte"),
            ("McDonalds",                          100.80m,  "06/11", "Alimentação"),
            ("Suco Duque",                           8.00m,  "07/11", "Alimentação"),
            ("Lenço umidecido",                      9.99m,  "07/11", "Higiene"),
            ("½ Balloarts",                         47.90m,  "07/11", "Entretenimento"),
            ("Frutas Feira",                        21.00m,  "08/11", "Alimentação"),
            ("Lanchonete Toyota",                   11.00m,  "08/11", "Alimentação"),
            ("Carnes Assadas",                     110.00m,  "09/11", "Alimentação"),
            ("[CAR] Gasolina + Snickers",          161.00m,  "09/11", "Transporte"),
            ("Refri Adélia",                        12.00m,  "09/11", "Alimentação"),
            ("½ Kaloba + Livro - Raia",             47.65m,  "09/11", "Farmácia"),
            ("ULTRAVIOLETA (?)",                    89.00m,  "09/11", "Outros"),
            ("2 Apitamil Pepti - Mercado Livre",   345.98m,  "09/11", "Bebê"),
            ("[MOTO] Gasolina",                     86.00m,  "12/11", "Transporte"),
            ("Soro - Farmacia São João",             6.99m,  "12/11", "Farmácia"),
            ("[MCD] Compras Muffato",               18.37m,  "12/11", "Alimentação"),
            ("[MCD] Carnes Fujarra",                50.95m,  "12/11", "Alimentação"),
            ("[MCD] Compras Muffato",              314.82m,  "14/11", "Alimentação"),
            ("Icool em gel",                         8.99m,  "14/11", "Farmácia"),
            ("77 Hamburgueria",                     97.00m,  "15/11", "Alimentação"),
            ("Chopp IPA - Serras Gerais",           40.00m,  "15/11", "Entretenimento"),
            ("Soro + NAN - Farmacia Popular",       97.80m,  "15/11", "Farmácia"),
            ("Chopp - Feira Cincão",                10.00m,  "15/11", "Entretenimento"),
            ("Pasteis Feira Cincão",                30.00m,  "15/11", "Alimentação"),
            ("Bebidas Pasteis",                     10.00m,  "15/11", "Alimentação"),
            ("3 - Domperidora",                     22.58m,  "15/11", "Farmácia"),
            ("Droga Raia",                          25.39m,  "18/11", "Farmácia"),
            ("[CAR] Gasolina",                     150.00m, "18/11", "Transporte"),
            ("Sonhos - Adelia",                      8.00m,  "18/11", "Alimentação"),
            // Novos: 20/11 e 21/11
            ("Doces + Bebidas - Sur L Amou",        63.00m,  "20/11", "Entretenimento"),
            ("Aperol - Mestizzo",                   32.00m,  "20/11", "Entretenimento"),
            ("[MCD] Compras Muffato",              130.06m,  "20/11", "Alimentação"),
            ("Magrelo Lanches",                    47.00m,  "21/11", "Alimentação"),
            ("½ Vacina Lara - Unimed",            403.75m,  "21/11", "Saúde"),
            ("Sprite 2L - Tremembeer",             11.00m,  "21/11", "Alimentação"),
            ("Soro - Farmacia Ideal",               15.00m,  "21/11", "Farmácia"),
            ("Coronas - Michel",                    24.00m,  "21/11", "Entretenimento"),
        };
        foreach (var (desc, amt, dateStr, tag) in nuEntries)
        {
            var parts = dateStr.Split('/');
            var d = new DateOnly(2026, int.Parse(parts[1]), int.Parse(parts[0]));
            db.ExpenseEntries.Add(new ExpenseEntry
            {
                Description = desc, Amount = amt, Date = d,
                Source = ExpenseSource.NubankUltra, OwnerId = null, SubTag = null,
                Tag = tag, SubtractFromUltra = false, InformationalOnly = false, CriticalAlert = false,
                MonthCycleId = cycleId
            });
        }

        // ── Amazon lançamentos Dezembro/2026 — Vence dia 10 — TOTAL: R$1.074,30 ──
        var amzEntries = new (string Desc, decimal Amt, string DateStr, string Tag)[]
        {
            ("[CAR] Gasolina",                     357.00m, "28/10", "Transporte"),
            ("Hachimitsu",                          90.00m, "28/10", "Alimentação"),
            ("Renato Sucos",                        26.00m, "28/10", "Alimentação"),
            ("Renato Sucos",                        25.99m, "28/10", "Alimentação"),
            ("Plein Orla",                          93.50m, "29/10", "Compras"),
            ("Chopp Mestizzo",                      15.00m, "30/10", "Entretenimento"),
            ("Barbearia",                          182.00m, "30/10", "Beleza"),
            ("Lanchonete Tubarão",                  84.00m, "31/10", "Alimentação"),
            ("Cervejas - Ver Cirlei",               31.00m, "01/11", "Alimentação"),
            ("selfitcidadejardim Be (Golpe)",       39.90m, "06/11", "Estorno"),
            ("Dpg*mt Club Bi (Golpe)",             129.91m, "06/11", "Estorno"),
        };
        foreach (var (aDesc, aAmt, aDate, aTag) in amzEntries)
        {
            var p = aDate.Split('/');
            var d2 = new DateOnly(2026, int.Parse(p[1]), int.Parse(p[0]));
            db.ExpenseEntries.Add(new ExpenseEntry
            {
                Description = aDesc, Amount = aAmt, Date = d2,
                Source = ExpenseSource.AmazonCard, OwnerId = null, SubTag = null,
                Tag = aTag, SubtractFromUltra = false, InformationalOnly = false, CriticalAlert = false,
                MonthCycleId = cycleId
            });
        }

        // ── Dinheiro / Piques lançamentos Dezembro/2026 — TOTAL: R$433,98 ──
        db.ExpenseEntries.Add(new ExpenseEntry { Description = "Compra HGLG11 - FII",              Amount = 145.50m, Date = new DateOnly(2026, 11, 10), Source = ExpenseSource.Piques, Tag = "Investimento", SubtractFromUltra = false, InformationalOnly = false, CriticalAlert = false, MonthCycleId = cycleId });
        db.ExpenseEntries.Add(new ExpenseEntry { Description = "Compra AUPO11 - ETF",              Amount = 111.93m, Date = new DateOnly(2026, 11, 10), Source = ExpenseSource.Piques, Tag = "Investimento", SubtractFromUltra = false, InformationalOnly = false, CriticalAlert = false, MonthCycleId = cycleId });
        db.ExpenseEntries.Add(new ExpenseEntry { Description = "Futsal Toyota Heber",                 Amount =  15.00m, Date = new DateOnly(2026, 11, 16), Source = ExpenseSource.Piques, Tag = "Carro",        SubtractFromUltra = false, InformationalOnly = false, CriticalAlert = false, MonthCycleId = cycleId });
        db.ExpenseEntries.Add(new ExpenseEntry { Description = "Compra BBAS3 - Ação Brasileira",   Amount = 141.55m, Date = new DateOnly(2026, 11, 19), Source = ExpenseSource.Piques, Tag = "Investimento", SubtractFromUltra = false, InformationalOnly = false, CriticalAlert = false, MonthCycleId = cycleId });
        db.ExpenseEntries.Add(new ExpenseEntry { Description = "[CAR] Conserto Pneu",              Amount =  20.00m, Date = new DateOnly(2026, 11, 20), Source = ExpenseSource.Piques, Tag = "Carro",        SubtractFromUltra = false, InformationalOnly = false, CriticalAlert = false, MonthCycleId = cycleId });
        // TOTAL Piques: R$433,98 ✓
    }
}
