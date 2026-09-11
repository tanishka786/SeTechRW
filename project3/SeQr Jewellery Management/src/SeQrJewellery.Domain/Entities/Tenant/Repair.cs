using SeQrJewellery.Domain.Common;
using SeQrJewellery.Domain.Enums;

namespace SeQrJewellery.Domain.Entities.Tenant;

public class Repair : BaseEntity
{
    public string RepairOrderNumber { get; set; } = string.Empty;
    public Guid CustomerId { get; set; }
    public RepairStatus Status { get; set; } = RepairStatus.Received;
    public DateTime ReceivedDate { get; set; } = DateTime.UtcNow;
    public DateTime? EstimatedCompletionDate { get; set; }
    public DateTime? ActualCompletionDate { get; set; }
    public DateTime? DeliveryDate { get; set; }

    // Item details
    public string ItemDescription { get; set; } = string.Empty;
    public decimal? ItemWeight { get; set; }
    public string? MetalType { get; set; }
    public string? Purity { get; set; }
    public string? Condition { get; set; }
    public string? CustomerInstructions { get; set; }
    public string? InternalNotes { get; set; }

    // Financial
    public decimal EstimatedCost { get; set; } = 0;
    public decimal ActualCost { get; set; } = 0;
    public decimal AdvanceAmount { get; set; } = 0;
    public decimal BalanceAmount { get; set; } = 0;
    public bool IsPaid { get; set; } = false;

    // Assignments
    public string? AssignedToEmployeeId { get; set; }
    public string ReceivedByEmployeeId { get; set; } = string.Empty;

    public Customer Customer { get; set; } = null!;
    public ICollection<RepairItem> RepairItems { get; set; } = new List<RepairItem>();
}
