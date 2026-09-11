using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SeQrJewellery.Application.DTOs.Common;
using SeQrJewellery.Application.DTOs.InventoryAudit;
using SeQrJewellery.Domain.Entities.Tenant;
using SeQrJewellery.Infrastructure.Data;

namespace SeQrJewellery.API.Controllers;

/// <summary>Floor / RFID inventory audit reports (sessions written by SeQr Scan Service).</summary>
[Authorize]
public class InventoryAuditsController : BaseController
{
    private readonly TenantDbContextAccessor _contextAccessor;

    public InventoryAuditsController(TenantDbContextAccessor contextAccessor)
    {
        _contextAccessor = contextAccessor;
    }

    /// <summary>Paginated list of inventory audits (newest first).</summary>
    [HttpGet]
    public async Task<IActionResult> GetAll(
        [FromQuery] InventoryAuditStatus? status,
        [FromQuery] int pageNumber = 1,
        [FromQuery] int pageSize = 20,
        CancellationToken ct = default)
    {
        pageNumber = Math.Max(1, pageNumber);
        pageSize = Math.Clamp(pageSize, 1, 100);

        var db = await _contextAccessor.GetContextAsync(ct);
        var query = db.InventoryAudits.AsNoTracking().AsQueryable();

        if (status.HasValue)
            query = query.Where(a => a.Status == status.Value);

        var total = await query.CountAsync(ct);
        var items = await query
            .OrderByDescending(a => a.StartedAt)
            .Skip((pageNumber - 1) * pageSize)
            .Take(pageSize)
            .Select(a => new InventoryAuditListItemDto
            {
                Id = a.Id,
                StartedAt = a.StartedAt,
                CompletedAt = a.CompletedAt,
                Status = a.Status,
                StartedBy = a.StartedBy,
                Notes = a.Notes,
                ExpectedCount = a.ExpectedCount,
                ScannedCount = a.ScannedCount,
                MatchedCount = a.MatchedCount,
                MissingCount = a.MissingCount,
                ExtraCount = a.ExtraCount,
                SoldSkippedCount = a.SoldSkippedCount
            })
            .ToListAsync(ct);

        return OkResult(new PagedResult<InventoryAuditListItemDto>
        {
            Items = items,
            TotalCount = total,
            PageNumber = pageNumber,
            PageSize = pageSize
        });
    }

    /// <summary>Full audit report including scans and missing items.</summary>
    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetById(Guid id, CancellationToken ct)
    {
        var db = await _contextAccessor.GetContextAsync(ct);
        var audit = await db.InventoryAudits.AsNoTracking()
            .Include(a => a.Scans)
            .Include(a => a.Missing)
            .FirstOrDefaultAsync(a => a.Id == id, ct);

        if (audit is null)
            return NotFoundResult($"Audit {id} not found.");

        var itemIds = audit.Scans.Where(s => s.ItemId.HasValue).Select(s => s.ItemId!.Value)
            .Concat(audit.Missing.Where(m => m.ItemId.HasValue).Select(m => m.ItemId!.Value))
            .Distinct()
            .ToList();

        var items = await db.JewelleryItems.AsNoTracking()
            .Where(i => itemIds.Contains(i.Id))
            .ToDictionaryAsync(i => i.Id, i => new { i.SKU, i.Name }, ct);

        string? Sku(Guid? itemId) =>
            itemId.HasValue && items.TryGetValue(itemId.Value, out var it) ? it.SKU : null;
        string? Name(Guid? itemId) =>
            itemId.HasValue && items.TryGetValue(itemId.Value, out var it) ? it.Name : null;

        return OkResult(new InventoryAuditReportDto
        {
            Id = audit.Id,
            StartedAt = audit.StartedAt,
            CompletedAt = audit.CompletedAt,
            Status = audit.Status,
            StartedBy = audit.StartedBy,
            Notes = audit.Notes,
            ExpectedCount = audit.ExpectedCount,
            ScannedCount = audit.ScannedCount,
            MatchedCount = audit.MatchedCount,
            MissingCount = audit.MissingCount,
            ExtraCount = audit.ExtraCount,
            SoldSkippedCount = audit.SoldSkippedCount,
            Scans = audit.Scans.OrderByDescending(s => s.ScannedAt).Select(s => new InventoryAuditScanDto
            {
                Id = s.Id,
                EpcHex = s.EPCHex,
                Outcome = s.Outcome,
                TagId = s.TagId,
                ItemId = s.ItemId,
                Sku = Sku(s.ItemId),
                Name = Name(s.ItemId),
                ScannedAt = s.ScannedAt
            }).ToList(),
            Missing = audit.Missing.Select(m => new InventoryAuditMissingDto
            {
                Id = m.Id,
                TagId = m.TagId,
                ItemId = m.ItemId,
                BarcodeValue = m.BarcodeValue,
                EpcHex = m.EPCHex,
                Reason = m.Reason,
                Sku = Sku(m.ItemId),
                Name = Name(m.ItemId)
            }).ToList()
        });
    }
}
