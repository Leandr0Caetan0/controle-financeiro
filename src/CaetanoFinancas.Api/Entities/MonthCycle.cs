namespace CaetanoFinancas.Api.Entities;

/// <summary>
/// Ciclo mensal de controle financeiro. Id no formato "YYYY-MM" (ex: "2026-11").
/// </summary>
public sealed class MonthCycle
{
    /// <summary>Chave primária no formato "YYYY-MM".</summary>
    public string Id { get; set; } = default!;

    /// <summary>Rótulo amigável (ex: "Novembro 2026").</summary>
    public string Label { get; set; } = default!;

    /// <summary>Primeiro dia do mês de referência.</summary>
    public DateOnly ReferencePeriod { get; set; }

    /// <summary>Total da fatura Nubank Ultra deste ciclo.</summary>
    public decimal UltraInvoiceTotal { get; set; }

    /// <summary>Meta de reserva de emergência para o mês.</summary>
    public decimal EmergencyReserveTarget { get; set; }

    // Navegação
    public List<IncomeItem> IncomeItems { get; set; } = [];
    public List<FixedObligation> FixedObligations { get; set; } = [];
    public List<ExpenseEntry> ExpenseEntries { get; set; } = [];
}
