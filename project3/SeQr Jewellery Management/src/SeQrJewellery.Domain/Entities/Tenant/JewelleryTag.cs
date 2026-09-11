using SeQrJewellery.Domain.Common;

namespace SeQrJewellery.Domain.Entities.Tenant;

/// <summary>
/// Physical label / RFID chip. Unmapped rows (<see cref="JewelleryItemId"/> null) are preprinted stock.
/// Lookup by any of <see cref="BarcodeValue"/>, <see cref="QRCodeValue"/>, <see cref="EPC"/>, or <see cref="EPCHex"/>.
/// </summary>
public class JewelleryTag : BaseEntity
{
    /// <summary>Null when the tag is a preprinted label still in stock (not yet mapped to an item).</summary>
    public Guid? JewelleryItemId { get; set; }

    /// <summary>Unique numeric sequence used for barcode / QR payload (Admin Label Generator).</summary>
    public long? ReferenceNumber { get; set; }

    /// <summary>Barcode / human-readable sequence (e.g. SQ1).</summary>
    public string BarcodeValue { get; set; } = string.Empty;

    /// <summary>Optional QR payload for the same physical label.</summary>
    public string? QRCodeValue { get; set; }

    /// <summary>RFID EPC (Electronic Product Code) — typically a numeric / printable token.</summary>
    public string? EPC { get; set; }

    /// <summary>Hex-encoded form of <see cref="EPC"/> (ASCII bytes as hex), used by RFID readers.</summary>
    public string? EPCHex { get; set; }

    /// <summary>RFID Tag ID (read-only chip identifier).</summary>
    public string? TID { get; set; }

    public bool IsPrimary { get; set; } = true;
    public new bool IsActive { get; set; } = true;
    public DateTime? LastScannedAt { get; set; }
    public string? LastScannedBy { get; set; }
    public string? PrintedLabelTemplate { get; set; }
    public DateTime? PrintedAt { get; set; }
    public int PrintCount { get; set; } = 0;

    public JewelleryItem? JewelleryItem { get; set; }
}
