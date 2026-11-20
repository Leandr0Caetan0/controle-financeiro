using CaetanoFinancas.Api.Entities;
using CaetanoFinancas.Api.Infrastructure;
using CaetanoFinancas.Api.Services;
using Microsoft.EntityFrameworkCore;

namespace CaetanoFinancas.Api.Endpoints;

// ── DTOs ─────────────────────────────────────────────────────────────────────

public sealed record CycleSummaryDto(
    string Id,
    string Label,
    DateOnly ReferencePeriod,
    decimal UltraInvoiceTotal,
    decimal TotalReceitas,
    decimal TotalObrigacoes,
    decimal TotalGastos,
    decimal SaldoLivre,
    ReconciliationStatus ReconciliationStatus
);

public sealed record CycleDetailDto(
    MonthCycle Cycle,
    MonthSummaryResult Summary,
    UltraReconciliationResult Reconciliation,
    ThirdPartySummaryResult ThirdParty
);

public sealed record UpdateCycleRequest(
    decimal UltraInvoiceTotal,
    decimal EmergencyReserveTarget,
    List<IncomeItem>? Incomes,
    List<FixedObligation>? Obligations
);

public sealed record PatchEntryRequest(
    string? Description,
    decimal? Amount,
    DateOnly? Date,
    int? DueDay,
    ExpenseSource? Source,
    string? OwnerId,
    SubTag? SubTag,
    string? Tag,
    int? InstallmentCurrent,
    int? InstallmentTotal,
    bool? SubtractFromUltra,
    bool? InformationalOnly,
    bool? CriticalAlert
);

// ── Registro de endpoints ─────────────────────────────────────────────────────

public static class CycleEndpoints
{
    public static void MapCycleEndpoints(this WebApplication app)
    {
        var group = app.MapGroup("/api/cycles").WithTags("Cycles");

        // GET /api/cycles — lista com summary calculado
        group.MapGet("/", async (AppDbContext db, FinancialCalculationService svc) =>
        {
            var cycles = await db.MonthCycles
                .Include(c => c.IncomeItems)
                .Include(c => c.FixedObligations)
                .Include(c => c.ExpenseEntries)
                .OrderByDescending(c => c.Id)
                .ToListAsync();

            var summaries = cycles.Select(c =>
            {
                var summary = svc.CalculateMonthSummary(
                    c.IncomeItems, c.FixedObligations, c.ExpenseEntries,
                    c.EmergencyReserveTarget);

                var recon = svc.CalculateUltraReconciliation(
                    c.UltraInvoiceTotal, c.FixedObligations, c.ExpenseEntries);

                return new CycleSummaryDto(
                    c.Id, c.Label, c.ReferencePeriod,
                    c.UltraInvoiceTotal,
                    summary.TotalReceitas,
                    summary.TotalObrigacoesFixas,
                    summary.TotalGastosPorFonte,
                    summary.SaldoLivreDoMes,
                    recon.Status);
            }).ToList();

            return Results.Ok(summaries);
        });

        // GET /api/cycles/{id} — detalhe completo
        group.MapGet("/{id}", async (string id, AppDbContext db, FinancialCalculationService svc) =>
        {
            var cycle = await db.MonthCycles
                .Include(c => c.IncomeItems)
                .Include(c => c.FixedObligations)
                .Include(c => c.ExpenseEntries)
                    .ThenInclude(e => e.Owner)
                .FirstOrDefaultAsync(c => c.Id == id);

            if (cycle is null) return Results.NotFound();

            var summary = svc.CalculateMonthSummary(
                cycle.IncomeItems, cycle.FixedObligations, cycle.ExpenseEntries,
                cycle.EmergencyReserveTarget);

            var recon = svc.CalculateUltraReconciliation(
                cycle.UltraInvoiceTotal, cycle.FixedObligations, cycle.ExpenseEntries);

            var thirdParty = svc.CalculateThirdPartySummaries(cycle.ExpenseEntries);

            return Results.Ok(new CycleDetailDto(cycle, summary, recon, thirdParty));
        });

        // PUT /api/cycles/{id} — atualiza fatura, reserva, receitas e obrigações
        group.MapPut("/{id}", async (
            string id,
            UpdateCycleRequest req,
            AppDbContext db) =>
        {
            var cycle = await db.MonthCycles
                .Include(c => c.IncomeItems)
                .Include(c => c.FixedObligations)
                .FirstOrDefaultAsync(c => c.Id == id);

            if (cycle is null) return Results.NotFound();

            cycle.UltraInvoiceTotal = req.UltraInvoiceTotal;
            cycle.EmergencyReserveTarget = req.EmergencyReserveTarget;

            // Substituir receitas
            if (req.Incomes is not null)
            {
                db.IncomeItems.RemoveRange(cycle.IncomeItems);
                foreach (var income in req.Incomes)
                {
                    income.Id = 0;
                    income.MonthCycleId = id;
                    db.IncomeItems.Add(income);
                }
            }

            // Substituir obrigações
            if (req.Obligations is not null)
            {
                db.FixedObligations.RemoveRange(cycle.FixedObligations);
                foreach (var obl in req.Obligations)
                {
                    obl.Id = 0;
                    obl.MonthCycleId = id;
                    db.FixedObligations.Add(obl);
                }
            }

            await db.SaveChangesAsync();
            return Results.Ok(cycle);
        });

        // POST /api/cycles/{id}/entries — lançamento único ou lote
        group.MapPost("/{id}/entries", async (
            string id,
            List<ExpenseEntry> entries,
            AppDbContext db) =>
        {
            if (!await db.MonthCycles.AnyAsync(c => c.Id == id))
                return Results.NotFound();

            foreach (var entry in entries)
            {
                entry.Id = 0;
                entry.MonthCycleId = id;
                db.ExpenseEntries.Add(entry);
            }

            await db.SaveChangesAsync();
            return Results.Created($"/api/cycles/{id}/entries", entries);
        });

        // PATCH /api/cycles/{id}/entries/{entryId}
        group.MapPatch("/{id}/entries/{entryId:int}", async (
            string id,
            int entryId,
            PatchEntryRequest patch,
            AppDbContext db) =>
        {
            var entry = await db.ExpenseEntries
                .FirstOrDefaultAsync(e => e.Id == entryId && e.MonthCycleId == id);

            if (entry is null) return Results.NotFound();

            if (patch.Description is not null)      entry.Description      = patch.Description;
            if (patch.Amount is not null)           entry.Amount           = patch.Amount.Value;
            if (patch.Date is not null)             entry.Date             = patch.Date.Value;
            if (patch.DueDay is not null)           entry.DueDay           = patch.DueDay;
            if (patch.Source is not null)           entry.Source           = patch.Source.Value;
            if (patch.OwnerId is not null)          entry.OwnerId          = patch.OwnerId;
            if (patch.SubTag is not null)           entry.SubTag           = patch.SubTag;
            if (patch.Tag is not null)              entry.Tag              = patch.Tag;
            if (patch.InstallmentCurrent is not null) entry.InstallmentCurrent = patch.InstallmentCurrent;
            if (patch.InstallmentTotal is not null) entry.InstallmentTotal  = patch.InstallmentTotal;
            if (patch.SubtractFromUltra is not null) entry.SubtractFromUltra = patch.SubtractFromUltra.Value;
            if (patch.InformationalOnly is not null) entry.InformationalOnly = patch.InformationalOnly.Value;
            if (patch.CriticalAlert is not null)    entry.CriticalAlert    = patch.CriticalAlert.Value;

            await db.SaveChangesAsync();
            return Results.Ok(entry);
        });

        // DELETE /api/cycles/{id}/entries/{entryId}
        group.MapDelete("/{id}/entries/{entryId:int}", async (
            string id,
            int entryId,
            AppDbContext db) =>
        {
            var entry = await db.ExpenseEntries
                .FirstOrDefaultAsync(e => e.Id == entryId && e.MonthCycleId == id);

            if (entry is null) return Results.NotFound();

            db.ExpenseEntries.Remove(entry);
            await db.SaveChangesAsync();
            return Results.NoContent();
        });

        // POST /api/cycles/{id}/next — clona para o mês seguinte
        group.MapPost("/{id}/next", async (string id, AppDbContext db) =>
        {
            var current = await db.MonthCycles
                .Include(c => c.IncomeItems)
                .Include(c => c.FixedObligations)
                .Include(c => c.ExpenseEntries)
                .FirstOrDefaultAsync(c => c.Id == id);

            if (current is null) return Results.NotFound();

            // Calcular próximo mês
            var refDate = current.ReferencePeriod;
            var nextDate = refDate.AddMonths(1);
            var nextId = nextDate.ToString("yyyy-MM");

            if (await db.MonthCycles.AnyAsync(c => c.Id == nextId))
                return Results.Conflict(new { message = $"Ciclo {nextId} já existe." });

            var monthNames = new[]
            {
                "Janeiro","Fevereiro","Março","Abril","Maio","Junho",
                "Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"
            };
            var nextLabel = $"{monthNames[nextDate.Month - 1]} {nextDate.Year}";

            var nextCycle = new MonthCycle
            {
                Id = nextId,
                Label = nextLabel,
                ReferencePeriod = nextDate,
                UltraInvoiceTotal = 0m,
                EmergencyReserveTarget = current.EmergencyReserveTarget
            };
            db.MonthCycles.Add(nextCycle);

            // Clonar receitas mensais
            foreach (var income in current.IncomeItems.Where(i => i.Recurrence == Recurrence.Mensal))
            {
                db.IncomeItems.Add(new IncomeItem
                {
                    Title = income.Title,
                    Category = income.Category,
                    Amount = income.Amount,
                    Recurrence = income.Recurrence,
                    ReceivedDay = income.ReceivedDay,
                    MonthCycleId = nextId
                });
            }

            // Clonar obrigações fixas (incrementar parcelas, remover finalizadas)
            foreach (var obl in current.FixedObligations)
            {
                if (obl.InstallmentCurrent.HasValue && obl.InstallmentTotal.HasValue)
                {
                    if (obl.InstallmentCurrent >= obl.InstallmentTotal)
                        continue; // parcela finalizada — não clonar

                    db.FixedObligations.Add(new FixedObligation
                    {
                        Title = obl.Title,
                        Amount = obl.Amount,
                        FullInvoiceAmount = obl.FullInvoiceAmount,
                        SplitPeople = obl.SplitPeople,
                        DueDay = obl.DueDay,
                        Source = obl.Source,
                        Category = obl.Category,
                        InstallmentCurrent = obl.InstallmentCurrent + 1,
                        InstallmentTotal = obl.InstallmentTotal,
                        SubtractFromUltraInvoice = obl.SubtractFromUltraInvoice,
                        CriticalAlert = obl.CriticalAlert,
                        IncludeInMyAccounts = obl.IncludeInMyAccounts,
                        Paid = false,
                        MonthCycleId = nextId
                    });
                }
                else
                {
                    // Sem parcela: obrigação recorrente mensal
                    db.FixedObligations.Add(new FixedObligation
                    {
                        Title = obl.Title,
                        Amount = obl.Amount,
                        FullInvoiceAmount = obl.FullInvoiceAmount,
                        SplitPeople = obl.SplitPeople,
                        DueDay = obl.DueDay,
                        Source = obl.Source,
                        Category = obl.Category,
                        SubtractFromUltraInvoice = obl.SubtractFromUltraInvoice,
                        CriticalAlert = obl.CriticalAlert,
                        IncludeInMyAccounts = obl.IncludeInMyAccounts,
                        Paid = false,
                        MonthCycleId = nextId
                    });
                }
            }

            // Clonar lançamentos parcelados (somente os com InstallmentCurrent < Total)
            foreach (var entry in current.ExpenseEntries
                .Where(e => e.InstallmentCurrent.HasValue && e.InstallmentTotal.HasValue))
            {
                if (entry.InstallmentCurrent >= entry.InstallmentTotal)
                    continue; // parcela finalizada

                db.ExpenseEntries.Add(new ExpenseEntry
                {
                    Description = entry.Description,
                    Amount = entry.Amount,
                    Date = nextDate,
                    DueDay = entry.DueDay,
                    Source = entry.Source,
                    OwnerId = entry.OwnerId,
                    SubTag = entry.SubTag,
                    Tag = entry.Tag,
                    InstallmentCurrent = entry.InstallmentCurrent + 1,
                    InstallmentTotal = entry.InstallmentTotal,
                    SubtractFromUltra = entry.SubtractFromUltra,
                    InformationalOnly = entry.InformationalOnly,
                    CriticalAlert = entry.CriticalAlert,
                    MonthCycleId = nextId
                });
            }

            await db.SaveChangesAsync();

            return Results.Created($"/api/cycles/{nextId}", new { id = nextId, label = nextLabel });
        });
    }
}
