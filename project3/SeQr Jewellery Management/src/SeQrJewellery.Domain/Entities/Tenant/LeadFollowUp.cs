using SeQrJewellery.Domain.Common;
using SeQrJewellery.Domain.Enums;

namespace SeQrJewellery.Domain.Entities.Tenant;

public class LeadFollowUp : BaseEntity
{
    public Guid LeadId { get; set; }
    public FollowUpType Type { get; set; } = FollowUpType.Call;
    public DateTime ScheduledAt { get; set; } = DateTime.UtcNow;
    public DateTime? CompletedAt { get; set; }
    public string? Notes { get; set; }
    public string? Outcome { get; set; }
    public bool IsCompleted { get; set; } = false;
    public Guid? CreatedByUserId { get; set; }
    public string? CreatedByUserName { get; set; }
    public string? CreatedByEmployeeId { get; set; }

    public Lead Lead { get; set; } = null!;
}
