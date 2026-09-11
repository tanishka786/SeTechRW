namespace SeQrJewellery.Domain.Entities.Tenant;

public enum InventoryAuditStatus
{
    InProgress = 1,
    Completed = 2,
    Cancelled = 3
}

public enum InventoryAuditScanOutcome
{
    Matched = 1,
    Extra = 2,
    Unmapped = 3,
    Sold = 4
}

/// <summary>Floor / RFID inventory audit session (written by SeQr Scan Service jewellery module).</summary>
public class InventoryAudit
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

    public ICollection<InventoryAuditScan> Scans { get; set; } = new List<InventoryAuditScan>();
    public ICollection<InventoryAuditMissing> Missing { get; set; } = new List<InventoryAuditMissing>();
}

public class InventoryAuditScan
{
    public Guid Id { get; set; }
    public Guid AuditId { get; set; }
    public string EPCHex { get; set; } = string.Empty;
    public Guid? TagId { get; set; }
    public Guid? ItemId { get; set; }
    public InventoryAuditScanOutcome Outcome { get; set; }
    public DateTime ScannedAt { get; set; }

    public InventoryAudit? Audit { get; set; }
}

public class InventoryAuditMissing
{
    public Guid Id { get; set; }
    public Guid AuditId { get; set; }
    public Guid TagId { get; set; }
    public Guid? ItemId { get; set; }
    public string? BarcodeValue { get; set; }
    public string? EPCHex { get; set; }
    public string Reason { get; set; } = "NotScanned";

    public InventoryAudit? Audit { get; set; }
}
