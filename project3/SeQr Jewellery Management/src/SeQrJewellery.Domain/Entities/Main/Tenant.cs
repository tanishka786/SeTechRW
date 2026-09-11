using SeQrJewellery.Domain.Common;
using SeQrJewellery.Domain.Enums;

namespace SeQrJewellery.Domain.Entities.Main;

public class Tenant : BaseEntity
{
    public string Name { get; set; } = string.Empty;
    public string Identifier { get; set; } = string.Empty; // Subdomain/unique slug e.g. "goldpalace"
    public string DatabaseName { get; set; } = string.Empty;
    public string ConnectionString { get; set; } = string.Empty;
    public TenantStatus Status { get; set; } = TenantStatus.Trial;
    public TenantPlan Plan { get; set; } = TenantPlan.Free;

    // Business Info
    public string BusinessName { get; set; } = string.Empty;
    public string? BusinessRegistrationNumber { get; set; }
    public string? TaxNumber { get; set; }
    public string? GSTNumber { get; set; }
    public string? Logo { get; set; }
    public string? Address { get; set; }
    public string? City { get; set; }
    public string? State { get; set; }
    public string? Country { get; set; } = "India";
    public string? PostalCode { get; set; }
    public string? Phone { get; set; }
    public string? Email { get; set; }
    public string? Website { get; set; }

    // Subscription
    public DateTime? TrialEndsAt { get; set; }
    public DateTime? SubscriptionStartDate { get; set; }
    public DateTime? SubscriptionEndDate { get; set; }
    public int MaxUsers { get; set; } = 5;
    public int MaxLocations { get; set; } = 1;
    public string TimeZone { get; set; } = "Asia/Kolkata";
    public string Currency { get; set; } = "INR";
    public string CurrencySymbol { get; set; } = "₹";
    public string DateFormat { get; set; } = "dd/MM/yyyy";

    public ICollection<TenantConfiguration> Configurations { get; set; } = new List<TenantConfiguration>();
    public ICollection<TenantRFIDReader> RFIDReaders { get; set; } = new List<TenantRFIDReader>();
    public ICollection<TenantUser> Users { get; set; } = new List<TenantUser>();
}
