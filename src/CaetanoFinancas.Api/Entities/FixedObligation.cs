namespace CaetanoFinancas.Api.Entities;

/// <summary>
/// Obrigação fixa mensal (assinatura, parcela, boleto etc.).
/// </summary>
public sealed class FixedObligation
{
    public int Id { get; set; }

    public string Title { get; set; } = default!;

    /// <summary>Minha parte do valor (após divisão, se houver).</summary>
    public decimal Amount { get; set; }

    /// <summary>
    /// Valor cheio na fatura antes de dividir.
    /// Usado na conciliação do Ultra quando SubtractFromUltraInvoice = true.
    /// </summary>
    public decimal? FullInvoiceAmount { get; set; }

    /// <summary>Número de pessoas que dividem o custo.</summary>
    public int? SplitPeople { get; set; }

    public int DueDay { get; set; }

    public ExpenseSource Source { get; set; }

    public string Category { get; set; } = default!;

    public int? InstallmentCurrent { get; set; }

    public int? InstallmentTotal { get; set; }

    /// <summary>
    /// Se true, o FullInvoiceAmount é descontado do total da fatura Ultra
    /// na conciliação (assinatura paga pelo Ultra, possivelmente dividida).
    /// </summary>
    public bool SubtractFromUltraInvoice { get; set; }

    /// <summary>Alerta crítico — destaca o item visualmente.</summary>
    public bool CriticalAlert { get; set; }

    /// <summary>Incluir este item nos meus saldos/contas pessoais.</summary>
    public bool IncludeInMyAccounts { get; set; }

    public bool Paid { get; set; }

    // FK
    public string MonthCycleId { get; set; } = default!;
    public MonthCycle MonthCycle { get; set; } = default!;
}
