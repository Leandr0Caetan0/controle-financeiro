using CaetanoFinancas.Api.Infrastructure;
using CaetanoFinancas.Api.Services;
using Microsoft.EntityFrameworkCore;
using Scalar.AspNetCore;
using System.Text.Json.Serialization;

var builder = WebApplication.CreateBuilder(args);

// ── Serviços ──────────────────────────────────────────────────────────────────

builder.Services
    .AddControllers(options =>
    {
        // As entidades têm propriedades de navegação não-anuláveis (ex: MonthCycle, Owner).
        // Sem isso, o [ApiController] devolveria 400 exigindo esses campos no body.
        options.SuppressImplicitRequiredAttributeForNonNullableReferenceTypes = true;
    })
    .AddJsonOptions(options =>
    {
        // Evita referência circular + serializa enums como string (ex: "Exata" em vez de 0)
        options.JsonSerializerOptions.ReferenceHandler = ReferenceHandler.IgnoreCycles;
        options.JsonSerializerOptions.DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull;
        options.JsonSerializerOptions.Converters.Add(new JsonStringEnumConverter());
    });

builder.Services.AddOpenApi();

// CORS — permite chamadas do frontend Vercel e localhost
builder.Services.AddCors(options => options.AddDefaultPolicy(p =>
    p.AllowAnyOrigin().AllowAnyHeader().AllowAnyMethod()));

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

app.UseCors();

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

// ── Controllers (Controllers/*.cs) ────────────────────────────────────────────
app.MapControllers();

app.Run();

public partial class Program { }
