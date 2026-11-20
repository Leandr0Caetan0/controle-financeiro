using CaetanoFinancas.Api.Entities;
using Microsoft.EntityFrameworkCore;

namespace CaetanoFinancas.Api.Infrastructure;

public sealed class AppDbContext(DbContextOptions<AppDbContext> options) : DbContext(options)
{
    public DbSet<MonthCycle> MonthCycles => Set<MonthCycle>();
    public DbSet<IncomeItem> IncomeItems => Set<IncomeItem>();
    public DbSet<FixedObligation> FixedObligations => Set<FixedObligation>();
    public DbSet<ExpenseEntry> ExpenseEntries => Set<ExpenseEntry>();
    public DbSet<ThirdPartyPerson> ThirdPartyPersons => Set<ThirdPartyPerson>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        // ── MonthCycle ──────────────────────────────────────────────────────
        modelBuilder.Entity<MonthCycle>(e =>
        {
            e.HasKey(x => x.Id);
            e.Property(x => x.Id).HasMaxLength(7); // "YYYY-MM"
            e.Property(x => x.Label).IsRequired().HasMaxLength(50);
            e.Property(x => x.UltraInvoiceTotal).HasColumnType("TEXT");
            e.Property(x => x.EmergencyReserveTarget).HasColumnType("TEXT");
        });

        // ── IncomeItem ───────────────────────────────────────────────────────
        modelBuilder.Entity<IncomeItem>(e =>
        {
            e.HasKey(x => x.Id);
            e.Property(x => x.Title).IsRequired().HasMaxLength(150);
            e.Property(x => x.Amount).HasColumnType("TEXT");
            e.Property(x => x.Category).HasConversion<string>();
            e.Property(x => x.Recurrence).HasConversion<string>();
            e.HasOne(x => x.MonthCycle)
             .WithMany(x => x.IncomeItems)
             .HasForeignKey(x => x.MonthCycleId)
             .OnDelete(DeleteBehavior.Cascade);
        });

        // ── ThirdPartyPerson ─────────────────────────────────────────────────
        modelBuilder.Entity<ThirdPartyPerson>(e =>
        {
            e.HasKey(x => x.Id);
            e.Property(x => x.Id).HasMaxLength(50);
            e.Property(x => x.Name).IsRequired().HasMaxLength(100);
            e.Property(x => x.Relationship).IsRequired().HasMaxLength(80);
        });

        // ── FixedObligation ──────────────────────────────────────────────────
        modelBuilder.Entity<FixedObligation>(e =>
        {
            e.HasKey(x => x.Id);
            e.Property(x => x.Title).IsRequired().HasMaxLength(150);
            e.Property(x => x.Amount).HasColumnType("TEXT");
            e.Property(x => x.FullInvoiceAmount).HasColumnType("TEXT");
            e.Property(x => x.Source).HasConversion<string>();
            e.Property(x => x.Category).IsRequired().HasMaxLength(80);
            e.HasOne(x => x.MonthCycle)
             .WithMany(x => x.FixedObligations)
             .HasForeignKey(x => x.MonthCycleId)
             .OnDelete(DeleteBehavior.Cascade);
        });

        // ── ExpenseEntry ─────────────────────────────────────────────────────
        modelBuilder.Entity<ExpenseEntry>(e =>
        {
            e.HasKey(x => x.Id);
            e.Property(x => x.Description).IsRequired().HasMaxLength(200);
            e.Property(x => x.Amount).HasColumnType("TEXT");
            e.Property(x => x.Source).HasConversion<string>();
            e.Property(x => x.SubTag).HasConversion<string>();
            e.Property(x => x.Tag).IsRequired().HasMaxLength(80);
            e.HasOne(x => x.MonthCycle)
             .WithMany(x => x.ExpenseEntries)
             .HasForeignKey(x => x.MonthCycleId)
             .OnDelete(DeleteBehavior.Cascade);
            e.HasOne(x => x.Owner)
             .WithMany(x => x.ExpenseEntries)
             .HasForeignKey(x => x.OwnerId)
             .OnDelete(DeleteBehavior.SetNull);
        });
    }
}
