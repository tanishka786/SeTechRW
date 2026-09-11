namespace SeQrJewellery.Application.DTOs.Tags;

public class JewelleryTagDto
{
    public Guid Id { get; set; }
    public Guid? JewelleryItemId { get; set; }
    public long? ReferenceNumber { get; set; }
    public string BarcodeValue { get; set; } = string.Empty;
    public string? QRCodeValue { get; set; }
    public string? EPC { get; set; }
    public string? EPCHex { get; set; }
    public string? TID { get; set; }
    public bool IsPrimary { get; set; }
    public bool IsActive { get; set; }
    public bool IsMapped => JewelleryItemId.HasValue;
    public DateTime? LastScannedAt { get; set; }
    public int PrintCount { get; set; }
    public DateTime CreatedAt { get; set; }
}

public class TagScanResultDto
{
    public Guid? JewelleryItemId { get; set; }
    public string SKU { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string Category { get; set; } = string.Empty;
    public string Metal { get; set; } = string.Empty;
    public string Purity { get; set; } = string.Empty;
    public decimal GrossWeight { get; set; }
    public decimal NetWeight { get; set; }
    public decimal MetalRate { get; set; }
    public decimal SellingPrice { get; set; }
    public bool LivePriced { get; set; }
    public int QuantityInStock { get; set; }

    /// <summary>The scanned key that matched.</summary>
    public string MatchedValue { get; set; } = string.Empty;

    /// <summary>Which field matched: Barcode, QRCode, RFID, or EPCHex.</summary>
    public string MatchedBy { get; set; } = string.Empty;

    public string BarcodeValue { get; set; } = string.Empty;
    public string? QRCodeValue { get; set; }
    public string? EPC { get; set; }
    public string? EPCHex { get; set; }
    public string? HallmarkNumber { get; set; }
    public string? CertificateNumber { get; set; }
    public string? ImageUrl { get; set; }
}

/// <summary>Lookup result for preprinted / stock tags (map during item create).</summary>
public class StockTagLookupDto
{
    public Guid Id { get; set; }
    public string BarcodeValue { get; set; } = string.Empty;
    public string? QRCodeValue { get; set; }
    public string? EPC { get; set; }
    public string? EPCHex { get; set; }
    public string MatchedValue { get; set; } = string.Empty;
    public string MatchedBy { get; set; } = string.Empty;
    public bool IsAvailable { get; set; }
    public Guid? JewelleryItemId { get; set; }
    public string Message { get; set; } = string.Empty;
}

/// <summary>Availability of a ReferenceNumber range of preprinted tags (bulk item create).</summary>
public class StockRangeLookupDto
{
    public long From { get; set; }
    public long To { get; set; }
    public int Requested { get; set; }
    public int Found { get; set; }
    public int Available { get; set; }
    public bool IsAvailable => Requested > 0 && Available == Requested;
    /// <summary>Reference numbers in range with no tag (capped at 20).</summary>
    public List<long> MissingReferenceNumbers { get; set; } = [];
    /// <summary>Reference numbers already mapped or inactive (capped at 20).</summary>
    public List<long> UnavailableReferenceNumbers { get; set; } = [];
    public string Message { get; set; } = string.Empty;
}

public class AssignTagRequest
{
    public string? BarcodeValue { get; set; }
    public string? QRCodeValue { get; set; }
    public string? EPC { get; set; }
    /// <summary>Optional. If omitted and EPC is set, server derives hex from EPC.</summary>
    public string? EPCHex { get; set; }
    public string? TID { get; set; }
    public bool IsPrimary { get; set; } = true;
}

public class MapTagRequest
{
    /// <summary>Any of BarcodeValue, QRCodeValue, EPC, or EPCHex.</summary>
    public string ScanValue { get; set; } = string.Empty;
    public bool IsPrimary { get; set; } = true;
}
