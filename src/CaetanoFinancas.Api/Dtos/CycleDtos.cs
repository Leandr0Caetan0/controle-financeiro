using CaetanoFinancas.Api.Entities;
using CaetanoFinancas.Api.Services;

namespace CaetanoFinancas.Api.Dtos;

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
