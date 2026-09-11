using System.Security.Claims;
using System.Text.Json;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SeQrJewellery.Domain.Entities.Tenant;
using SeQrJewellery.Infrastructure.Data;
using SeQrJewellery.Infrastructure.Services;

namespace SeQrJewellery.API.Controllers;

/// <summary>Catalog management - Categories, Metals, Purities, Suppliers</summary>
[Authorize]
public class CatalogController : BaseController
{
    private readonly TenantDbContextAccessor _contextAccessor;

    public CatalogController(TenantDbContextAccessor contextAccessor)
    {
        _contextAccessor = contextAccessor;
    }

    // ---- Categories ----

    [HttpGet("categories")]
    public async Task<IActionResult> GetCategories(CancellationToken ct)
    {
        var db = await _contextAccessor.GetContextAsync(ct);
        var cats = await db.Categories.Include(c => c.SubCategories).AsNoTracking().ToListAsync(ct);
        return OkResult(cats);
    }

    [HttpPost("categories")]
    public async Task<IActionResult> CreateCategory([FromBody] CreateCategoryRequest request, CancellationToken ct)
    {
        var db = await _contextAccessor.GetContextAsync(ct);
        var cat = new Category
        {
            Name = request.Name,
            Description = request.Description,
            ParentCategoryId = request.ParentCategoryId,
            DisplayOrder = request.DisplayOrder
        };
        await db.Categories.AddAsync(cat, ct);
        await db.SaveChangesAsync(ct);
        return CreatedResult(cat);
    }

    // ---- Metals ----

    /// <summary>Current Gold 24K/22K/18K, Silver, and Platinum rates for the live ticker and billing.</summary>
    [HttpGet("metals/live-rates")]
    public async Task<IActionResult> GetLiveRates(CancellationToken ct)
    {
        var db = await _contextAccessor.GetContextAsync(ct);
        var rates = await LiveMetalRateService.GetTickerRatesAsync(db, ct);
        return OkResult(rates);
    }

    [HttpGet("metals")]
    public async Task<IActionResult> GetMetals(CancellationToken ct)
    {
        var db = await _contextAccessor.GetContextAsync(ct);
        var metals = await db.Metals.Include(m => m.Purities).AsNoTracking().ToListAsync(ct);
        return OkResult(metals);
    }

    /// <summary>
    /// Update metal rate, audit the change, and reprice all unsold active inventory for that metal.
    /// </summary>
    [HttpPut("metals/{id:guid}/rate")]
    public async Task<IActionResult> UpdateMetalRate(Guid id, [FromBody] UpdateMetalRateRequest request, CancellationToken ct)
    {
        var db = await _contextAccessor.GetContextAsync(ct);
        var metal = await db.Metals.FindAsync([id], cancellationToken: ct);
        if (metal is null) return NotFoundResult($"Metal {id} not found.");

        var previousRate = metal.CurrentMarketRate;
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier) ?? User.FindFirstValue("sub");
        var userName = User.FindFirstValue(ClaimTypes.Name)
            ?? User.FindFirstValue("name")
            ?? User.Identity?.Name
            ?? "system";
        Guid? userGuid = Guid.TryParse(userId, out var g) ? g : null;

        metal.CurrentMarketRate = request.RatePerGram;
        metal.LastRateUpdate = DateTime.UtcNow;

        // Reprice unsold, active inventory for this metal (optionally scoped by purity)
        var itemsQuery = db.JewelleryItems
            .Where(i => i.MetalId == id && i.IsActive && !i.IsSold && !i.IsDeleted);
        if (request.PurityId != Guid.Empty)
            itemsQuery = itemsQuery.Where(i => i.PurityId == request.PurityId);

        var items = await itemsQuery.ToListAsync(ct);
        foreach (var item in items)
        {
            item.MetalRate = request.RatePerGram;
            JewelleryItemsController.RecalculateItemPricing(item);
        }

        var rateHistory = new MetalRate
        {
            MetalId = id,
            PurityId = request.PurityId,
            RatePerGram = request.RatePerGram,
            RatePerTola = request.RatePerGram * 11.664m,
            RatePerOz = request.RatePerGram * 31.1m,
            RateDate = DateTime.UtcNow,
            Source = request.Source ?? "Manual",
            PreviousRate = previousRate,
            UpdatedByUserId = userGuid,
            UpdatedByUserName = userName,
            ItemsRepriced = items.Count,
            Notes = request.Notes
        };
        await db.MetalRates.AddAsync(rateHistory, ct);

        await db.AuditLogs.AddAsync(new AuditLog
        {
            EntityType = "MetalRate",
            EntityId = id.ToString(),
            Action = "Update",
            OldValues = JsonSerializer.Serialize(new { RatePerGram = previousRate }),
            NewValues = JsonSerializer.Serialize(new { RatePerGram = request.RatePerGram, request.PurityId, ItemsRepriced = items.Count }),
            ChangedProperties = "RatePerGram",
            UserId = userId ?? "",
            UserName = userName,
            Timestamp = DateTime.UtcNow,
            AdditionalInfo = $"Repriced {items.Count} inventory item(s)"
        }, ct);

        await db.SaveChangesAsync(ct);

        return OkResult(new
        {
            metal.Id,
            metal.Name,
            metal.CurrentMarketRate,
            metal.LastRateUpdate,
            PreviousRate = previousRate,
            ItemsRepriced = items.Count,
            RateHistoryId = rateHistory.Id
        }, $"Rate updated. {items.Count} inventory item(s) repriced.");
    }

    /// <summary>Full metal rate history with audit fields (filterable)</summary>
    [HttpGet("metal-rates/history")]
    public async Task<IActionResult> GetRateHistory(
        [FromQuery] Guid? metalId,
        [FromQuery] Guid? purityId,
        [FromQuery] DateTime? fromDate,
        [FromQuery] DateTime? toDate,
        [FromQuery] int pageNumber = 1,
        [FromQuery] int pageSize = 50,
        CancellationToken ct = default)
    {
        var db = await _contextAccessor.GetContextAsync(ct);
        var query = db.MetalRates
            .Include(r => r.Metal)
            .Include(r => r.Purity)
            .AsNoTracking();

        if (metalId.HasValue) query = query.Where(r => r.MetalId == metalId.Value);
        if (purityId.HasValue) query = query.Where(r => r.PurityId == purityId.Value);
        if (fromDate.HasValue) query = query.Where(r => r.RateDate >= fromDate.Value);
        if (toDate.HasValue) query = query.Where(r => r.RateDate <= toDate.Value);

        pageNumber = Math.Max(1, pageNumber);
        pageSize = Math.Clamp(pageSize, 1, 200);
        var total = await query.CountAsync(ct);
        var rates = await query
            .OrderByDescending(r => r.RateDate)
            .ThenByDescending(r => r.CreatedAt)
            .Skip((pageNumber - 1) * pageSize)
            .Take(pageSize)
            .Select(r => new RateHistoryDto
            {
                Id = r.Id,
                MetalId = r.MetalId,
                MetalName = r.Metal != null ? r.Metal.Name : "",
                PurityId = r.PurityId,
                PurityName = r.Purity != null ? r.Purity.Name : "",
                RatePerGram = r.RatePerGram,
                RatePerTola = r.RatePerTola,
                PreviousRate = r.PreviousRate,
                ChangeAmount = r.PreviousRate.HasValue ? r.RatePerGram - r.PreviousRate.Value : null,
                ChangePercent = r.PreviousRate.HasValue && r.PreviousRate.Value != 0
                    ? (r.RatePerGram - r.PreviousRate.Value) / r.PreviousRate.Value * 100
                    : null,
                Source = r.Source,
                Notes = r.Notes,
                UpdatedByUserId = r.UpdatedByUserId,
                UpdatedByUserName = r.UpdatedByUserName,
                ItemsRepriced = r.ItemsRepriced,
                RateDate = r.RateDate
            })
            .ToListAsync(ct);

        return OkResult(new
        {
            Items = rates,
            TotalCount = total,
            PageNumber = pageNumber,
            PageSize = pageSize
        });
    }

    // ---- Suppliers ----

    [HttpGet("suppliers")]
    public async Task<IActionResult> GetSuppliers(CancellationToken ct)
    {
        var db = await _contextAccessor.GetContextAsync(ct);
        var suppliers = await db.Suppliers.AsNoTracking().ToListAsync(ct);
        return OkResult(suppliers);
    }

    [HttpPost("suppliers")]
    public async Task<IActionResult> CreateSupplier([FromBody] Supplier supplier, CancellationToken ct)
    {
        var db = await _contextAccessor.GetContextAsync(ct);
        await db.Suppliers.AddAsync(supplier, ct);
        await db.SaveChangesAsync(ct);
        return CreatedResult(supplier);
    }

    // ---- Label Templates ----

    [HttpGet("label-templates")]
    public async Task<IActionResult> GetLabelTemplates(CancellationToken ct)
    {
        var db = await _contextAccessor.GetContextAsync(ct);
        var templates = await db.LabelTemplates.AsNoTracking().ToListAsync(ct);
        return OkResult(templates);
    }

    // ---- RFID Reader Configuration ----

    [HttpGet("rfid-profiles")]
    [AllowAnonymous]
    public async Task<IActionResult> GetRFIDProfiles(CancellationToken ct)
    {
        await Task.CompletedTask;
        return OkResult(new { message = "Use /api/tenants/{id}/rfid-readers for tenant-specific reader config." });
    }
}

public class CreateCategoryRequest
{
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public Guid? ParentCategoryId { get; set; }
    public int DisplayOrder { get; set; } = 0;
}

public class UpdateMetalRateRequest
{
    public Guid PurityId { get; set; }
    public decimal RatePerGram { get; set; }
    public string? Source { get; set; }
    public string? Notes { get; set; }
}

public class RateHistoryDto
{
    public Guid Id { get; set; }
    public Guid MetalId { get; set; }
    public string MetalName { get; set; } = string.Empty;
    public Guid PurityId { get; set; }
    public string PurityName { get; set; } = string.Empty;
    public decimal RatePerGram { get; set; }
    public decimal RatePerTola { get; set; }
    public decimal? PreviousRate { get; set; }
    public decimal? ChangeAmount { get; set; }
    public decimal? ChangePercent { get; set; }
    public string? Source { get; set; }
    public string? Notes { get; set; }
    public Guid? UpdatedByUserId { get; set; }
    public string? UpdatedByUserName { get; set; }
    public int ItemsRepriced { get; set; }
    public DateTime RateDate { get; set; }
}
