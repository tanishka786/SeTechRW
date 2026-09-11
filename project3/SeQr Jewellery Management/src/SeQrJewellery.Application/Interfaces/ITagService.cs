using SeQrJewellery.Application.DTOs.Tags;

namespace SeQrJewellery.Application.Interfaces;

public interface ITagService
{
    /// <summary>Lookup by barcode, QR, RFID EPC, or EPC hex — any of the four identifiers.</summary>
    Task<TagScanResultDto?> LookupTagAsync(string scanValue, CancellationToken ct = default);

    /// <summary>Check if a preprinted tag is available to map (match barcode / QR / EPC / EPCHex).</summary>
    Task<StockTagLookupDto?> LookupStockTagAsync(string scanValue, CancellationToken ct = default);

    /// <summary>Check availability of a ReferenceNumber range of preprinted tags (bulk create).</summary>
    Task<StockRangeLookupDto> LookupStockRangeAsync(long from, long to, CancellationToken ct = default);

    Task<JewelleryTagDto> AssignTagAsync(Guid jewelleryItemId, AssignTagRequest request, CancellationToken ct = default);
    Task<JewelleryTagDto> MapTagToItemAsync(Guid jewelleryItemId, MapTagRequest request, CancellationToken ct = default);
    Task<bool> DeactivateTagAsync(Guid tagId, CancellationToken ct = default);
    Task<IEnumerable<JewelleryTagDto>> GetTagsForItemAsync(Guid jewelleryItemId, CancellationToken ct = default);
    Task<string> GenerateBarcodeAsync(Guid jewelleryItemId, CancellationToken ct = default);
    Task<bool> ValidateTagAsync(string scanValue, CancellationToken ct = default);
}
