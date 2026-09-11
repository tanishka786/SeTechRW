using System.Text;

namespace SeQrJewellery.Domain.Helpers;

/// <summary>Helpers for RFID EPC ↔ hex encoding used on <c>JewelleryTags</c>.</summary>
public static class EpcEncoding
{
    /// <summary>
    /// Encodes an EPC string as uppercase hex of its UTF-8 bytes (no separators).
    /// Example: <c>1234</c> → <c>31323334</c>.
    /// </summary>
    public static string? ToHex(string? epc)
    {
        if (string.IsNullOrWhiteSpace(epc)) return null;
        return Convert.ToHexString(Encoding.UTF8.GetBytes(epc.Trim()));
    }
}
