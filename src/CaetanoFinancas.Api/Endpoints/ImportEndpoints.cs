using CaetanoFinancas.Api.Entities;
using CaetanoFinancas.Api.Infrastructure;
using Microsoft.EntityFrameworkCore;

namespace CaetanoFinancas.Api.Endpoints;

// ── DTOs ─────────────────────────────────────────────────────────────────────

/// <summary>Payload enviado pelo frontend com as linhas CSV mapeadas.</summary>
public sealed record CsvImportRequest(
    string CycleId,
    string Sheet,                   // "receitas" | "obrigacoes" | "lancamentos" | "ultra"
    List<Dictionary<string, string>> Rows
);

public sealed record CsvImportResult(int Created, int Skipped, List<string> Errors);

// ── Endpoints ─────────────────────────────────────────────────────────────────

public static class ImportEndpoints
{
    public static void MapImportEndpoints(this WebApplication app)
    {
        var g = app.MapGroup("/api/import").WithTags("Import");

        /// <summary>
        /// Importa linhas CSV mapeadas pelo frontend.
        /// O frontend já resolveu o mapeamento de colunas; este endpoint só persiste.
        /// </summary>
        g.MapPost("/csv", async (CsvImportRequest req, AppDbContext db) =>
        {
            if (!await db.MonthCycles.AnyAsync(c => c.Id == req.CycleId))
                return Results.NotFound(new { error = $"Ciclo '{req.CycleId}' não existe." });

            var created = 0;
            var skipped = 0;
            var errors  = new List<string>();

            foreach (var (row, i) in req.Rows.Select((r, i) => (r, i)))
            {
                try
                {
                    switch (req.Sheet.ToLowerInvariant())
                    {
                        case "receitas":
                            if (CreateIncome(row, req.CycleId, db)) created++;
                            else skipped++;
                            break;

                        case "obrigacoes":
                            if (CreateObligation(row, req.CycleId, db)) created++;
                            else skipped++;
                            break;

                        case "lancamentos":
                            if (CreateEntry(row, req.CycleId, db)) created++;
                            else skipped++;
                            break;

                        case "ultra":
                            await UpdateUltraTotal(row, req.CycleId, db);
                            created++;
                            break;

                        default:
                            errors.Add($"Aba desconhecida: {req.Sheet}");
                            break;
                    }
                }
                catch (Exception ex)
                {
                    errors.Add($"Linha {i + 1}: {ex.Message}");
                    skipped++;
                }
            }

            await db.SaveChangesAsync();
            return Results.Ok(new CsvImportResult(created, skipped, errors));
        });
    }

    // ── Helpers de criação ────────────────────────────────────────────────────

    private static bool CreateIncome(Dictionary<string, string> row, string cycleId, AppDbContext db)
    {
        var title = Get(row, "titulo", "descricao", "title", "description");
        var amountStr = Get(row, "valor", "amount", "receita");
        if (string.IsNullOrWhiteSpace(title) || !TryParseDecimal(amountStr, out var amount))
            return false;

        var categoryStr = Get(row, "categoria", "category", "tipo");
        var recurrenceStr = Get(row, "recorrencia", "recurrence", "tipo_recorrencia");

        db.IncomeItems.Add(new IncomeItem
        {
            Title       = title,
            Amount      = amount,
            Category    = ParseEnum<IncomeCategory>(categoryStr, IncomeCategory.Outros),
            Recurrence  = ParseEnum<Recurrence>(recurrenceStr, Recurrence.Mensal),
            ReceivedDay = TryParseInt(Get(row, "dia", "day", "dia_recebimento")),
            MonthCycleId = cycleId,
        });
        return true;
    }

    private static bool CreateObligation(Dictionary<string, string> row, string cycleId, AppDbContext db)
    {
        var title = Get(row, "titulo", "descricao", "title");
        var amountStr = Get(row, "valor", "minha_parte", "amount");
        if (string.IsNullOrWhiteSpace(title) || !TryParseDecimal(amountStr, out var amount))
            return false;

        var fullStr  = Get(row, "valor_cheio", "full_amount", "fatura_total");
        var sourceStr = Get(row, "fonte", "source", "cartao");

        TryParseDecimal(fullStr, out var fullAmount);
        var installParts = Get(row, "parcela", "installment").Split('/');

        db.FixedObligations.Add(new FixedObligation
        {
            Title                 = title,
            Amount                = amount,
            FullInvoiceAmount     = fullAmount > 0 ? fullAmount : null,
            SplitPeople           = TryParseInt(Get(row, "divisao", "split_people")),
            DueDay                = TryParseInt(Get(row, "vencimento", "due_day", "dia")) ?? 10,
            Source                = ParseEnum<ExpenseSource>(sourceStr, ExpenseSource.BoletoOutros),
            Category              = Get(row, "categoria", "category") is { Length: > 0 } cat ? cat : "Importado",
            InstallmentCurrent    = installParts.Length == 2 ? TryParseInt(installParts[0]) : null,
            InstallmentTotal      = installParts.Length == 2 ? TryParseInt(installParts[1]) : null,
            SubtractFromUltraInvoice = ParseBool(Get(row, "abater_ultra", "subtract_ultra")),
            CriticalAlert         = ParseBool(Get(row, "alerta", "critical_alert")),
            IncludeInMyAccounts   = !ParseBool(Get(row, "informativo", "informational")),
            Paid                  = ParseBool(Get(row, "pago", "paid")),
            MonthCycleId          = cycleId,
        });
        return true;
    }

    private static bool CreateEntry(Dictionary<string, string> row, string cycleId, AppDbContext db)
    {
        var desc = Get(row, "descricao", "description", "titulo", "title");
        var amountStr = Get(row, "valor", "amount");
        if (string.IsNullOrWhiteSpace(desc) || !TryParseDecimal(amountStr, out var amount))
            return false;

        var dateStr   = Get(row, "data", "date", "dia");
        var sourceStr = Get(row, "fonte", "source", "cartao");
        var subTagStr = Get(row, "subtag", "sub_tag", "pessoa_tag");
        var installParts = Get(row, "parcela", "installment").Split('/');

        db.ExpenseEntries.Add(new ExpenseEntry
        {
            Description       = desc,
            Amount            = amount,
            Date              = TryParseDate(dateStr) ?? DateOnly.FromDateTime(DateTime.Today),
            Source            = ParseEnum<ExpenseSource>(sourceStr, ExpenseSource.NubankUltra),
            OwnerId           = Get(row, "dono", "owner_id") is { Length: > 0 } o ? o : null,
            SubTag            = ParseNullableEnum<SubTag>(subTagStr),
            Tag               = Get(row, "tag", "categoria") is { Length: > 0 } t ? t : "Importado",
            InstallmentCurrent = installParts.Length == 2 ? TryParseInt(installParts[0]) : null,
            InstallmentTotal  = installParts.Length == 2 ? TryParseInt(installParts[1]) : null,
            SubtractFromUltra = ParseBool(Get(row, "abater_ultra", "subtract_ultra")),
            InformationalOnly = ParseBool(Get(row, "informativo", "informational_only")),
            CriticalAlert     = ParseBool(Get(row, "alerta", "critical_alert")),
            MonthCycleId      = cycleId,
        });
        return true;
    }

    private static async Task UpdateUltraTotal(Dictionary<string, string> row, string cycleId, AppDbContext db)
    {
        var totalStr = Get(row, "total", "fatura_total", "ultra_total", "valor");
        if (!TryParseDecimal(totalStr, out var total)) return;
        var cycle = await db.MonthCycles.FindAsync(cycleId);
        if (cycle is not null) cycle.UltraInvoiceTotal = total;
    }

    // ── Utilitários ───────────────────────────────────────────────────────────

    private static string Get(Dictionary<string, string> row, params string[] keys)
    {
        foreach (var key in keys)
        {
            // Busca case-insensitive e ignora espaços
            var match = row.Keys.FirstOrDefault(k =>
                string.Equals(k.Trim(), key.Trim(), StringComparison.OrdinalIgnoreCase));
            if (match is not null && !string.IsNullOrWhiteSpace(row[match]))
                return row[match].Trim();
        }
        return string.Empty;
    }

    private static bool TryParseDecimal(string s, out decimal value)
    {
        value = 0;
        if (string.IsNullOrWhiteSpace(s)) return false;
        // "R$ 1.234,56" → "1234.56"
        var clean = s.Replace("R$", "").Replace(" ", "")
                     .Replace(".", "").Replace(",", ".");
        return decimal.TryParse(clean, System.Globalization.NumberStyles.Any,
                                System.Globalization.CultureInfo.InvariantCulture, out value);
    }

    private static int? TryParseInt(string? s)
        => int.TryParse(s?.Trim(), out var v) ? v : null;

    private static DateOnly? TryParseDate(string s)
    {
        if (string.IsNullOrWhiteSpace(s)) return null;
        if (DateOnly.TryParseExact(s, ["dd/MM/yyyy", "yyyy-MM-dd", "d/M/yyyy", "MM/yyyy"],
            null, System.Globalization.DateTimeStyles.None, out var d))
            return d;
        return null;
    }

    private static bool ParseBool(string s)
        => s.ToLowerInvariant() is "sim" or "yes" or "true" or "1" or "x";

    private static T ParseEnum<T>(string s, T defaultValue) where T : struct, Enum
        => Enum.TryParse<T>(s, ignoreCase: true, out var r) ? r : defaultValue;

    private static T? ParseNullableEnum<T>(string s) where T : struct, Enum
        => Enum.TryParse<T>(s, ignoreCase: true, out var r) ? r : null;
}
