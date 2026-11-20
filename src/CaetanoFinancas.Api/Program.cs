using CaetanoFinancas.Api.Endpoints;
using CaetanoFinancas.Api.Infrastructure;
using CaetanoFinancas.Api.Services;
using Microsoft.EntityFrameworkCore;
using Scalar.AspNetCore;
using System.Text.Json.Serialization;

var builder = WebApplication.CreateBuilder(args);

// ── Serviços ──────────────────────────────────────────────────────────────────

builder.Services.AddOpenApi();

// Evita referência circular + serializa enums como string (ex: "Exata" em vez de 0)
builder.Services.ConfigureHttpJsonOptions(options =>
{
    options.SerializerOptions.ReferenceHandler = ReferenceHandler.IgnoreCycles;
    options.SerializerOptions.DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull;
    options.SerializerOptions.Converters.Add(new JsonStringEnumConverter());
});

var dbPath = builder.Configuration.GetConnectionString("DefaultConnection")
    ?? "Data Source=caetanofinancas.db";

builder.Services.AddDbContext<AppDbContext>(opt =>
    opt.UseSqlite(dbPath));

builder.Services.AddScoped<FinancialCalculationService>();

var app = builder.Build();

// ── Migração automática + WAL + Seed ─────────────────────────────────────────
using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    db.Database.EnsureCreated();
    db.Database.ExecuteSqlRaw("PRAGMA journal_mode=WAL;");
    await DbSeeder.SeedAsync(db);
}

// ── OpenAPI / Scalar ──────────────────────────────────────────────────────────
if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
    app.MapScalarApiReference(opt =>
    {
        opt.Title = "CaetanoFinanças API";
        opt.Theme = ScalarTheme.Purple;
    });
}

// ── Endpoints de ciclos (novos — agrupados e ricos) ───────────────────────────
app.MapCycleEndpoints();
app.MapImportEndpoints();

// ── Endpoints legados (CRUD simples) ─────────────────────────────────────────

// MonthCycle CRUD básico
var cyclesLegacy = app.MapGroup("/api/month-cycles").WithTags("MonthCycle (legado)");

cyclesLegacy.MapGet("/", async (AppDbContext db) =>
    await db.MonthCycles.OrderByDescending(x => x.Id).ToListAsync());

cyclesLegacy.MapGet("/{id}", async (string id, AppDbContext db) =>
    await db.MonthCycles.FindAsync(id) is { } c ? Results.Ok(c) : Results.NotFound());

cyclesLegacy.MapPost("/", async (CaetanoFinancas.Api.Entities.MonthCycle cycle, AppDbContext db) =>
{
    db.MonthCycles.Add(cycle);
    await db.SaveChangesAsync();
    return Results.Created($"/api/month-cycles/{cycle.Id}", cycle);
});

cyclesLegacy.MapDelete("/{id}", async (string id, AppDbContext db) =>
{
    var existing = await db.MonthCycles.FindAsync(id);
    if (existing is null) return Results.NotFound();
    db.MonthCycles.Remove(existing);
    await db.SaveChangesAsync();
    return Results.NoContent();
});

// ThirdPartyPerson CRUD
var people = app.MapGroup("/api/third-party-persons").WithTags("ThirdPartyPerson");

people.MapGet("/", async (AppDbContext db) =>
    await db.ThirdPartyPersons.ToListAsync());

people.MapPost("/", async (CaetanoFinancas.Api.Entities.ThirdPartyPerson person, AppDbContext db) =>
{
    db.ThirdPartyPersons.Add(person);
    await db.SaveChangesAsync();
    return Results.Created($"/api/third-party-persons/{person.Id}", person);
});

people.MapDelete("/{id}", async (string id, AppDbContext db) =>
{
    var person = await db.ThirdPartyPersons.FindAsync(id);
    if (person is null) return Results.NotFound();
    db.ThirdPartyPersons.Remove(person);
    await db.SaveChangesAsync();
    return Results.NoContent();
});

app.Run();

public partial class Program { }
