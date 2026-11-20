namespace CaetanoFinancas.Api.Entities;

/// <summary>Item de receita associado a um ciclo mensal.</summary>
public sealed class IncomeItem
{
    public int Id { get; set; }

    public string Title { get; set; } = default!;

    public IncomeCategory Category { get; set; }

    public decimal Amount { get; set; }

    public Recurrence Recurrence { get; set; }

    /// <summary>Dia do mês em que foi/será recebido.</summary>
    public int? ReceivedDay { get; set; }

    // FK
    public string MonthCycleId { get; set; } = default!;
    public MonthCycle MonthCycle { get; set; } = default!;
}
