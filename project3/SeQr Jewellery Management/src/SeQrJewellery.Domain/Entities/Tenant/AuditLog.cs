using SeQrJewellery.Domain.Common;

namespace SeQrJewellery.Domain.Entities.Tenant;

public class AuditLog : BaseEntity
{
    public string EntityType { get; set; } = string.Empty;
    public string EntityId { get; set; } = string.Empty;
    public string Action { get; set; } = string.Empty; // Create, Update, Delete, View
    public string? OldValues { get; set; } // JSON snapshot
    public string? NewValues { get; set; } // JSON snapshot
    public string? ChangedProperties { get; set; } // Comma-separated list
    public string UserId { get; set; } = string.Empty;
    public string UserName { get; set; } = string.Empty;
    public string? IPAddress { get; set; }
    public string? UserAgent { get; set; }
    public DateTime Timestamp { get; set; } = DateTime.UtcNow;
    public bool IsSuccess { get; set; } = true;
    public string? ErrorMessage { get; set; }
    public string? AdditionalInfo { get; set; }
}
