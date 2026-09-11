using SeQrJewellery.Domain.Common;
using SeQrJewellery.Domain.Enums;

namespace SeQrJewellery.Domain.Entities.Tenant;

public class Payment : BaseEntity
{
    public Guid InvoiceId { get; set; }
    public PaymentMethod PaymentMethod { get; set; }
    public decimal Amount { get; set; }
    public DateTime PaymentDate { get; set; } = DateTime.UtcNow;
    public string? TransactionReference { get; set; }
    public string? ChequeNumber { get; set; }
    public string? BankName { get; set; }
    public string? CardLast4 { get; set; }
    public string? UPITransactionId { get; set; }
    public string? Notes { get; set; }
    public bool IsRefunded { get; set; } = false;
    public DateTime? RefundedAt { get; set; }
    public string? RefundReason { get; set; }

    // For gold exchange payments
    public decimal? OldGoldWeight { get; set; }
    public decimal? OldGoldPurity { get; set; }
    public decimal? OldGoldRate { get; set; }

    public Invoice Invoice { get; set; } = null!;
}
