using System.Net.Http;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using SeQrJewellery.Application.Interfaces;

namespace SeQrJewellery.Infrastructure.Services;

/// <summary>Thin wrapper around the Razorpay REST API (https://razorpay.com/docs/api/).</summary>
public class RazorpayService : IRazorpayService
{
    private const string BaseUrl = "https://api.razorpay.com/v1";
    private readonly IHttpClientFactory _httpClientFactory;

    public RazorpayService(IHttpClientFactory httpClientFactory)
    {
        _httpClientFactory = httpClientFactory;
    }

    private HttpClient CreateClient(string keyId, string keySecret)
    {
        var client = _httpClientFactory.CreateClient("Razorpay");
        client.BaseAddress = new Uri(BaseUrl + "/");
        var basicAuth = Convert.ToBase64String(Encoding.UTF8.GetBytes($"{keyId}:{keySecret}"));
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Basic", basicAuth);
        return client;
    }

    public async Task<RazorpayOrderResult> CreateOrderAsync(string keyId, string keySecret, decimal amountRupees, string receipt, CancellationToken ct = default)
    {
        var client = CreateClient(keyId, keySecret);
        var amountInPaise = (long)Math.Round(amountRupees * 100, MidpointRounding.AwayFromZero);

        var payload = new { amount = amountInPaise, currency = "INR", receipt, payment_capture = 1 };
        var response = await client.PostAsJsonAsync("orders", payload, ct);
        var body = await response.Content.ReadAsStringAsync(ct);
        if (!response.IsSuccessStatusCode)
            throw new InvalidOperationException($"Razorpay order creation failed: {body}");

        using var doc = JsonDocument.Parse(body);
        var orderId = doc.RootElement.GetProperty("id").GetString() ?? throw new InvalidOperationException("Razorpay response missing order id.");
        return new RazorpayOrderResult(orderId, amountInPaise, "INR");
    }

    public bool VerifySignature(string keySecret, string orderId, string paymentId, string signature)
    {
        var payload = $"{orderId}|{paymentId}";
        var keyBytes = Encoding.UTF8.GetBytes(keySecret);
        using var hmac = new HMACSHA256(keyBytes);
        var hash = hmac.ComputeHash(Encoding.UTF8.GetBytes(payload));
        var computedSignature = Convert.ToHexString(hash).ToLowerInvariant();
        return CryptographicOperations.FixedTimeEquals(
            Encoding.UTF8.GetBytes(computedSignature),
            Encoding.UTF8.GetBytes(signature.ToLowerInvariant()));
    }

    public async Task<RazorpayPaymentLinkResult> CreatePaymentLinkAsync(string keyId, string keySecret, decimal amountRupees, string description,
        string? customerName, string? customerPhone, string? customerEmail, CancellationToken ct = default)
    {
        var client = CreateClient(keyId, keySecret);
        var amountInPaise = (long)Math.Round(amountRupees * 100, MidpointRounding.AwayFromZero);

        var payload = new
        {
            amount = amountInPaise,
            currency = "INR",
            description,
            customer = new { name = customerName, contact = customerPhone, email = customerEmail },
            notify = new { sms = !string.IsNullOrWhiteSpace(customerPhone), email = !string.IsNullOrWhiteSpace(customerEmail) },
            reminder_enable = true,
        };

        var response = await client.PostAsJsonAsync("payment_links", payload, ct);
        var body = await response.Content.ReadAsStringAsync(ct);
        if (!response.IsSuccessStatusCode)
            throw new InvalidOperationException($"Razorpay payment link creation failed: {body}");

        using var doc = JsonDocument.Parse(body);
        var id = doc.RootElement.GetProperty("id").GetString() ?? "";
        var shortUrl = doc.RootElement.GetProperty("short_url").GetString() ?? "";
        return new RazorpayPaymentLinkResult(id, shortUrl);
    }
}
