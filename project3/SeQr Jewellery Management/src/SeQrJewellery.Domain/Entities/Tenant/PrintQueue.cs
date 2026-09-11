using SeQrJewellery.Domain.Common;
using SeQrJewellery.Domain.Enums;

namespace SeQrJewellery.Domain.Entities.Tenant;

public class PrintQueue : BaseEntity
{
    public Guid? JewelleryItemId { get; set; }
    public string? TagValue { get; set; }
    public TagType TagType { get; set; } = TagType.Barcode;
    public PrintStatus Status { get; set; } = PrintStatus.Pending;
    public string LabelTemplate { get; set; } = "Default";
    public LabelSize LabelSize { get; set; } = LabelSize.Small;
    public int Copies { get; set; } = 1;
    public int PrintedCopies { get; set; } = 0;
    public string? PrinterName { get; set; }
    public string? PrintData { get; set; } // JSON payload for Bartender
    public DateTime? PrintStartedAt { get; set; }
    public DateTime? PrintCompletedAt { get; set; }
    public string? ErrorMessage { get; set; }
    public int RetryCount { get; set; } = 0;
    public string RequestedBy { get; set; } = string.Empty;

    // Bartender specific fields
    public string? BartenderFormat { get; set; } // .btw file name
    public string? BartenderData { get; set; } // XML/JSON data for Bartender
    public string? BartenderPrinterName { get; set; }
    public int Priority { get; set; } = 5; // 1 = highest, 10 = lowest

    public JewelleryItem? JewelleryItem { get; set; }
}
