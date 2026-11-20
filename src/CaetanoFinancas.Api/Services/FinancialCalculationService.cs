using CaetanoFinancas.Api.Entities;

namespace CaetanoFinancas.Api.Services;

// ── DTOs de resultado ────────────────────────────────────────────────────────

public enum ReconciliationStatus { Exata, Arredondamento, Divergente }

public sealed record UltraReconciliationResult(
    decimal FaturaTotal,
    decimal TotalAssinaturas,
    decimal TotalTerceiros,
    decimal TotalMeusGastos,
    decimal Diferenca,
    ReconciliationStatus Status
);

public sealed record ThirdPartySummaryResult(
    decimal TotalGeral,
    decimal TotalApenasProprio,
    decimal TotalNubank,
    decimal TotalNaoNubank,
    IReadOnlyList<ExpenseEntry> InformationalItems
);

public sealed record MonthSummaryResult(
    decimal TotalReceitas,
    decimal TotalObrigacoesFixas,
    decimal TotalGastosPorFonte,
    decimal ReservaEmergencia,
    decimal SaldoLivreDoMes,
    IReadOnlyDictionary<string, decimal> GastosPorFonte
);

// ── Serviço puro (sem dependência de EF/banco) ───────────────────────────────

/// <summary>
/// Serviço puro de cálculos financeiros. Recebe coleções em memória
/// para facilitar testes unitários sem banco de dados.
/// </summary>
public sealed class FinancialCalculationService
{
    private const decimal ArredondamentoTolerance = 0.02m;

    /// <summary>
    /// Conciliação da fatura Nubank Ultra.
    ///
    /// Fórmula:
    ///   Diferença = FaturaTotal
    ///             - Σ FullInvoiceAmount  [FixedObligations: SubtractFromUltraInvoice=true]
    ///             - Σ Amount             [ExpenseEntries: Source=NubankUltra, SubtractFromUltra=true, !InformationalOnly]
    ///             - Σ Amount             [ExpenseEntries: Source=NubankUltra, SubtractFromUltra=false, !InformationalOnly]
    ///
    /// Status:
    ///   Exata         → Diferença == 0
    ///   Arredondamento→ |Diferença| <= 0.02
    ///   Divergente    → |Diferença| >  0.02
    /// </summary>
    public UltraReconciliationResult CalculateUltraReconciliation(
        decimal faturaTotal,
        IEnumerable<FixedObligation> fixedObligations,
        IEnumerable<ExpenseEntry> expenseEntries)
    {
        // Assinaturas: valor cheio na fatura (antes de dividir)
        var totalAssinaturas = fixedObligations
            .Where(f => f.SubtractFromUltraInvoice)
            .Sum(f => f.FullInvoiceAmount ?? f.Amount);

        var ultraEntries = expenseEntries
            .Where(e => e.Source == ExpenseSource.NubankUltra && !e.InformationalOnly)
            .ToList();

        // Terceiros que passam pelo Ultra (devem ser subtraídos da fatura)
        var totalTerceiros = ultraEntries
            .Where(e => e.SubtractFromUltra)
            .Sum(e => e.Amount);

        // Meus próprios gastos no Ultra
        var totalMeusGastos = ultraEntries
            .Where(e => !e.SubtractFromUltra)
            .Sum(e => e.Amount);

        var diferenca = faturaTotal - totalAssinaturas - totalTerceiros - totalMeusGastos;

        var status = diferenca == 0m
            ? ReconciliationStatus.Exata
            : Math.Abs(diferenca) <= ArredondamentoTolerance
                ? ReconciliationStatus.Arredondamento
                : ReconciliationStatus.Divergente;

        return new UltraReconciliationResult(
            faturaTotal,
            totalAssinaturas,
            totalTerceiros,
            totalMeusGastos,
            diferenca,
            status);
    }

    /// <summary>
    /// Resumo de gastos de terceiros.
    ///
    /// - TotalGeral        → Σ Amount de todos os lançamentos não-informacionais
    /// - TotalApenasProprio→ TotalGeral - Σ Amount onde SubTag ∈ {J, U, C}
    /// - TotalNubank       → Σ Amount onde Source=NubankUltra (não-informacional)
    /// - TotalNaoNubank    → TotalGeral - TotalNubank
    /// - InformationalItems→ lançamentos com InformationalOnly=true
    /// </summary>
    public ThirdPartySummaryResult CalculateThirdPartySummaries(
        IEnumerable<ExpenseEntry> expenseEntries)
    {
        var entries = expenseEntries.ToList();

        var nonInfo = entries.Where(e => !e.InformationalOnly).ToList();

        var totalGeral = nonInfo.Sum(e => e.Amount);

        var totalTerceirosSubs = nonInfo
            .Where(e => e.SubTag.HasValue) // SubTag J, U ou C
            .Sum(e => e.Amount);

        var totalApenasProprio = totalGeral - totalTerceirosSubs;

        var totalNubank = nonInfo
            .Where(e => e.Source == ExpenseSource.NubankUltra)
            .Sum(e => e.Amount);

        var totalNaoNubank = totalGeral - totalNubank;

        var informationalItems = entries
            .Where(e => e.InformationalOnly)
            .ToList()
            .AsReadOnly();

        return new ThirdPartySummaryResult(
            totalGeral,
            totalApenasProprio,
            totalNubank,
            totalNaoNubank,
            informationalItems);
    }

    /// <summary>
    /// Resumo mensal completo.
    ///
    /// SaldoLivreDoMes = Receitas - ObrigacoesFixas - GastosPorFonte - ReservaEmergencia
    ///
    /// ObrigacoesFixas → apenas itens com IncludeInMyAccounts=true
    /// GastosPorFonte  → Σ ExpenseEntries não-informacionais, agrupados por Source
    /// </summary>
    public MonthSummaryResult CalculateMonthSummary(
        IEnumerable<IncomeItem> incomeItems,
        IEnumerable<FixedObligation> fixedObligations,
        IEnumerable<ExpenseEntry> expenseEntries,
        decimal emergencyReserveTarget)
    {
        var totalReceitas = incomeItems.Sum(i => i.Amount);

        var totalObrigacoesFixas = fixedObligations
            .Where(f => f.IncludeInMyAccounts)
            .Sum(f => f.Amount);

        // SaldoLivre usa apenas gastos PRÓPRIOS (SubtractFromUltra=false)
        // Terceiros (SubtractFromUltra=true) são reembolsados — não saem do bolso de Leandro
        var nonInfoExpenses = expenseEntries
            .Where(e => !e.InformationalOnly)
            .ToList();

        var meusProprios = nonInfoExpenses.Where(e => !e.SubtractFromUltra).ToList();

        var gastosPorFonte = meusProprios
            .GroupBy(e => e.Source.ToString())
            .ToDictionary(g => g.Key, g => g.Sum(e => e.Amount));

        var totalGastosPorFonte = meusProprios.Sum(e => e.Amount);

        var saldoLivre = totalReceitas
                       - totalObrigacoesFixas
                       - totalGastosPorFonte
                       - emergencyReserveTarget;

        return new MonthSummaryResult(
            totalReceitas,
            totalObrigacoesFixas,
            totalGastosPorFonte,
            emergencyReserveTarget,
            saldoLivre,
            gastosPorFonte);
    }
}
