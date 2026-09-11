using SeQrJewellery.Domain.Common;

namespace SeQrJewellery.Domain.Entities.Tenant;

public class LeadNote : BaseEntity
{
    public Guid LeadId { get; set; }
    public string Content { get; set; } = string.Empty;
    public Guid? CreatedByUserId { get; set; }
    public string CreatedByUserName { get; set; } = string.Empty;
    public bool IsPinned { get; set; }

    public Lead Lead { get; set; } = null!;
}
