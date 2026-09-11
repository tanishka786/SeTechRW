using SeQrJewellery.Domain.Enums;

namespace SeQrJewellery.Application.DTOs.Customer;

public class CustomerDto
{
    public Guid Id { get; set; }
    public string CustomerCode { get; set; } = string.Empty;
    public string FirstName { get; set; } = string.Empty;
    public string LastName { get; set; } = string.Empty;
    public string FullName { get; set; } = string.Empty;
    public string? Email { get; set; }
    public string? Phone { get; set; }
    public string? AlternatePhone { get; set; }
    public DateTime? DateOfBirth { get; set; }
    public DateTime? Anniversary { get; set; }
    public GenderType Gender { get; set; }
    public CustomerType CustomerType { get; set; }
    public string? PAN { get; set; }
    public string? GST { get; set; }
    public decimal CreditLimit { get; set; }
    public decimal LoyaltyPoints { get; set; }
    public string? Address { get; set; }
    public string? City { get; set; }
    public string? State { get; set; }
    public string? Country { get; set; }
    public decimal TotalPurchaseAmount { get; set; }
    public int TotalPurchaseCount { get; set; }
    public DateTime? LastPurchaseDate { get; set; }
    public bool IsActive { get; set; }
    public DateTime CreatedAt { get; set; }
}

public class CreateCustomerRequest
{
    public string FirstName { get; set; } = string.Empty;
    public string LastName { get; set; } = string.Empty;
    public string? Email { get; set; }
    public string? Phone { get; set; }
    public string? AlternatePhone { get; set; }
    public DateTime? DateOfBirth { get; set; }
    public DateTime? Anniversary { get; set; }
    public GenderType Gender { get; set; } = GenderType.PreferNotToSay;
    public CustomerType CustomerType { get; set; } = CustomerType.Retail;
    public string? PAN { get; set; }
    public string? AadhaarNumber { get; set; }
    public string? GST { get; set; }
    public decimal CreditLimit { get; set; } = 0;
    public string? Address { get; set; }
    public string? City { get; set; }
    public string? State { get; set; }
    public string? Country { get; set; } = "India";
    public string? PostalCode { get; set; }
    public string? Notes { get; set; }
    public string? ReferredBy { get; set; }
}

public class UpdateCustomerRequest
{
    public string? FirstName { get; set; }
    public string? LastName { get; set; }
    public string? Email { get; set; }
    public string? Phone { get; set; }
    public string? AlternatePhone { get; set; }
    public DateTime? DateOfBirth { get; set; }
    public DateTime? Anniversary { get; set; }
    public GenderType? Gender { get; set; }
    public CustomerType? CustomerType { get; set; }
    public string? PAN { get; set; }
    public string? GST { get; set; }
    public decimal? CreditLimit { get; set; }
    public string? Address { get; set; }
    public string? City { get; set; }
    public string? State { get; set; }
    public string? Notes { get; set; }
}
