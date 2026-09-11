using SeQrJewellery.Domain.Entities.Tenant;

namespace SeQrJewellery.Application.DTOs.InventoryAudit;

public class InventoryAuditListItemDto
{
    public Guid Id { get; set; }
    public DateTime StartedAt { get; set; }
    public DateTime? CompletedAt { get; set; }
    public InventoryAuditStatus Status { get; set; }
    public string StartedBy { get; set; } = string.Empty;
    public string? Notes { get; set; }
    public int ExpectedCount { get; set; }
    public int ScannedCount { get; set; }
    public int MatchedCount { get; set; }
    public int MissingCount { get; set; }
    public int ExtraCount { get; set; }
    public int SoldSkippedCount { get; set; }
}

public class InventoryAuditScanDto
{
    public Guid Id { get; set; }
    public string EpcHex { get; set; } = string.Empty;
    public InventoryAuditScanOutcome Outcome { get; set; }
    public Guid? TagId { get; set; }
    public Guid? ItemId { get; set; }
    public string? Sku { get; set; }
    public string? Name { get; set; }
    public DateTime ScannedAt { get; set; }
}

public class InventoryAuditMissingDto
{
    public Guid Id { get; set; }
    public Guid TagId { get; set; }
    public Guid? ItemId { get; set; }
    public string? BarcodeValue { get; set; }
    public string? EpcHex { get; set; }
    public string Reason { get; set; } = "NotScanned";
    public string? Sku { get; set; }
    public string? Name { get; set; }
}

public class InventoryAuditReportDto : InventoryAuditListItemDto
{
    public IReadOnlyList<InventoryAuditScanDto> Scans { get; set; } = Array.Empty<InventoryAuditScanDto>();
    public IReadOnlyList<InventoryAuditMissingDto> Missing { get; set; } = Array.Empty<InventoryAuditMissingDto>();
}
