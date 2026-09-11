using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SeQrJewellery.Application.DTOs.Tags;
using SeQrJewellery.Application.Interfaces;

namespace SeQrJewellery.API.Controllers;

/// <summary>Barcode, QR, and RFID tag management (including preprinted stock labels)</summary>
[Authorize]
public class TagsController : BaseController
{
    private readonly ITagService _tagService;

    public TagsController(ITagService tagService)
    {
        _tagService = tagService;
    }

    /// <summary>Scan/lookup by barcode, QR code, or RFID EPC — any of the three identifiers.</summary>
    [HttpGet("scan/{scanValue}")]
    public async Task<IActionResult> Scan(string scanValue, CancellationToken ct)
    {
        var result = await _tagService.LookupTagAsync(scanValue, ct);
        return result is null
            ? NotFoundResult($"No tag found for '{scanValue}'.")
            : OkResult(result);
    }

    /// <summary>Check if a preprinted tag is available to map (barcode / QR / EPC).</summary>
    [HttpGet("stock/{scanValue}")]
    public async Task<IActionResult> LookupStock(string scanValue, CancellationToken ct)
    {
        var result = await _tagService.LookupStockTagAsync(scanValue, ct);
        if (result is null)
            return NotFoundResult($"No tag found for '{scanValue}'.");
        return OkResult(result);
    }

    /// <summary>Check availability of a ReferenceNumber range of preprinted tags (bulk create).</summary>
    [HttpGet("stock-range")]
    public async Task<IActionResult> LookupStockRange([FromQuery] long from, [FromQuery] long to, CancellationToken ct)
    {
        if (to < from) return BadRequestResult("'to' must be greater than or equal to 'from'.");
        if (to - from + 1 > 500) return BadRequestResult("Range cannot exceed 500 tags.");
        var result = await _tagService.LookupStockRangeAsync(from, to, ct);
        return OkResult(result);
    }

    /// <summary>Get all tags for a jewellery item</summary>
    [HttpGet("item/{jewelleryItemId:guid}")]
    public async Task<IActionResult> GetTagsForItem(Guid jewelleryItemId, CancellationToken ct)
    {
        var tags = await _tagService.GetTagsForItemAsync(jewelleryItemId, ct);
        return OkResult(tags);
    }

    /// <summary>Assign a new tag or map an existing unmapped preprinted tag to a jewellery item</summary>
    [HttpPost("item/{jewelleryItemId:guid}/assign")]
    public async Task<IActionResult> AssignTag(Guid jewelleryItemId, [FromBody] AssignTagRequest request, CancellationToken ct)
    {
        try
        {
            var tag = await _tagService.AssignTagAsync(jewelleryItemId, request, ct);
            return CreatedResult(tag, "Tag assigned successfully.");
        }
        catch (KeyNotFoundException ex)
        {
            return NotFoundResult(ex.Message);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequestResult(ex.Message);
        }
    }

    /// <summary>Map an existing unmapped preprinted tag (barcode / QR / EPC) to a jewellery item</summary>
    [HttpPost("item/{jewelleryItemId:guid}/map")]
    public async Task<IActionResult> MapTag(Guid jewelleryItemId, [FromBody] MapTagRequest request, CancellationToken ct)
    {
        try
        {
            var tag = await _tagService.MapTagToItemAsync(jewelleryItemId, request, ct);
            return OkResult(tag, "Tag mapped successfully.");
        }
        catch (KeyNotFoundException ex)
        {
            return NotFoundResult(ex.Message);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequestResult(ex.Message);
        }
    }

    /// <summary>Generate a barcode value for a jewellery item</summary>
    [HttpGet("item/{jewelleryItemId:guid}/generate-barcode")]
    public async Task<IActionResult> GenerateBarcode(Guid jewelleryItemId, CancellationToken ct)
    {
        try
        {
            var barcode = await _tagService.GenerateBarcodeAsync(jewelleryItemId, ct);
            return OkResult(new { barcode });
        }
        catch (KeyNotFoundException)
        {
            return NotFoundResult($"Jewellery item {jewelleryItemId} not found.");
        }
    }

    /// <summary>Deactivate/void a tag</summary>
    [HttpDelete("{tagId:guid}")]
    public async Task<IActionResult> Deactivate(Guid tagId, CancellationToken ct)
    {
        var result = await _tagService.DeactivateTagAsync(tagId, ct);
        return result ? OkResult(true, "Tag deactivated.") : NotFoundResult($"Tag {tagId} not found.");
    }

    /// <summary>Validate if a barcode / QR / EPC exists and is active</summary>
    [HttpGet("validate/{scanValue}")]
    public async Task<IActionResult> Validate(string scanValue, CancellationToken ct)
    {
        var isValid = await _tagService.ValidateTagAsync(scanValue, ct);
        return OkResult(new { scanValue, isValid });
    }
}
