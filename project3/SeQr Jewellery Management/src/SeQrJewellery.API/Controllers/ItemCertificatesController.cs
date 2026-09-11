using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SeQrJewellery.API.Services;
using SeQrJewellery.Application.Interfaces;
using SeQrJewellery.Domain.Entities.Tenant;
using SeQrJewellery.Domain.Enums;
using SeQrJewellery.Infrastructure.Data;

namespace SeQrJewellery.API.Controllers;

/// <summary>BIS / GIA / IGI certificate files attached to a jewellery item.</summary>
[Authorize]
[Route("api/jewelleryitems/{itemId:guid}/certificates")]
public class ItemCertificatesController : BaseController
{
    private const long MaxFileBytes = 15 * 1024 * 1024;
    private const int MaxFilesPerRequest = 10;

    private static readonly HashSet<string> AllowedKinds = new(StringComparer.OrdinalIgnoreCase)
        { "BIS", "Hallmark", "GIA", "IGI", "HRD", "SGL", "GII", "Other" };

    private static readonly HashSet<string> AllowedExtensions = new(StringComparer.OrdinalIgnoreCase)
        { ".pdf", ".jpg", ".jpeg", ".png", ".webp" };

    private readonly TenantDbContextAccessor _contextAccessor;
    private readonly ITenantContextAccessor _tenantContext;
    private readonly IMediaFileStorage _storage;

    public ItemCertificatesController(
        TenantDbContextAccessor contextAccessor,
        ITenantContextAccessor tenantContext,
        IMediaFileStorage storage)
    {
        _contextAccessor = contextAccessor;
        _tenantContext = tenantContext;
        _storage = storage;
    }

    [HttpGet]
    public async Task<IActionResult> List(Guid itemId, CancellationToken ct)
    {
        var db = await _contextAccessor.GetContextAsync(ct);
        var media = await db.ItemMedia
            .Where(m => m.JewelleryItemId == itemId && m.MediaType == MediaType.Document)
            .OrderBy(m => m.CertificateKind).ThenBy(m => m.CreatedAt)
            .AsNoTracking()
            .ToListAsync(ct);
        return OkResult(media.Select(ItemMediaController.MapToDto));
    }

    [HttpPost]
    [RequestSizeLimit(80 * 1024 * 1024)]
    [RequestFormLimits(MultipartBodyLengthLimit = 80 * 1024 * 1024)]
    public async Task<IActionResult> Upload(Guid itemId, [FromForm] List<IFormFile> files, [FromForm] string? certificateKind, CancellationToken ct)
    {
        if (files.Count == 0) return BadRequestResult("No files uploaded.");
        if (files.Count > MaxFilesPerRequest) return BadRequestResult($"Maximum {MaxFilesPerRequest} files per upload.");

        var kind = NormalizeKind(certificateKind);

        var db = await _contextAccessor.GetContextAsync(ct);
        var item = await db.JewelleryItems.FindAsync([itemId], cancellationToken: ct);
        if (item is null) return NotFoundResult($"Item {itemId} not found.");

        foreach (var file in files)
        {
            var ext = Path.GetExtension(file.FileName);
            if (!AllowedExtensions.Contains(ext))
                return BadRequestResult($"'{file.FileName}': upload a PDF or image (JPG, PNG, WebP).");
            if (file.Length <= 0 || file.Length > MaxFileBytes)
                return BadRequestResult($"'{file.FileName}': files must be 15 MB or smaller.");
        }

        var nextSort = await db.ItemMedia.Where(m => m.JewelleryItemId == itemId)
            .Select(m => (int?)m.SortOrder).MaxAsync(ct) ?? -1;

        var created = new List<ItemMedia>();
        foreach (var file in files)
        {
            var media = new ItemMedia
            {
                JewelleryItemId = itemId,
                FileName = Path.GetFileName(file.FileName),
                ContentType = string.IsNullOrWhiteSpace(file.ContentType) ? "application/octet-stream" : file.ContentType,
                MediaType = MediaType.Document,
                CertificateKind = kind,
                FileSizeBytes = file.Length,
                SortOrder = ++nextSort,
                IsPrimary = false,
                CreatedBy = _tenantContext.UserName,
            };

            await using (var stream = file.OpenReadStream())
            {
                media.StoragePath = await _storage.SaveAsync(
                    _tenantContext.TenantIdentifier, itemId, media.Id, file.FileName, stream, ct);
            }

            await db.ItemMedia.AddAsync(media, ct);
            created.Add(media);
        }

        await db.SaveChangesAsync(ct);
        return CreatedResult(created.Select(ItemMediaController.MapToDto), $"{created.Count} certificate file(s) uploaded.");
    }

    [HttpDelete("{mediaId:guid}")]
    public async Task<IActionResult> Delete(Guid itemId, Guid mediaId, CancellationToken ct)
    {
        var db = await _contextAccessor.GetContextAsync(ct);
        var media = await db.ItemMedia.FirstOrDefaultAsync(
            m => m.Id == mediaId && m.JewelleryItemId == itemId && m.MediaType == MediaType.Document, ct);
        if (media is null) return NotFoundResult($"Certificate {mediaId} not found.");

        db.ItemMedia.Remove(media);
        await db.SaveChangesAsync(ct);
        _storage.Delete(media.StoragePath);
        return OkResult(true, "Certificate removed.");
    }

    private static string NormalizeKind(string? kind)
    {
        var value = string.IsNullOrWhiteSpace(kind) ? "Other" : kind.Trim();
        return AllowedKinds.FirstOrDefault(k => k.Equals(value, StringComparison.OrdinalIgnoreCase)) ?? "Other";
    }
}
