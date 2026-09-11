namespace SeQrJewellery.Domain.Helpers;

public static class StoneSpecHelper
{
    public const decimal GramsPerCarat = 0.2m;

    public static decimal GramsFromCarat(decimal carat) =>
        Math.Round(carat * GramsPerCarat, 3, MidpointRounding.AwayFromZero);

    public static decimal CaratFromGrams(decimal grams) =>
        Math.Round(grams / GramsPerCarat, 3, MidpointRounding.AwayFromZero);

    /// <summary>e.g. "0.50ct Excellent VS1 F · IGI 2141234567"</summary>
    public static string? Format(
        decimal? carat,
        string? cut,
        string? clarity,
        string? color,
        string? lab,
        string? certificateNumber)
    {
        var parts = new List<string>();
        if (carat is > 0) parts.Add($"{carat.Value:0.###}ct");
        if (!string.IsNullOrWhiteSpace(cut)) parts.Add(cut.Trim());
        if (!string.IsNullOrWhiteSpace(clarity)) parts.Add(clarity.Trim());
        if (!string.IsNullOrWhiteSpace(color)) parts.Add(color.Trim());

        var cert = FormatCertificate(lab, certificateNumber);
        if (cert != null) parts.Add("· " + cert);

        return parts.Count == 0 ? null : string.Join(" ", parts).Replace(" ·", " ·");
    }

    public static string? FormatCertificate(string? lab, string? certificateNumber)
    {
        var id = certificateNumber?.Trim();
        var labName = lab?.Trim();
        if (string.IsNullOrEmpty(id) && string.IsNullOrEmpty(labName)) return null;
        if (string.IsNullOrEmpty(labName)) return id;
        if (string.IsNullOrEmpty(id)) return labName;
        if (id.StartsWith(labName, StringComparison.OrdinalIgnoreCase)) return id;
        return $"{labName} {id}";
    }
}
