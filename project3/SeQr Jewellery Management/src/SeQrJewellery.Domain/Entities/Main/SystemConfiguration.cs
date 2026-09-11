using SeQrJewellery.Domain.Common;

namespace SeQrJewellery.Domain.Entities.Main;

public class SystemConfiguration : BaseEntity
{
    public string Key { get; set; } = string.Empty;
    public string Value { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string? Category { get; set; }
    public bool IsEncrypted { get; set; } = false;
    public bool IsReadOnly { get; set; } = false;
}
