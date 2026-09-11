using SeQrJewellery.Domain.Enums;

namespace SeQrJewellery.Application.DTOs.Jewellery;

public class JewelleryItemDto
{
    public Guid Id { get; set; }
    public string SKU { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public Guid CategoryId { get; set; }
    public string CategoryName { get; set; } = string.Empty;
    public Guid MetalId { get; set; }
    public string MetalName { get; set; } = string.Empty;
    public Guid PurityId { get; set; }
    public string PurityName { get; set; } = string.Empty;
    public Guid? SupplierId { get; set; }
    public string? SupplierName { get; set; }
    public decimal GrossWeight { get; set; }
    public decimal NetWeight { get; set; }
    public decimal StoneWeight { get; set; }
    public decimal? StoneCarat { get; set; }
    public string? StoneCut { get; set; }
    public string? StoneClarity { get; set; }
    public string? StoneColor { get; set; }
    public string? CertificateLab { get; set; }
    public decimal WastagePercent { get; set; }
    public decimal MetalRate { get; set; }
    public decimal MetalValue { get; set; }
    public decimal MakingCharges { get; set; }
    public decimal MakingChargesPercent { get; set; }
    public MakingChargeType MakingChargeType { get; set; } = MakingChargeType.Lumpsum;
    public decimal MakingChargeValue { get; set; }
    public decimal StoneCharges { get; set; }
    public decimal OtherCharges { get; set; }
    public decimal Discount { get; set; }
    public decimal TaxPercent { get; set; }
    public decimal TaxAmount { get; set; }
    public decimal SellingPrice { get; set; }
    public decimal CostPrice { get; set; }
    public int QuantityInStock { get; set; }
    public string? Location { get; set; }
    public string? Design { get; set; }
    public string? Style { get; set; }
    public string? Size { get; set; }
    public string? Color { get; set; }
    public string? Occasion { get; set; }
    public string? Gender { get; set; }
    public string? Collection { get; set; }
    public string? HallmarkNumber { get; set; }
    public string? CertificateNumber { get; set; }
    public bool IsBISCertified { get; set; }
    public bool IsConsignment { get; set; }
    public string? Notes { get; set; }
    public string? ImageUrls { get; set; }
    public string? PrimaryImageUrl { get; set; }
    public List<ItemMediaDto> Media { get; set; } = [];
    public bool IsActive { get; set; }
    public bool IsSold { get; set; }
    public DateTime CreatedAt { get; set; }
}

public class SkuSuggestionDto
{
    public Guid Id { get; set; }
    public string SKU { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string MetalName { get; set; } = string.Empty;
    public string PurityName { get; set; } = string.Empty;
    public int QuantityInStock { get; set; }
    public decimal SellingPrice { get; set; }
}

public class ItemMediaDto
{
    public Guid Id { get; set; }
    public string Url { get; set; } = string.Empty;
    public string FileName { get; set; } = string.Empty;
    public string ContentType { get; set; } = string.Empty;
    /// <summary>"Image", "Video", or "Document"</summary>
    public string MediaType { get; set; } = string.Empty;
    public long FileSizeBytes { get; set; }
    public int SortOrder { get; set; }
    public bool IsPrimary { get; set; }
    /// <summary>BIS, GIA, IGI, Hallmark, etc. when MediaType is Document.</summary>
    public string? CertificateKind { get; set; }
}

public class CreateJewelleryItemRequest
{
    public string? SKU { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public Guid CategoryId { get; set; }
    public Guid MetalId { get; set; }
    public Guid PurityId { get; set; }
    public Guid? SupplierId { get; set; }
    public decimal GrossWeight { get; set; }
    public decimal NetWeight { get; set; }
    public decimal StoneWeight { get; set; } = 0;
    public decimal? StoneCarat { get; set; }
    public string? StoneCut { get; set; }
    public string? StoneClarity { get; set; }
    public string? StoneColor { get; set; }
    public string? CertificateLab { get; set; }
    public decimal WastagePercent { get; set; } = 0;
    public decimal MetalRate { get; set; }
    public decimal MakingCharges { get; set; } = 0;
    public decimal MakingChargesPercent { get; set; } = 0;
    public MakingChargeType MakingChargeType { get; set; } = MakingChargeType.Lumpsum;
    public decimal MakingChargeValue { get; set; } = 0;
    public decimal StoneCharges { get; set; } = 0;
    public decimal OtherCharges { get; set; } = 0;
    public decimal Discount { get; set; } = 0;
    public decimal TaxPercent { get; set; } = 3;
    public decimal CostPrice { get; set; } = 0;
    public int InitialStock { get; set; } = 1;
    public string? Location { get; set; }
    public string? Design { get; set; }
    public string? Style { get; set; }
    public string? Size { get; set; }
    public string? Color { get; set; }
    public string? Occasion { get; set; }
    public string? Gender { get; set; }
    public string? Collection { get; set; }
    public string? CertificateNumber { get; set; }
    public string? HallmarkNumber { get; set; }
    public bool IsBISCertified { get; set; } = false;
    public bool IsConsignment { get; set; } = false;
    public string? Notes { get; set; }
    public DateTime? PurchaseDate { get; set; }

    /// <summary>
    /// Optional preprinted tag to map on create. Match by barcode, QR code, or RFID EPC.
    /// Tag must exist, be active, and not already mapped to an item.
    /// </summary>
    public string? MapTagValue { get; set; }

    /// <summary>
    /// When true and SKU already exists, add <see cref="InitialStock"/> to that item instead of creating a new one.
    /// </summary>
    public bool AddToExistingSku { get; set; }
}

/// <summary>
/// Creates many identical items at once, one per preprinted tag. Provide either
/// TagValues (scanned Barcode/QR/EPC/Hex values) or a ReferenceNumber range.
/// Each created item gets quantity 1, a suffixed SKU (BASE-001, BASE-002, …) and its tag mapped.
/// </summary>
public class BulkCreateJewelleryItemsRequest : CreateJewelleryItemRequest
{
    public List<string>? TagValues { get; set; }
    public long? ReferenceFrom { get; set; }
    public long? ReferenceTo { get; set; }
}

public class BulkCreateJewelleryItemsResult
{
    public int CreatedCount { get; set; }
    public string BaseSku { get; set; } = string.Empty;
    public string? FirstSku { get; set; }
    public string? LastSku { get; set; }
}

/// <summary>One match from search-by-image, best-matching media first.</summary>
public class ImageSearchResultDto
{
    public JewelleryItemDto Item { get; set; } = null!;
    /// <summary>Cosine similarity 0..1 (higher is more similar).</summary>
    public double Score { get; set; }
    public string? MatchedMediaUrl { get; set; }
}

public class UpdateJewelleryItemRequest
{
    public string? Name { get; set; }
    public string? Description { get; set; }
    public Guid? CategoryId { get; set; }
    public Guid? MetalId { get; set; }
    public Guid? PurityId { get; set; }
    public Guid? SupplierId { get; set; }
    public decimal? GrossWeight { get; set; }
    public decimal? NetWeight { get; set; }
    public decimal? StoneWeight { get; set; }
    public decimal? StoneCarat { get; set; }
    public string? StoneCut { get; set; }
    public string? StoneClarity { get; set; }
    public string? StoneColor { get; set; }
    public string? CertificateLab { get; set; }
    public decimal? WastagePercent { get; set; }
    public decimal? MetalRate { get; set; }
    public decimal? MakingCharges { get; set; }
    public decimal? MakingChargesPercent { get; set; }
    public MakingChargeType? MakingChargeType { get; set; }
    public decimal? MakingChargeValue { get; set; }
    public decimal? StoneCharges { get; set; }
    public decimal? OtherCharges { get; set; }
    public decimal? Discount { get; set; }
    public decimal? TaxPercent { get; set; }
    public decimal? CostPrice { get; set; }
    public string? Location { get; set; }
    public string? Design { get; set; }
    public string? Style { get; set; }
    public string? Size { get; set; }
    public string? CertificateNumber { get; set; }
    public string? HallmarkNumber { get; set; }
    public bool? IsBISCertified { get; set; }
    public string? Notes { get; set; }
    public bool? IsActive { get; set; }
}

public class JewelleryItemFilterRequest
{
    public string? SearchTerm { get; set; }
    public Guid? CategoryId { get; set; }
    public Guid? MetalId { get; set; }
    public Guid? PurityId { get; set; }
    public Guid? SupplierId { get; set; }
    public decimal? MinPrice { get; set; }
    public decimal? MaxPrice { get; set; }
    public decimal? MinWeight { get; set; }
    public decimal? MaxWeight { get; set; }
    public string? Location { get; set; }
    public string? Design { get; set; }
    public string? Style { get; set; }
    public bool? HallmarkedOnly { get; set; }
    public DateTime? CreatedFrom { get; set; }
    public DateTime? CreatedTo { get; set; }
    public bool? InStock { get; set; }
    public bool? IsActive { get; set; } = true;
    public int PageNumber { get; set; } = 1;
    public int PageSize { get; set; } = 20;
    public string? SortBy { get; set; } = "CreatedAt";
    public bool SortDescending { get; set; } = true;
}
