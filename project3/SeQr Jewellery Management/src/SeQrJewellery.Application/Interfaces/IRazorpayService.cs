namespace SeQrJewellery.Application.Interfaces;

public record RazorpayOrderResult(string OrderId, long AmountInPaise, string Currency);
public record RazorpayPaymentLinkResult(string PaymentLinkId, string ShortUrl);

public interface IRazorpayService
{
    Task<RazorpayOrderResult> CreateOrderAsync(string keyId, string keySecret, decimal amountRupees, string receipt, CancellationToken ct = default);
    bool VerifySignature(string keySecret, string orderId, string paymentId, string signature);
    Task<RazorpayPaymentLinkResult> CreatePaymentLinkAsync(string keyId, string keySecret, decimal amountRupees, string description, string? customerName, string? customerPhone, string? customerEmail, CancellationToken ct = default);
}
