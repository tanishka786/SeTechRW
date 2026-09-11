using SeQrJewellery.Domain.Common;

namespace SeQrJewellery.Domain.Entities.Tenant;

public class Supplier : BaseEntity
{
    public string Name { get; set; } = string.Empty;
    public string? ContactPerson { get; set; }
    public string? Email { get; set; }
    public string? Phone { get; set; }
    public string? AlternatePhone { get; set; }
    public string? Address { get; set; }
    public string? City { get; set; }
    public string? State { get; set; }
    public string? Country { get; set; }
    public string? PostalCode { get; set; }
    public string? GSTNumber { get; set; }
    public string? PANNumber { get; set; }
    public string? BankAccountNumber { get; set; }
    public string? BankName { get; set; }
    public string? BankIFSCCode { get; set; }
    public decimal? CreditLimit { get; set; }
    public int? PaymentTermDays { get; set; }
    public string? Notes { get; set; }

    public ICollection<JewelleryItem> JewelleryItems { get; set; } = new List<JewelleryItem>();
    public ICollection<Invoice> Invoices { get; set; } = new List<Invoice>();
}
