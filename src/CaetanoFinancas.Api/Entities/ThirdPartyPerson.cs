namespace CaetanoFinancas.Api.Entities;

/// <summary>Terceiro que compartilha gastos no ciclo financeiro.</summary>
public sealed class ThirdPartyPerson
{
    /// <summary>Identificador textual (ex: "joao", "fulano").</summary>
    public string Id { get; set; } = default!;

    public string Name { get; set; } = default!;

    /// <summary>Relacionamento (ex: "Cônjuge", "Filho", "Amigo").</summary>
    public string Relationship { get; set; } = default!;

    /// <summary>Dia padrão de vencimento das cobranças para esta pessoa.</summary>
    public int? DefaultDueDay { get; set; }

    /// <summary>Indica se a cobrança é recorrente mensalmente.</summary>
    public bool IsRecurring { get; set; }

    // Navegação
    public List<ExpenseEntry> ExpenseEntries { get; set; } = [];
}
