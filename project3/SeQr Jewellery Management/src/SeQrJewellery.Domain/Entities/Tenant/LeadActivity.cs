using SeQrJewellery.Domain.Common;
using SeQrJewellery.Domain.Enums;

namespace SeQrJewellery.Domain.Entities.Tenant;

public class LeadActivity : BaseEntity
{
    public Guid LeadId { get; set; }
    public LeadActivityType ActivityType { get; set; }
    public string Summary { get; set; } = string.Empty;
    public string? Details { get; set; }
    public Guid? PerformedByUserId { get; set; }
    public string PerformedByUserName { get; set; } = string.Empty;
    public DateTime OccurredAt { get; set; } = DateTime.UtcNow;

    public Lead Lead { get; set; } = null!;
}
