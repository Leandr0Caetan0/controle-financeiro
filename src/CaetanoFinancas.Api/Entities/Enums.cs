namespace CaetanoFinancas.Api.Entities;

public enum IncomeCategory
{
    Clt,
    Cft,
    Ferias,
    Ppr,
    Outros
}

public enum Recurrence
{
    Mensal,
    Pontual
}

public enum ExpenseSource
{
    NubankUltra,
    AmazonCard,
    Piques,
    BoletoOutros
}

/// <summary>Sub-rótulo indicando de qual terceiro é o gasto: J, U ou C.</summary>
public enum SubTag
{
    J,
    U,
    C
}
