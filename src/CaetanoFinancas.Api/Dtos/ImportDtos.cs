namespace CaetanoFinancas.Api.Dtos;

/// <summary>Payload enviado pelo frontend com as linhas CSV mapeadas.</summary>
public sealed record CsvImportRequest(
    string CycleId,
    string Sheet,                   // "receitas" | "obrigacoes" | "lancamentos" | "ultra"
    List<Dictionary<string, string>> Rows
);

public sealed record CsvImportResult(int Created, int Skipped, List<string> Errors);
