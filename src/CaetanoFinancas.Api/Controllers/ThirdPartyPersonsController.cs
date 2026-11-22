using CaetanoFinancas.Api.Entities;
using CaetanoFinancas.Api.Infrastructure;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace CaetanoFinancas.Api.Controllers;

[ApiController]
[Route("api/third-party-persons")]
public class ThirdPartyPersonsController : ControllerBase
{
    private readonly AppDbContext _db;

    public ThirdPartyPersonsController(AppDbContext db)
    {
        _db = db;
    }

    [HttpGet]
    public async Task<IActionResult> GetAll()
        => Ok(await _db.ThirdPartyPersons.ToListAsync());

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] ThirdPartyPerson person)
    {
        _db.ThirdPartyPersons.Add(person);
        await _db.SaveChangesAsync();
        return Created($"/api/third-party-persons/{person.Id}", person);
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(string id)
    {
        var person = await _db.ThirdPartyPersons.FindAsync(id);
        if (person is null) return NotFound();

        _db.ThirdPartyPersons.Remove(person);
        await _db.SaveChangesAsync();
        return NoContent();
    }
}
