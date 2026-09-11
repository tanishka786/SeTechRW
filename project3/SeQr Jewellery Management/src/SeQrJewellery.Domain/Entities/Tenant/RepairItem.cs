using SeQrJewellery.Domain.Common;

namespace SeQrJewellery.Domain.Entities.Tenant;

public class RepairItem : BaseEntity
{
    public Guid RepairId { get; set; }
    public string Description { get; set; } = string.Empty;
    public decimal EstimatedCost { get; set; } = 0;
    public decimal ActualCost { get; set; } = 0;
    public bool IsCompleted { get; set; } = false;
    public string? Notes { get; set; }

    public Repair Repair { get; set; } = null!;
}
