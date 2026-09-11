using SeQrJewellery.Domain.Common;
using SeQrJewellery.Domain.Enums;

namespace SeQrJewellery.Domain.Entities.Tenant;

public class StockMovement : BaseEntity
{
    public Guid JewelleryItemId { get; set; }
    public StockMovementType MovementType { get; set; }
    public int QuantityBefore { get; set; }
    public int QuantityChange { get; set; } // Positive = in, Negative = out
    public int QuantityAfter { get; set; }
    public string? ReferenceType { get; set; } // "Invoice", "Repair", "Adjustment"
    public Guid? ReferenceId { get; set; }
    public string? Notes { get; set; }
    public string MovedBy { get; set; } = string.Empty;

    public JewelleryItem JewelleryItem { get; set; } = null!;
}
