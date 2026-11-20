namespace CaetanoFinancas.Api.Entities;

/// <summary>
/// Lançamento de despesa. Amount aceita valores negativos para abatimentos/estornos.
/// </summary>
public sealed class ExpenseEntry
{
    public int Id { get; set; }

    public string Description { get; set; } = default!;

    /// <summary>Valor do gasto. Negativo = abatimento/estorno.</summary>
    public decimal Amount { get; set; }

    public DateOnly Date { get; set; }

    /// <summary>Dia de vencimento (crédito, parcela etc.).</summary>
    public int? DueDay { get; set; }

    public ExpenseSource Source { get; set; }

    /// <summary>FK para ThirdPartyPerson. Null = gasto do próprio titular.</summary>
    public string? OwnerId { get; set; }
    public ThirdPartyPerson? Owner { get; set; }

    /// <summary>Sub-rótulo do terceiro: J, U ou C. Null = gasto próprio.</summary>
    public SubTag? SubTag { get; set; }

    /// <summary>Tag/categoria livre (ex: "Alimentação", "Transporte").</summary>
    public string Tag { get; set; } = default!;

    public int? InstallmentCurrent { get; set; }

    public int? InstallmentTotal { get; set; }

    /// <summary>
    /// Se true, este valor deve ser subtraído da fatura Ultra na conciliação
    /// (gasto de terceiro pago via NubankUltra).
    /// </summary>
    public bool SubtractFromUltra { get; set; }

    /// <summary>
    /// Apenas informativo (ex: empréstimo externo Itaú Dia 22).
    /// Não entra nos cálculos de saldo, mas aparece listado.
    /// </summary>
    public bool InformationalOnly { get; set; }

    /// <summary>Alerta crítico — destaca o item visualmente.</summary>
    public bool CriticalAlert { get; set; }

    // FK
    public string MonthCycleId { get; set; } = default!;
    public MonthCycle MonthCycle { get; set; } = default!;
}
