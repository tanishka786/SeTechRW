using SeQrJewellery.Domain.Enums;

namespace SeQrJewellery.Application.DTOs.Invoice;

public class InvoiceDto
{
    public Guid Id { get; set; }
    public string InvoiceNumber { get; set; } = string.Empty;
    public InvoiceType InvoiceType { get; set; }
    public InvoiceStatus Status { get; set; }
    public DateTime InvoiceDate { get; set; }
    public DateTime? DueDate { get; set; }
    public Guid? CustomerId { get; set; }
    public string? CustomerName { get; set; }
    public string? CustomerPhone { get; set; }
    public Guid? SupplierId { get; set; }
    public string? SupplierName { get; set; }
    public decimal SubTotal { get; set; }
    public decimal TotalDiscount { get; set; }
    public decimal TotalTax { get; set; }
    public decimal TotalAmount { get; set; }
    public decimal PaidAmount { get; set; }
    public decimal BalanceAmount { get; set; }
    public decimal OldGoldAmount { get; set; }
    public decimal CGST { get; set; }
    public decimal SGST { get; set; }
    public decimal IGST { get; set; }
    public string? Notes { get; set; }
    public IEnumerable<InvoiceItemDto> Items { get; set; } = Enumerable.Empty<InvoiceItemDto>();
    public IEnumerable<PaymentDto> Payments { get; set; } = Enumerable.Empty<PaymentDto>();
    public DateTime CreatedAt { get; set; }
}

public class InvoiceItemDto
{
    public Guid Id { get; set; }
    public Guid JewelleryItemId { get; set; }
    public string SKU { get; set; } = string.Empty;
    public string ItemName { get; set; } = string.Empty;
    public string? TagValue { get; set; }
    public int Quantity { get; set; }
    public decimal GrossWeight { get; set; }
    public decimal NetWeight { get; set; }
    public decimal MetalRate { get; set; }
    public decimal MetalValue { get; set; }
    public decimal MakingCharges { get; set; }
    public decimal StoneCharges { get; set; }
    public decimal Discount { get; set; }
    public decimal TaxPercent { get; set; }
    public decimal TaxAmount { get; set; }
    public decimal UnitPrice { get; set; }
    public decimal TotalPrice { get; set; }
}

public class PaymentDto
{
    public Guid Id { get; set; }
    public PaymentMethod PaymentMethod { get; set; }
    public decimal Amount { get; set; }
    public DateTime PaymentDate { get; set; }
    public string? TransactionReference { get; set; }
    public string? ChequeNumber { get; set; }
    public string? BankName { get; set; }
    public string? CardLast4 { get; set; }
    public string? UPITransactionId { get; set; }
    public string? Notes { get; set; }
    public bool IsRefunded { get; set; }
}

public class CreateInvoiceRequest
{
    public InvoiceType InvoiceType { get; set; } = InvoiceType.Sale;
    public DateTime InvoiceDate { get; set; } = DateTime.UtcNow;
    public DateTime? DueDate { get; set; }
    public Guid? CustomerId { get; set; }
    public Guid? SupplierId { get; set; }
    public decimal OldGoldAmount { get; set; } = 0;
    public decimal OldGoldWeight { get; set; } = 0;
    public bool IsIGST { get; set; } = false;
    public string? Notes { get; set; }
    public string? Terms { get; set; }
    public IEnumerable<CreateInvoiceItemRequest> Items { get; set; } = Enumerable.Empty<CreateInvoiceItemRequest>();
    public IEnumerable<CreatePaymentRequest>? Payments { get; set; }
}

public class CreateInvoiceItemRequest
{
    public Guid JewelleryItemId { get; set; }
    public string? TagValue { get; set; }
    public int Quantity { get; set; } = 1;
    public decimal? OverridePrice { get; set; }
    public decimal? Discount { get; set; }
}

public class CreatePaymentRequest
{
    public PaymentMethod PaymentMethod { get; set; }
    public decimal Amount { get; set; }
    public DateTime? PaymentDate { get; set; }
    public string? TransactionReference { get; set; }
    public string? ChequeNumber { get; set; }
    public string? BankName { get; set; }
    public string? CardLast4 { get; set; }
    public string? UPITransactionId { get; set; }
    public decimal? OldGoldWeight { get; set; }
    public decimal? OldGoldPurity { get; set; }
    public decimal? OldGoldRate { get; set; }
    public string? Notes { get; set; }
    /// <summary>Optional explicit status after recording payment (Paid / PartiallyPaid / Confirmed).</summary>
    public InvoiceStatus? StatusOverride { get; set; }
}

public class UpdateInvoiceStatusRequest
{
    public InvoiceStatus Status { get; set; }
    public string? Notes { get; set; }
}

public class InvoiceFilterRequest
{
    public string? SearchTerm { get; set; }
    public InvoiceType? InvoiceType { get; set; }
    public InvoiceStatus? Status { get; set; }
    public Guid? CustomerId { get; set; }
    public DateTime? FromDate { get; set; }
    public DateTime? ToDate { get; set; }
    public int PageNumber { get; set; } = 1;
    public int PageSize { get; set; } = 20;
}
