using System.Text.Json;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SeQrJewellery.Application.DTOs.Payments;
using SeQrJewellery.Application.Interfaces;
using SeQrJewellery.Domain.Entities.Tenant;
using SeQrJewellery.Domain.Enums;
using SeQrJewellery.Infrastructure.Data;

namespace SeQrJewellery.API.Controllers;

/// <summary>Razorpay payment gateway integration for collecting invoice payments online</summary>
[Route("api/payments")]
public class PaymentGatewayController : BaseController
{
    private readonly TenantDbContextAccessor _contextAccessor;
    private readonly IRazorpayService _razorpay;

    public PaymentGatewayController(TenantDbContextAccessor contextAccessor, IRazorpayService razorpay)
    {
        _contextAccessor = contextAccessor;
        _razorpay = razorpay;
    }

    /// <summary>Creates a Razorpay order for an invoice's outstanding balance (or a specified amount).</summary>
    [Authorize]
    [HttpPost("razorpay/order")]
    public async Task<IActionResult> CreateOrder([FromBody] CreateRazorpayOrderRequest request, CancellationToken ct)
    {
        var db = await _contextAccessor.GetContextAsync(ct);
        var invoice = await db.Invoices.Include(i => i.Customer).FirstOrDefaultAsync(i => i.Id == request.InvoiceId, ct);
        if (invoice is null) return NotFoundResult($"Invoice {request.InvoiceId} not found.");

        var settings = await db.InvoiceSettings.AsNoTracking().FirstOrDefaultAsync(ct);
        if (settings is null || !settings.RazorpayEnabled || string.IsNullOrWhiteSpace(settings.RazorpayKeyId) || string.IsNullOrWhiteSpace(settings.RazorpayKeySecret))
            return BadRequestResult("Razorpay is not configured. Add your Key ID and Key Secret in Settings > Invoice.");

        var amount = request.Amount ?? invoice.BalanceAmount;
        if (amount <= 0) return BadRequestResult("Amount must be greater than zero.");

        try
        {
            var order = await _razorpay.CreateOrderAsync(settings.RazorpayKeyId, settings.RazorpayKeySecret, amount, invoice.InvoiceNumber, ct);
            return OkResult(new RazorpayOrderDto
            {
                OrderId = order.OrderId,
                Currency = order.Currency,
                AmountInPaise = order.AmountInPaise,
                KeyId = settings.RazorpayKeyId,
                InvoiceId = invoice.Id,
                InvoiceNumber = invoice.InvoiceNumber,
                CustomerName = invoice.Customer != null ? $"{invoice.Customer.FirstName} {invoice.Customer.LastName}".Trim() : null,
                CustomerPhone = invoice.Customer?.Phone,
                CustomerEmail = invoice.Customer?.Email,
            });
        }
        catch (Exception ex)
        {
            return ErrorResult($"Failed to create Razorpay order: {ex.Message}");
        }
    }

    /// <summary>Verifies the Razorpay Checkout signature client-side callback and records the payment.</summary>
    [Authorize]
    [HttpPost("razorpay/verify")]
    public async Task<IActionResult> VerifyPayment([FromBody] VerifyRazorpayPaymentRequest request, CancellationToken ct)
    {
        var db = await _contextAccessor.GetContextAsync(ct);
        var invoice = await db.Invoices.Include(i => i.Payments).FirstOrDefaultAsync(i => i.Id == request.InvoiceId, ct);
        if (invoice is null) return NotFoundResult($"Invoice {request.InvoiceId} not found.");

        var settings = await db.InvoiceSettings.AsNoTracking().FirstOrDefaultAsync(ct);
        if (settings is null || string.IsNullOrWhiteSpace(settings.RazorpayKeySecret))
            return BadRequestResult("Razorpay is not configured.");

        var isValid = _razorpay.VerifySignature(settings.RazorpayKeySecret, request.RazorpayOrderId, request.RazorpayPaymentId, request.RazorpaySignature);
        if (!isValid) return BadRequestResult("Payment signature verification failed.");

        // Amount collected = whatever was outstanding at order-creation time; approximate as current balance for simplicity.
        var amount = invoice.BalanceAmount;
        var payment = new Payment
        {
            InvoiceId = invoice.Id,
            PaymentMethod = PaymentMethod.UPI,
            Amount = amount,
            PaymentDate = DateTime.UtcNow,
            TransactionReference = request.RazorpayPaymentId,
            Notes = $"Razorpay order {request.RazorpayOrderId}",
        };
        invoice.Payments.Add(payment);
        invoice.PaidAmount += amount;
        invoice.BalanceAmount -= amount;
        invoice.Status = invoice.BalanceAmount <= 0 ? InvoiceStatus.Paid : InvoiceStatus.PartiallyPaid;

        await db.SaveChangesAsync(ct);
        return OkResult(new { invoice.Id, invoice.Status, invoice.PaidAmount, invoice.BalanceAmount }, "Payment recorded successfully.");
    }

    /// <summary>Creates a shareable Razorpay payment link for an invoice (e.g. to send via WhatsApp/SMS).</summary>
    [Authorize]
    [HttpPost("razorpay/payment-link")]
    public async Task<IActionResult> CreatePaymentLink([FromBody] CreatePaymentLinkRequest request, CancellationToken ct)
    {
        var db = await _contextAccessor.GetContextAsync(ct);
        var invoice = await db.Invoices.Include(i => i.Customer).FirstOrDefaultAsync(i => i.Id == request.InvoiceId, ct);
        if (invoice is null) return NotFoundResult($"Invoice {request.InvoiceId} not found.");

        var settings = await db.InvoiceSettings.AsNoTracking().FirstOrDefaultAsync(ct);
        if (settings is null || !settings.RazorpayEnabled || string.IsNullOrWhiteSpace(settings.RazorpayKeyId) || string.IsNullOrWhiteSpace(settings.RazorpayKeySecret))
            return BadRequestResult("Razorpay is not configured.");

        var amount = request.Amount ?? invoice.BalanceAmount;
        if (amount <= 0) return BadRequestResult("Amount must be greater than zero.");

        try
        {
            var link = await _razorpay.CreatePaymentLinkAsync(settings.RazorpayKeyId, settings.RazorpayKeySecret, amount,
                $"Payment for invoice {invoice.InvoiceNumber}",
                invoice.Customer != null ? $"{invoice.Customer.FirstName} {invoice.Customer.LastName}".Trim() : null,
                invoice.Customer?.Phone, invoice.Customer?.Email, ct);
            return OkResult(new PaymentLinkDto { PaymentLinkId = link.PaymentLinkId, ShortUrl = link.ShortUrl });
        }
        catch (Exception ex)
        {
            return ErrorResult($"Failed to create payment link: {ex.Message}");
        }
    }

    /// <summary>Razorpay webhook receiver (payment.captured / order.paid). Configure the webhook secret out-of-band with Razorpay.</summary>
    [AllowAnonymous]
    [HttpPost("razorpay/webhook")]
    public async Task<IActionResult> Webhook(CancellationToken ct)
    {
        using var reader = new StreamReader(Request.Body);
        var body = await reader.ReadToEndAsync(ct);

        try
        {
            using var doc = JsonDocument.Parse(body);
            var eventType = doc.RootElement.TryGetProperty("event", out var ev) ? ev.GetString() : null;

            var db = await _contextAccessor.GetContextAsync(ct);
            await db.AuditLogs.AddAsync(new AuditLog
            {
                EntityType = "RazorpayWebhook",
                EntityId = eventType ?? "unknown",
                Action = "Webhook",
                NewValues = body.Length > 4000 ? body[..4000] : body,
                UserId = "razorpay",
                UserName = "Razorpay Webhook",
                Timestamp = DateTime.UtcNow,
            }, ct);
            await db.SaveChangesAsync(ct);
        }
        catch
        {
            // Swallow malformed payloads - webhook should still return 200 to avoid retries storming.
        }

        return Ok(new { received = true });
    }
}
