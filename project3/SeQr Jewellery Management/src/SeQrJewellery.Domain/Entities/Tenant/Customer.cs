using SeQrJewellery.Domain.Common;
using SeQrJewellery.Domain.Enums;

namespace SeQrJewellery.Domain.Entities.Tenant;

public class Customer : BaseEntity
{
    public string CustomerCode { get; set; } = string.Empty;
    public string FirstName { get; set; } = string.Empty;
    public string LastName { get; set; } = string.Empty;
    public string FullName => $"{FirstName} {LastName}".Trim();
    public string? Email { get; set; }
    public string? Phone { get; set; }
    public string? AlternatePhone { get; set; }
    public DateTime? DateOfBirth { get; set; }
    public DateTime? Anniversary { get; set; }
    public GenderType Gender { get; set; } = GenderType.PreferNotToSay;
    public CustomerType CustomerType { get; set; } = CustomerType.Retail;
    public string? PAN { get; set; } // For high-value transactions
    public string? AadhaarNumber { get; set; }
    public string? PassportNumber { get; set; }
    public string? GST { get; set; } // For wholesale customers
    public decimal CreditLimit { get; set; } = 0;
    public decimal LoyaltyPoints { get; set; } = 0;
    public string? Notes { get; set; }
    public string? ReferredBy { get; set; }
    public string? ProfilePicture { get; set; }

    // Address
    public string? Address { get; set; }
    public string? City { get; set; }
    public string? State { get; set; }
    public string? Country { get; set; } = "India";
    public string? PostalCode { get; set; }

    // Stats (calculated)
    public decimal TotalPurchaseAmount { get; set; } = 0;
    public int TotalPurchaseCount { get; set; } = 0;
    public DateTime? LastPurchaseDate { get; set; }

    public ICollection<Invoice> Invoices { get; set; } = new List<Invoice>();
    public ICollection<Repair> Repairs { get; set; } = new List<Repair>();
}
