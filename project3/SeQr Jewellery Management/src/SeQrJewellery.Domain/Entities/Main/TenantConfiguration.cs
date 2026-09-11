using SeQrJewellery.Domain.Common;

namespace SeQrJewellery.Domain.Entities.Main;

public class TenantConfiguration : BaseEntity
{
    public Guid TenantId { get; set; }
    public string Key { get; set; } = string.Empty;
    public string Value { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string? Category { get; set; }
    public bool IsEncrypted { get; set; } = false;

    public Tenant Tenant { get; set; } = null!;
}
