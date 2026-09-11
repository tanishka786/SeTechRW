using SeQrJewellery.Domain.Enums;

namespace SeQrJewellery.Application.DTOs.PrintQueue;

public class PrintQueueDto
{
    public Guid Id { get; set; }
    public Guid? JewelleryItemId { get; set; }
    public string? ItemSKU { get; set; }
    public string? ItemName { get; set; }
    public string? TagValue { get; set; }
    public TagType TagType { get; set; }
    public PrintStatus Status { get; set; }
    public string LabelTemplate { get; set; } = string.Empty;
    public LabelSize LabelSize { get; set; }
    public int Copies { get; set; }
    public int PrintedCopies { get; set; }
    public string? PrinterName { get; set; }
    public string? BartenderFormat { get; set; }
    public DateTime? PrintStartedAt { get; set; }
    public DateTime? PrintCompletedAt { get; set; }
    public string? ErrorMessage { get; set; }
    public int RetryCount { get; set; }
    public int Priority { get; set; }
    public string RequestedBy { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
}

public class CreatePrintJobRequest
{
    public Guid JewelleryItemId { get; set; }
    public TagType TagType { get; set; } = TagType.Barcode;
    public string LabelTemplate { get; set; } = "Default";
    public LabelSize LabelSize { get; set; } = LabelSize.Small;
    public int Copies { get; set; } = 1;
    public string? PrinterName { get; set; }
    public string? BartenderFormat { get; set; }
    public int Priority { get; set; } = 5;
}

public class BatchPrintJobRequest
{
    public IEnumerable<Guid> JewelleryItemIds { get; set; } = Enumerable.Empty<Guid>();
    public TagType TagType { get; set; } = TagType.Barcode;
    public string LabelTemplate { get; set; } = "Default";
    public LabelSize LabelSize { get; set; } = LabelSize.Small;
    public int CopiesPerItem { get; set; } = 1;
    public string? PrinterName { get; set; }
    public string? BartenderFormat { get; set; }
    public int Priority { get; set; } = 5;
}

public class BartenderPrintData
{
    public string SKU { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string TagValue { get; set; } = string.Empty;
    public string TagType { get; set; } = string.Empty;
    public string Metal { get; set; } = string.Empty;
    public string Purity { get; set; } = string.Empty;
    public decimal GrossWeight { get; set; }
    public decimal NetWeight { get; set; }
    public decimal SellingPrice { get; set; }
    public string? HallmarkNumber { get; set; }
    public string? CertificateNumber { get; set; }
    public DateTime PrintDate { get; set; } = DateTime.UtcNow;
    public string TenantName { get; set; } = string.Empty;
    public string? TenantLogo { get; set; }
}
