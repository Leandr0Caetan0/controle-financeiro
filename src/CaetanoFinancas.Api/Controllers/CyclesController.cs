using CaetanoFinancas.Api.Dtos;
using CaetanoFinancas.Api.Entities;
using CaetanoFinancas.Api.Infrastructure;
using CaetanoFinancas.Api.Services;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace CaetanoFinancas.Api.Controllers;

/// <summary>
/// Um "ciclo" (MonthCycle) representa um mês financeiro, ex: "2026-12".
/// Agrupa receitas, obrigações fixas e lançamentos daquele mês.
/// </summary>
[ApiController]
[Route("api/cycles")]
public class CyclesController : ControllerBase
{
    private static readonly string[] MonthNames =
    {
        "Janeiro","Fevereiro","Março","Abril","Maio","Junho",
        "Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"
    };

    private readonly AppDbContext _db;
    private readonly FinancialCalculationService _svc;

    public CyclesController(AppDbContext db, FinancialCalculationService svc)
    {
        _db = db;
        _svc = svc;
    }

    // GET /api/cycles — lista com summary calculado
    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        var cycles = await _db.MonthCycles
            .Include(c => c.IncomeItems)
            .Include(c => c.FixedObligations)
            .Include(c => c.ExpenseEntries)
            .OrderByDescending(c => c.Id)
            .ToListAsync();

        var summaries = cycles.Select(c =>
        {
            var summary = _svc.CalculateMonthSummary(
                c.IncomeItems, c.FixedObligations, c.ExpenseEntries,
                c.EmergencyReserveTarget);

            var recon = _svc.CalculateUltraReconciliation(
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

        return Ok(summaries);
    }

    // GET /api/cycles/{id} — detalhe completo
    [HttpGet("{id}")]
    public async Task<IActionResult> GetById(string id)
    {
        var cycle = await _db.MonthCycles
            .Include(c => c.IncomeItems)
            .Include(c => c.FixedObligations)
            .Include(c => c.ExpenseEntries)
                .ThenInclude(e => e.Owner)
            .FirstOrDefaultAsync(c => c.Id == id);

        if (cycle is null) return NotFound();

        var summary = _svc.CalculateMonthSummary(
            cycle.IncomeItems, cycle.FixedObligations, cycle.ExpenseEntries,
            cycle.EmergencyReserveTarget);

        var recon = _svc.CalculateUltraReconciliation(
            cycle.UltraInvoiceTotal, cycle.FixedObligations, cycle.ExpenseEntries);

        var thirdParty = _svc.CalculateThirdPartySummaries(cycle.ExpenseEntries);

        return Ok(new CycleDetailDto(cycle, summary, recon, thirdParty));
    }

    // PUT /api/cycles/{id} — atualiza fatura, reserva, receitas e obrigações
    [HttpPut("{id}")]
    public async Task<IActionResult> Update(string id, [FromBody] UpdateCycleRequest req)
    {
        var cycle = await _db.MonthCycles
            .Include(c => c.IncomeItems)
            .Include(c => c.FixedObligations)
            .FirstOrDefaultAsync(c => c.Id == id);

        if (cycle is null) return NotFound();

        cycle.UltraInvoiceTotal = req.UltraInvoiceTotal;
        cycle.EmergencyReserveTarget = req.EmergencyReserveTarget;

        // Substituir receitas
        if (req.Incomes is not null)
        {
            _db.IncomeItems.RemoveRange(cycle.IncomeItems);
            foreach (var income in req.Incomes)
            {
                income.Id = 0;
                income.MonthCycleId = id;
                _db.IncomeItems.Add(income);
            }
        }

        // Substituir obrigações
        if (req.Obligations is not null)
        {
            _db.FixedObligations.RemoveRange(cycle.FixedObligations);
            foreach (var obl in req.Obligations)
            {
                obl.Id = 0;
                obl.MonthCycleId = id;
                _db.FixedObligations.Add(obl);
            }
        }

        await _db.SaveChangesAsync();
        return Ok(cycle);
    }

    // POST /api/cycles/{id}/entries — lançamento único ou lote
    [HttpPost("{id}/entries")]
    public async Task<IActionResult> AddEntries(string id, [FromBody] List<ExpenseEntry> entries)
    {
        var cycle = await _db.MonthCycles.FindAsync(id);
        if (cycle is null) return NotFound();

        foreach (var entry in entries)
        {
            entry.Id = 0;
            entry.MonthCycleId = id;
            _db.ExpenseEntries.Add(entry);

            // Lançamento pessoal no Nubank Ultra → atualiza fatura automaticamente
            if (entry.Source == ExpenseSource.NubankUltra &&
                !entry.SubtractFromUltra &&
                !entry.InformationalOnly)
            {
                cycle.UltraInvoiceTotal += entry.Amount;
            }
        }

        await _db.SaveChangesAsync();
        return Created($"/api/cycles/{id}/entries", entries);
    }

    // PATCH /api/cycles/{id}/entries/{entryId}
    [HttpPatch("{id}/entries/{entryId:int}")]
    public async Task<IActionResult> PatchEntry(string id, int entryId, [FromBody] PatchEntryRequest patch)
    {
        var entry = await _db.ExpenseEntries
            .FirstOrDefaultAsync(e => e.Id == entryId && e.MonthCycleId == id);

        if (entry is null) return NotFound();

        if (patch.Description is not null)        entry.Description        = patch.Description;
        if (patch.Amount is not null)             entry.Amount             = patch.Amount.Value;
        if (patch.Date is not null)               entry.Date               = patch.Date.Value;
        if (patch.DueDay is not null)             entry.DueDay             = patch.DueDay;
        if (patch.Source is not null)             entry.Source             = patch.Source.Value;
        if (patch.OwnerId is not null)            entry.OwnerId            = patch.OwnerId;
        if (patch.SubTag is not null)             entry.SubTag             = patch.SubTag;
        if (patch.Tag is not null)                entry.Tag                = patch.Tag;
        if (patch.InstallmentCurrent is not null) entry.InstallmentCurrent = patch.InstallmentCurrent;
        if (patch.InstallmentTotal is not null)   entry.InstallmentTotal   = patch.InstallmentTotal;
        if (patch.SubtractFromUltra is not null)  entry.SubtractFromUltra  = patch.SubtractFromUltra.Value;
        if (patch.InformationalOnly is not null)  entry.InformationalOnly  = patch.InformationalOnly.Value;
        if (patch.CriticalAlert is not null)      entry.CriticalAlert      = patch.CriticalAlert.Value;

        await _db.SaveChangesAsync();
        return Ok(entry);
    }

    // DELETE /api/cycles/{id}/entries/{entryId}
    [HttpDelete("{id}/entries/{entryId:int}")]
    public async Task<IActionResult> DeleteEntry(string id, int entryId)
    {
        var entry = await _db.ExpenseEntries
            .FirstOrDefaultAsync(e => e.Id == entryId && e.MonthCycleId == id);

        if (entry is null) return NotFound();

        // Se era gasto pessoal no Nubank Ultra, reverte da fatura
        if (entry.Source == ExpenseSource.NubankUltra &&
            !entry.SubtractFromUltra &&
            !entry.InformationalOnly)
        {
            var cycle = await _db.MonthCycles.FindAsync(id);
            if (cycle is not null)
                cycle.UltraInvoiceTotal = Math.Max(0m, cycle.UltraInvoiceTotal - entry.Amount);
        }

        _db.ExpenseEntries.Remove(entry);
        await _db.SaveChangesAsync();
        return NoContent();
    }

    // POST /api/cycles/{id}/next — clona para o mês seguinte
    [HttpPost("{id}/next")]
    public async Task<IActionResult> CreateNext(string id)
    {
        var current = await _db.MonthCycles
            .Include(c => c.IncomeItems)
            .Include(c => c.FixedObligations)
            .Include(c => c.ExpenseEntries)
            .FirstOrDefaultAsync(c => c.Id == id);

        if (current is null) return NotFound();

        // Calcular próximo mês
        var nextDate = current.ReferencePeriod.AddMonths(1);
        var nextId = nextDate.ToString("yyyy-MM");

        if (await _db.MonthCycles.AnyAsync(c => c.Id == nextId))
            return Conflict(new { message = $"Ciclo {nextId} já existe." });

        var nextLabel = $"{MonthNames[nextDate.Month - 1]} {nextDate.Year}";

        var nextCycle = new MonthCycle
        {
            Id = nextId,
            Label = nextLabel,
            ReferencePeriod = nextDate,
            UltraInvoiceTotal = 0m,
            EmergencyReserveTarget = current.EmergencyReserveTarget
        };
        _db.MonthCycles.Add(nextCycle);

        // Clonar receitas mensais
        foreach (var income in current.IncomeItems.Where(i => i.Recurrence == Recurrence.Mensal))
        {
            _db.IncomeItems.Add(new IncomeItem
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

                _db.FixedObligations.Add(new FixedObligation
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
                _db.FixedObligations.Add(new FixedObligation
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

            _db.ExpenseEntries.Add(new ExpenseEntry
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

        await _db.SaveChangesAsync();

        return Created($"/api/cycles/{nextId}", new { id = nextId, label = nextLabel });
    }
}
