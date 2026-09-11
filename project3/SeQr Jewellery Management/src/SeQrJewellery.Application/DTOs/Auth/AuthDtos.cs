using SeQrJewellery.Application.DTOs.Rbac;
using SeQrJewellery.Domain.Enums;

namespace SeQrJewellery.Application.DTOs.Auth;

public class LoginRequest
{
    public string Username { get; set; } = string.Empty;
    public string Password { get; set; } = string.Empty;
    /// <summary>Optional. When omitted, tenant is resolved from the user account.</summary>
    public string? TenantIdentifier { get; set; }
}

public class LoginResponse
{
    public string AccessToken { get; set; } = string.Empty;
    public string RefreshToken { get; set; } = string.Empty;
    public DateTime ExpiresAt { get; set; }
    public UserProfileDto User { get; set; } = null!;
    public TenantInfoDto Tenant { get; set; } = null!;
    public UserPermissionsDto Permissions { get; set; } = new();
}

public class UserProfileDto
{
    public Guid Id { get; set; }
    public string Username { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string FirstName { get; set; } = string.Empty;
    public string LastName { get; set; } = string.Empty;
    public UserRole Role { get; set; }
    public string? ProfilePicture { get; set; }
}

public class TenantInfoDto
{
    public Guid Id { get; set; }
    public string Identifier { get; set; } = string.Empty;
    public string BusinessName { get; set; } = string.Empty;
    public string? Logo { get; set; }
    public string Currency { get; set; } = string.Empty;
    public string CurrencySymbol { get; set; } = string.Empty;
}

public class RefreshTokenRequest
{
    public string RefreshToken { get; set; } = string.Empty;
    public string TenantIdentifier { get; set; } = string.Empty;
}

public class ChangePasswordRequest
{
    public string CurrentPassword { get; set; } = string.Empty;
    public string NewPassword { get; set; } = string.Empty;
    public string ConfirmPassword { get; set; } = string.Empty;
}
