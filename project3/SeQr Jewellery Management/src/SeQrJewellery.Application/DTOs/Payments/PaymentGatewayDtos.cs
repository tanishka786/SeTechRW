namespace SeQrJewellery.Application.DTOs.Payments;

public class CreateRazorpayOrderRequest
{
    public Guid InvoiceId { get; set; }
    /// <summary>Amount in rupees. Defaults to the invoice's outstanding balance when omitted.</summary>
    public decimal? Amount { get; set; }
}

public class RazorpayOrderDto
{
    public string OrderId { get; set; } = string.Empty;
    public string Currency { get; set; } = "INR";
    /// <summary>Amount in paise, as required by Razorpay Checkout.</summary>
    public long AmountInPaise { get; set; }
    public string KeyId { get; set; } = string.Empty;
    public Guid InvoiceId { get; set; }
    public string InvoiceNumber { get; set; } = string.Empty;
    public string? CustomerName { get; set; }
    public string? CustomerPhone { get; set; }
    public string? CustomerEmail { get; set; }
}

public class VerifyRazorpayPaymentRequest
{
    public Guid InvoiceId { get; set; }
    public string RazorpayOrderId { get; set; } = string.Empty;
    public string RazorpayPaymentId { get; set; } = string.Empty;
    public string RazorpaySignature { get; set; } = string.Empty;
}

public class CreatePaymentLinkRequest
{
    public Guid InvoiceId { get; set; }
    public decimal? Amount { get; set; }
}

public class PaymentLinkDto
{
    public string PaymentLinkId { get; set; } = string.Empty;
    public string ShortUrl { get; set; } = string.Empty;
}
