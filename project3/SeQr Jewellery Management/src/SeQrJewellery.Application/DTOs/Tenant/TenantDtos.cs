using SeQrJewellery.Domain.Enums;

namespace SeQrJewellery.Application.DTOs.Tenant;

public class TenantDto
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Identifier { get; set; } = string.Empty;
    public string BusinessName { get; set; } = string.Empty;
    public string? Logo { get; set; }
    public string? Email { get; set; }
    public string? Phone { get; set; }
    public string? Address { get; set; }
    public string? City { get; set; }
    public string? Country { get; set; }
    public TenantStatus Status { get; set; }
    public TenantPlan Plan { get; set; }
    public string TimeZone { get; set; } = string.Empty;
    public string Currency { get; set; } = string.Empty;
    public string CurrencySymbol { get; set; } = string.Empty;
    public DateTime? SubscriptionEndDate { get; set; }
    public DateTime CreatedAt { get; set; }
}

public class CreateTenantRequest
{
    public string Name { get; set; } = string.Empty;
    public string Identifier { get; set; } = string.Empty;
    public string BusinessName { get; set; } = string.Empty;
    public string? BusinessRegistrationNumber { get; set; }
    public string? TaxNumber { get; set; }
    public string? GSTNumber { get; set; }
    public string? Address { get; set; }
    public string? City { get; set; }
    public string? State { get; set; }
    public string? Country { get; set; } = "India";
    public string? Phone { get; set; }
    public string? Email { get; set; }
    public TenantPlan Plan { get; set; } = TenantPlan.Free;
    public string TimeZone { get; set; } = "Asia/Kolkata";
    public string Currency { get; set; } = "INR";
    public string AdminEmail { get; set; } = string.Empty;
    public string AdminPassword { get; set; } = string.Empty;
    public string AdminFirstName { get; set; } = string.Empty;
    public string AdminLastName { get; set; } = string.Empty;
}

public class UpdateTenantRequest
{
    public string? Name { get; set; }
    public string? BusinessName { get; set; }
    public string? BusinessRegistrationNumber { get; set; }
    public string? TaxNumber { get; set; }
    public string? GSTNumber { get; set; }
    public string? Logo { get; set; }
    public string? Address { get; set; }
    public string? City { get; set; }
    public string? State { get; set; }
    public string? Country { get; set; }
    public string? Phone { get; set; }
    public string? Email { get; set; }
    public string? Website { get; set; }
    public TenantStatus? Status { get; set; }
    public TenantPlan? Plan { get; set; }
}
