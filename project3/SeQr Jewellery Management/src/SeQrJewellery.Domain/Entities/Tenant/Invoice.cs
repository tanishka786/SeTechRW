using SeQrJewellery.Domain.Common;
using SeQrJewellery.Domain.Enums;

namespace SeQrJewellery.Domain.Entities.Tenant;

public class Invoice : BaseEntity
{
    public string InvoiceNumber { get; set; } = string.Empty;
    public InvoiceType InvoiceType { get; set; } = InvoiceType.Sale;
    public InvoiceStatus Status { get; set; } = InvoiceStatus.Draft;
    public DateTime InvoiceDate { get; set; } = DateTime.UtcNow;
    public DateTime? DueDate { get; set; }

    public Guid? CustomerId { get; set; }
    public Guid? SupplierId { get; set; }

    // Financials
    public decimal SubTotal { get; set; } = 0;
    public decimal TotalDiscount { get; set; } = 0;
    public decimal TotalTax { get; set; } = 0;
    public decimal TotalAmount { get; set; } = 0;
    public decimal PaidAmount { get; set; } = 0;
    public decimal BalanceAmount { get; set; } = 0;
    public decimal OldGoldAmount { get; set; } = 0; // Trade-in credit
    public decimal OldGoldWeight { get; set; } = 0;

    // GST Details
    public decimal CGST { get; set; } = 0;
    public decimal SGST { get; set; } = 0;
    public decimal IGST { get; set; } = 0;
    public bool IsIGST { get; set; } = false; // Interstate transaction

    // Misc
    public string? Notes { get; set; }
    public string? Terms { get; set; }
    public string? SalespersonId { get; set; }
    public string? BranchId { get; set; }
    public bool IsPrinted { get; set; } = false;
    public DateTime? PrintedAt { get; set; }

    public Customer? Customer { get; set; }
    public Supplier? Supplier { get; set; }

    public ICollection<InvoiceItem> Items { get; set; } = new List<InvoiceItem>();
    public ICollection<Payment> Payments { get; set; } = new List<Payment>();
    public ICollection<InvoiceOldGoldItem> OldGoldItems { get; set; } = new List<InvoiceOldGoldItem>();
}
