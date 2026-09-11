using SeQrJewellery.Domain.Common;
using SeQrJewellery.Domain.Enums;

namespace SeQrJewellery.Domain.Entities.Main;

public class TenantUser : BaseEntity
{
    public Guid TenantId { get; set; }
    public string Username { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string PasswordHash { get; set; } = string.Empty;
    public string FirstName { get; set; } = string.Empty;
    public string LastName { get; set; } = string.Empty;
    public string? Phone { get; set; }
    public UserRole Role { get; set; } = UserRole.Staff;
    public DateTime? LastLoginAt { get; set; }
    public bool IsEmailVerified { get; set; } = false;
    public string? PasswordResetToken { get; set; }
    public DateTime? PasswordResetTokenExpiry { get; set; }
    public string? RefreshToken { get; set; }
    public DateTime? RefreshTokenExpiry { get; set; }
    public string? ProfilePicture { get; set; }
    public bool MustChangePassword { get; set; } = false;

    public Tenant Tenant { get; set; } = null!;
}
