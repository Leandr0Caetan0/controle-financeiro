using CaetanoFinancas.Api.Entities;
using CaetanoFinancas.Api.Infrastructure;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace CaetanoFinancas.Api.Controllers;

/// <summary>CRUD básico (legado) de MonthCycle. Preferir /api/cycles.</summary>
[ApiController]
[Route("api/month-cycles")]
public class MonthCyclesController : ControllerBase
{
    private readonly AppDbContext _db;

    public MonthCyclesController(AppDbContext db)
    {
        _db = db;
    }

    [HttpGet]
    public async Task<IActionResult> GetAll()
        => Ok(await _db.MonthCycles.OrderByDescending(x => x.Id).ToListAsync());

    [HttpGet("{id}")]
    public async Task<IActionResult> GetById(string id)
    {
        var cycle = await _db.MonthCycles.FindAsync(id);
        return cycle is null ? NotFound() : Ok(cycle);
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] MonthCycle cycle)
    {
        _db.MonthCycles.Add(cycle);
        await _db.SaveChangesAsync();
        return Created($"/api/month-cycles/{cycle.Id}", cycle);
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(string id)
    {
        var existing = await _db.MonthCycles.FindAsync(id);
        if (existing is null) return NotFound();

        _db.MonthCycles.Remove(existing);
        await _db.SaveChangesAsync();
        return NoContent();
    }
}
