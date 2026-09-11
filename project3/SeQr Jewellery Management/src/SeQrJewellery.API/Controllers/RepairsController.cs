using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SeQrJewellery.Domain.Entities.Tenant;
using SeQrJewellery.Domain.Enums;
using SeQrJewellery.Infrastructure.Data;

namespace SeQrJewellery.API.Controllers;

/// <summary>Repair order management</summary>
[Authorize]
public class RepairsController : BaseController
{
    private readonly TenantDbContextAccessor _contextAccessor;

    public RepairsController(TenantDbContextAccessor contextAccessor)
    {
        _contextAccessor = contextAccessor;
    }

    [HttpGet]
    public async Task<IActionResult> GetAll([FromQuery] RepairStatus? status, [FromQuery] string? search, CancellationToken ct)
    {
        var db = await _contextAccessor.GetContextAsync(ct);
        var query = db.Repairs.Include(r => r.Customer).Include(r => r.RepairItems).AsNoTracking();
        if (status.HasValue) query = query.Where(r => r.Status == status);
        if (!string.IsNullOrEmpty(search))
            query = query.Where(r => r.RepairOrderNumber.Contains(search) ||
                r.Customer.FirstName.Contains(search) || r.Customer.LastName.Contains(search));
        var repairs = await query.OrderByDescending(r => r.ReceivedDate).ToListAsync(ct);
        return OkResult(repairs);
    }

    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetById(Guid id, CancellationToken ct)
    {
        var db = await _contextAccessor.GetContextAsync(ct);
        var repair = await db.Repairs.Include(r => r.Customer).Include(r => r.RepairItems)
            .AsNoTracking().FirstOrDefaultAsync(r => r.Id == id, ct);
        return repair is null ? NotFoundResult($"Repair {id} not found.") : OkResult(repair);
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateRepairRequest request, CancellationToken ct)
    {
        var db = await _contextAccessor.GetContextAsync(ct);
        var orderNumber = await GenerateRepairNumberAsync(db, ct);

        var repair = new Repair
        {
            RepairOrderNumber = orderNumber,
            CustomerId = request.CustomerId,
            ItemDescription = request.ItemDescription,
            ItemWeight = request.ItemWeight,
            MetalType = request.MetalType,
            Purity = request.Purity,
            Condition = request.Condition,
            CustomerInstructions = request.CustomerInstructions,
            EstimatedCost = request.EstimatedCost,
            AdvanceAmount = request.AdvanceAmount,
            BalanceAmount = request.EstimatedCost - request.AdvanceAmount,
            EstimatedCompletionDate = request.EstimatedCompletionDate,
            ReceivedByEmployeeId = request.ReceivedByEmployeeId ?? "system",
            AssignedToEmployeeId = request.AssignedToEmployeeId,
            Status = RepairStatus.Received
        };

        if (request.RepairItems?.Any() == true)
        {
            foreach (var item in request.RepairItems)
            {
                repair.RepairItems.Add(new RepairItem
                {
                    RepairId = repair.Id,
                    Description = item.Description,
                    EstimatedCost = item.EstimatedCost
                });
            }
        }

        await db.Repairs.AddAsync(repair, ct);
        await db.SaveChangesAsync(ct);
        return CreatedResult(repair, "Repair order created.");
    }

    [HttpPatch("{id:guid}/status")]
    public async Task<IActionResult> UpdateStatus(Guid id, [FromQuery] RepairStatus status, CancellationToken ct)
    {
        var db = await _contextAccessor.GetContextAsync(ct);
        var repair = await db.Repairs.FindAsync([id], cancellationToken: ct);
        if (repair is null) return NotFoundResult($"Repair {id} not found.");
        repair.Status = status;
        if (status == RepairStatus.ReadyForPickup) repair.ActualCompletionDate = DateTime.UtcNow;
        if (status == RepairStatus.Delivered) repair.DeliveryDate = DateTime.UtcNow;
        await db.SaveChangesAsync(ct);
        return OkResult(repair);
    }

    private static async Task<string> GenerateRepairNumberAsync(TenantDbContext db, CancellationToken ct)
    {
        var count = await db.Repairs.IgnoreQueryFilters().CountAsync(ct);
        var year = DateTime.UtcNow.Year.ToString()[2..];
        return $"REP{year}-{(count + 1):D5}";
    }
}

public class CreateRepairRequest
{
    public Guid CustomerId { get; set; }
    public string ItemDescription { get; set; } = string.Empty;
    public decimal? ItemWeight { get; set; }
    public string? MetalType { get; set; }
    public string? Purity { get; set; }
    public string? Condition { get; set; }
    public string? CustomerInstructions { get; set; }
    public decimal EstimatedCost { get; set; }
    public decimal AdvanceAmount { get; set; }
    public DateTime? EstimatedCompletionDate { get; set; }
    public string? ReceivedByEmployeeId { get; set; }
    public string? AssignedToEmployeeId { get; set; }
    public IEnumerable<CreateRepairItemRequest>? RepairItems { get; set; }
}

public class CreateRepairItemRequest
{
    public string Description { get; set; } = string.Empty;
    public decimal EstimatedCost { get; set; }
}
