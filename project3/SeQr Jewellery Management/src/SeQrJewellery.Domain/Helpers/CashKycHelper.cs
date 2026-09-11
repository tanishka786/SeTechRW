using System.Text.RegularExpressions;

namespace SeQrJewellery.Domain.Helpers;

/// <summary>
/// Income Tax s.269ST: do not receive ₹2,00,000 or more in cash in a day / transaction.
/// Jewellery billing also needs PAN on file when that cash limit is crossed.
/// </summary>
public static partial class CashKycHelper
{
    public const decimal DefaultCashLimit = 200_000m;

    public static bool IsValidPan(string? pan)
        => !string.IsNullOrWhiteSpace(pan) && PanRegex().IsMatch(pan.Trim());

    public static string? NormalizePan(string? pan)
        => string.IsNullOrWhiteSpace(pan) ? null : pan.Trim().ToUpperInvariant();

    public static (DateTime StartUtc, DateTime EndUtc) GetIndiaDayUtcRange(DateTime utcNow)
    {
        var tz = GetIndiaTimeZone();
        var utc = DateTime.SpecifyKind(utcNow, DateTimeKind.Utc);
        var localDate = TimeZoneInfo.ConvertTimeFromUtc(utc, tz).Date;
        var startUtc = TimeZoneInfo.ConvertTimeToUtc(DateTime.SpecifyKind(localDate, DateTimeKind.Unspecified), tz);
        var endUtc = TimeZoneInfo.ConvertTimeToUtc(DateTime.SpecifyKind(localDate.AddDays(1), DateTimeKind.Unspecified), tz);
        return (startUtc, endUtc);
    }

    public static string? BlockReason(decimal cashTotal, decimal limit, bool hasCustomer, string? pan)
    {
        if (cashTotal < limit) return null;

        var limitText = limit.ToString("N0");
        var cashText = cashTotal.ToString("N2");
        if (!hasCustomer)
            return $"Cash of ₹{cashText} meets or exceeds the ₹{limitText} limit (Income Tax s.269ST). Select a customer and enter PAN for KYC.";
        if (!IsValidPan(pan))
            return $"Cash of ₹{cashText} meets or exceeds the ₹{limitText} limit. Enter a valid 10-character PAN (AAAAA9999A) for KYC.";
        return null;
    }

    private static TimeZoneInfo GetIndiaTimeZone()
    {
        try { return TimeZoneInfo.FindSystemTimeZoneById("India Standard Time"); }
        catch (TimeZoneNotFoundException)
        {
            return TimeZoneInfo.FindSystemTimeZoneById("Asia/Kolkata");
        }
    }

    [GeneratedRegex(@"^[A-Z]{5}[0-9]{4}[A-Z]$", RegexOptions.IgnoreCase | RegexOptions.CultureInvariant)]
    private static partial Regex PanRegex();
}
