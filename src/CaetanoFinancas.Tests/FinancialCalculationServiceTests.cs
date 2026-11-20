using CaetanoFinancas.Api.Entities;
using CaetanoFinancas.Api.Services;
using Xunit;

namespace CaetanoFinancas.Tests;

/// <summary>
/// 6 testes unitários para FinancialCalculationService.
/// Nenhum banco de dados envolvido — apenas objetos em memória.
/// </summary>
public sealed class FinancialCalculationServiceTests
{
    private readonly FinancialCalculationService _svc = new();

    // ── Helper factories ─────────────────────────────────────────────────────

    private static ExpenseEntry Expense(
        decimal amount,
        ExpenseSource source = ExpenseSource.NubankUltra,
        bool subtractFromUltra = false,
        bool informationalOnly = false,
        SubTag? subTag = null) => new()
    {
        Description = "Teste",
        Amount = amount,
        Date = new DateOnly(2026, 11, 1),
        Source = source,
        Tag = "Teste",
        SubtractFromUltra = subtractFromUltra,
        InformationalOnly = informationalOnly,
        SubTag = subTag,
        MonthCycleId = "2026-11"
    };

    private static FixedObligation Obligation(
        decimal amount,
        decimal? fullInvoiceAmount = null,
        bool subtractFromUltra = false,
        bool includeInMyAccounts = true) => new()
    {
        Title = "Obrigação Teste",
        Amount = amount,
        FullInvoiceAmount = fullInvoiceAmount,
        DueDay = 10,
        Source = ExpenseSource.NubankUltra,
        Category = "Assinatura",
        SubtractFromUltraInvoice = subtractFromUltra,
        IncludeInMyAccounts = includeInMyAccounts,
        MonthCycleId = "2026-11"
    };

    private static IncomeItem Income(decimal amount) => new()
    {
        Title = "Salário",
        Category = IncomeCategory.Clt,
        Amount = amount,
        Recurrence = Recurrence.Mensal,
        MonthCycleId = "2026-11"
    };

    // ════════════════════════════════════════════════════════════════════════
    // TESTE 1 — Prova Real: conciliação exata (Diferença = 0)
    // ════════════════════════════════════════════════════════════════════════

    [Fact]
    public void UltraReconciliation_QuandoValoresConferem_RetornaStatusExata()
    {
        // Fatura: 300
        // Assinatura (FullInvoiceAmount): 50
        // Terceiro via Ultra:             80
        // Meus gastos Ultra:             170
        // Total = 50 + 80 + 170 = 300 ✓

        var obligations = new[] { Obligation(25m, fullInvoiceAmount: 50m, subtractFromUltra: true) };
        var entries = new[]
        {
            Expense(80m,  subtractFromUltra: true),   // terceiro
            Expense(170m, subtractFromUltra: false),  // próprio
        };

        var result = _svc.CalculateUltraReconciliation(300m, obligations, entries);

        Assert.Equal(0m, result.Diferenca);
        Assert.Equal(ReconciliationStatus.Exata, result.Status);
        Assert.Equal(50m,  result.TotalAssinaturas);
        Assert.Equal(80m,  result.TotalTerceiros);
        Assert.Equal(170m, result.TotalMeusGastos);
    }

    // ════════════════════════════════════════════════════════════════════════
    // TESTE 2 — Prova Real: diferença de R$0,01 → Arredondamento
    // ════════════════════════════════════════════════════════════════════════

    [Fact]
    public void UltraReconciliation_QuandoDiferencaMenorQueTolerance_RetornaArredondamento()
    {
        // Fatura: 100,01; gastos somam 100 → diff = 0,01
        var entries = new[] { Expense(100m) };

        var result = _svc.CalculateUltraReconciliation(100.01m, [], entries);

        Assert.Equal(0.01m, result.Diferenca);
        Assert.Equal(ReconciliationStatus.Arredondamento, result.Status);
    }

    // ════════════════════════════════════════════════════════════════════════
    // TESTE 3 — Prova Real: diferença de R$5 → Divergente
    // ════════════════════════════════════════════════════════════════════════

    [Fact]
    public void UltraReconciliation_QuandoDiferencaAcimaDoLimite_RetornaDivergente()
    {
        var entries = new[] { Expense(100m) };

        var result = _svc.CalculateUltraReconciliation(105m, [], entries);

        Assert.Equal(5m, result.Diferenca);
        Assert.Equal(ReconciliationStatus.Divergente, result.Status);
    }

    // ════════════════════════════════════════════════════════════════════════
    // TESTE 4 — SubTags [J]/[U]/[C] são subtraídas do TotalApenasProprio
    // ════════════════════════════════════════════════════════════════════════

    [Fact]
    public void ThirdPartySummaries_SubTagsJUC_SaoSubtraidasDoTotalProprio()
    {
        // Meu gasto:       200
        // Gasto de [J]:    50
        // Gasto de [U]:    30
        // Gasto de [C]:    20
        // TotalGeral       = 300
        // TotalApenasProprio = 300 - 50 - 30 - 20 = 200

        var entries = new[]
        {
            Expense(200m),                                    // próprio (sem SubTag)
            Expense(50m,  subTag: SubTag.J),                  // [J]
            Expense(30m,  subTag: SubTag.U),                  // [U]
            Expense(20m,  subTag: SubTag.C),                  // [C]
        };

        var result = _svc.CalculateThirdPartySummaries(entries);

        Assert.Equal(300m, result.TotalGeral);
        Assert.Equal(200m, result.TotalApenasProprio);
        Assert.Equal(300m, result.TotalNubank);     // todos NubankUltra
        Assert.Equal(0m,   result.TotalNaoNubank);
    }

    // ════════════════════════════════════════════════════════════════════════
    // TESTE 5 — Abatimento negativo reduz o saldo corretamente
    // ════════════════════════════════════════════════════════════════════════

    [Fact]
    public void ThirdPartySummaries_AbatimentoNegativo_ReducTotalGeral()
    {
        // Gasto:      150
        // Abatimento: -30 (estorno)
        // TotalGeral  = 120

        var entries = new[]
        {
            Expense(150m),
            Expense(-30m),  // abatimento
        };

        var result = _svc.CalculateThirdPartySummaries(entries);

        Assert.Equal(120m, result.TotalGeral);
        Assert.Equal(120m, result.TotalApenasProprio); // nenhuma SubTag
    }

    // ════════════════════════════════════════════════════════════════════════
    // TESTE 6 — Empréstimo Itaú Dia 22: InformationalOnly não entra no saldo,
    //           mas aparece na lista InformationalItems
    // ════════════════════════════════════════════════════════════════════════

    [Fact]
    public void ThirdPartySummaries_EmprestimoInformational_NaoEntraNosCalculosPoremAparece()
    {
        // Gasto real:              500
        // Empréstimo Itaú Dia 22:  300 (informational only)
        // TotalGeral deve ser 500 (300 não entra)
        // InformationalItems deve conter 1 item

        var emprestimoItau = new ExpenseEntry
        {
            Description = "Empréstimo Itaú Dia 22",
            Amount = 300m,
            Date = new DateOnly(2026, 11, 22),
            DueDay = 22,
            Source = ExpenseSource.BoletoOutros,
            Tag = "Empréstimo",
            InformationalOnly = true,
            MonthCycleId = "2026-11"
        };

        var entries = new[]
        {
            Expense(500m),  // gasto real
            emprestimoItau  // apenas informativo
        };

        var result = _svc.CalculateThirdPartySummaries(entries);

        Assert.Equal(500m, result.TotalGeral);
        Assert.Single(result.InformationalItems);
        Assert.Equal("Empréstimo Itaú Dia 22", result.InformationalItems[0].Description);
        Assert.Equal(300m, result.InformationalItems[0].Amount);
    }
}
