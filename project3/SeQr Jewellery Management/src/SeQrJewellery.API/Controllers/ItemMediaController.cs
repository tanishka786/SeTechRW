using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SeQrJewellery.API.Services;
using SeQrJewellery.Application.DTOs.Jewellery;
using SeQrJewellery.Application.Interfaces;
using SeQrJewellery.Domain.Entities.Tenant;
using SeQrJewellery.Domain.Enums;
using SeQrJewellery.Infrastructure.Data;

namespace SeQrJewellery.API.Controllers;

/// <summary>Images and videos attached to jewellery items</summary>
[Authorize]
[Route("api/jewelleryitems/{itemId:guid}/media")]
public class ItemMediaController : BaseController
{
    private const long MaxImageBytes = 10 * 1024 * 1024;   // 10 MB
    private const long MaxVideoBytes = 100 * 1024 * 1024;  // 100 MB
    private const int MaxFilesPerRequest = 10;

    private static readonly HashSet<string> ImageExtensions = new(StringComparer.OrdinalIgnoreCase)
        { ".jpg", ".jpeg", ".png", ".webp", ".gif" };
    private static readonly HashSet<string> VideoExtensions = new(StringComparer.OrdinalIgnoreCase)
        { ".mp4", ".webm", ".mov" };

    private readonly TenantDbContextAccessor _contextAccessor;
    private readonly ITenantContextAccessor _tenantContext;
    private readonly IMediaFileStorage _storage;
    private readonly IImageEmbeddingService _embeddingService;

    public ItemMediaController(
        TenantDbContextAccessor contextAccessor,
        ITenantContextAccessor tenantContext,
        IMediaFileStorage storage,
        IImageEmbeddingService embeddingService)
    {
        _contextAccessor = contextAccessor;
        _tenantContext = tenantContext;
        _storage = storage;
        _embeddingService = embeddingService;
    }

    /// <summary>List media for an item</summary>
    [HttpGet]
    public async Task<IActionResult> List(Guid itemId, CancellationToken ct)
    {
        var db = await _contextAccessor.GetContextAsync(ct);
        var media = await db.ItemMedia
            .Where(m => m.JewelleryItemId == itemId && m.MediaType != MediaType.Document)
            .OrderByDescending(m => m.IsPrimary).ThenBy(m => m.SortOrder).ThenBy(m => m.CreatedAt)
            .AsNoTracking()
            .ToListAsync(ct);
        return OkResult(media.Select(MapToDto));
    }

    /// <summary>Upload one or more images/videos for an item (multipart/form-data, field "files")</summary>
    [HttpPost]
    [RequestSizeLimit(220 * 1024 * 1024)]
    [RequestFormLimits(MultipartBodyLengthLimit = 220 * 1024 * 1024)]
    public async Task<IActionResult> Upload(Guid itemId, [FromForm] List<IFormFile> files, CancellationToken ct)
    {
        if (files.Count == 0) return BadRequestResult("No files uploaded.");
        if (files.Count > MaxFilesPerRequest) return BadRequestResult($"Maximum {MaxFilesPerRequest} files per upload.");

        var db = await _contextAccessor.GetContextAsync(ct);
        var item = await db.JewelleryItems.FindAsync([itemId], cancellationToken: ct);
        if (item is null) return NotFoundResult($"Item {itemId} not found.");

        // Validate everything before saving anything
        foreach (var file in files)
        {
            var ext = Path.GetExtension(file.FileName);
            var isImage = ImageExtensions.Contains(ext);
            var isVideo = VideoExtensions.Contains(ext);
            if (!isImage && !isVideo)
                return BadRequestResult($"'{file.FileName}': unsupported file type. Allowed: {string.Join(", ", ImageExtensions.Concat(VideoExtensions))}.");
            if (isImage && file.Length > MaxImageBytes)
                return BadRequestResult($"'{file.FileName}': images must be 10 MB or smaller.");
            if (isVideo && file.Length > MaxVideoBytes)
                return BadRequestResult($"'{file.FileName}': videos must be 100 MB or smaller.");
        }

        var hasPrimary = await db.ItemMedia.AnyAsync(m => m.JewelleryItemId == itemId && m.IsPrimary, ct);
        var nextSort = await db.ItemMedia.Where(m => m.JewelleryItemId == itemId)
            .Select(m => (int?)m.SortOrder).MaxAsync(ct) ?? -1;

        var created = new List<ItemMedia>();
        foreach (var file in files)
        {
            var isImage = ImageExtensions.Contains(Path.GetExtension(file.FileName));
            var media = new ItemMedia
            {
                JewelleryItemId = itemId,
                FileName = file.FileName,
                ContentType = file.ContentType,
                MediaType = isImage ? MediaType.Image : MediaType.Video,
                FileSizeBytes = file.Length,
                SortOrder = ++nextSort,
                IsPrimary = isImage && !hasPrimary,
                CreatedBy = _tenantContext.UserName,
            };
            if (media.IsPrimary) hasPrimary = true;

            await using (var stream = file.OpenReadStream())
            {
                media.StoragePath = await _storage.SaveAsync(
                    _tenantContext.TenantIdentifier, itemId, media.Id, file.FileName, stream, ct);
            }

            if (isImage)
            {
                try
                {
                    var physical = _storage.GetPhysicalPath(media.StoragePath);
                    if (physical is not null)
                        media.Embedding = await _embeddingService.EmbedImageFileAsync(physical, ct);
                }
                catch
                {
                    // Embedding is best-effort; the image is still stored and searchable by text.
                }
            }

            await db.ItemMedia.AddAsync(media, ct);
            created.Add(media);
        }

        await db.SaveChangesAsync(ct);
        return CreatedResult(created.Select(MapToDto), $"{created.Count} file(s) uploaded.");
    }

    /// <summary>Delete a media file</summary>
    [HttpDelete("{mediaId:guid}")]
    public async Task<IActionResult> Delete(Guid itemId, Guid mediaId, CancellationToken ct)
    {
        var db = await _contextAccessor.GetContextAsync(ct);
        var media = await db.ItemMedia.FirstOrDefaultAsync(m => m.Id == mediaId && m.JewelleryItemId == itemId, ct);
        if (media is null) return NotFoundResult($"Media {mediaId} not found.");

        db.ItemMedia.Remove(media);

        // If the primary image was removed, promote the next image
        if (media.IsPrimary)
        {
            var next = await db.ItemMedia
                .Where(m => m.JewelleryItemId == itemId && m.Id != mediaId && m.MediaType == MediaType.Image)
                .OrderBy(m => m.SortOrder)
                .FirstOrDefaultAsync(ct);
            if (next is not null) next.IsPrimary = true;
        }

        await db.SaveChangesAsync(ct);
        _storage.Delete(media.StoragePath);
        return OkResult(true, "Media deleted.");
    }

    /// <summary>Mark an image as the item's primary image</summary>
    [HttpPut("{mediaId:guid}/primary")]
    public async Task<IActionResult> SetPrimary(Guid itemId, Guid mediaId, CancellationToken ct)
    {
        var db = await _contextAccessor.GetContextAsync(ct);
        var media = await db.ItemMedia.FirstOrDefaultAsync(m => m.Id == mediaId && m.JewelleryItemId == itemId, ct);
        if (media is null) return NotFoundResult($"Media {mediaId} not found.");
        if (media.MediaType != MediaType.Image) return BadRequestResult("Only images can be set as primary.");

        var others = await db.ItemMedia.Where(m => m.JewelleryItemId == itemId && m.IsPrimary && m.Id != mediaId).ToListAsync(ct);
        foreach (var o in others) o.IsPrimary = false;
        media.IsPrimary = true;

        await db.SaveChangesAsync(ct);
        return OkResult(MapToDto(media));
    }

    internal static ItemMediaDto MapToDto(ItemMedia m) => new()
    {
        Id = m.Id,
        Url = m.StoragePath,
        FileName = m.FileName,
        ContentType = m.ContentType,
        MediaType = m.MediaType.ToString(),
        FileSizeBytes = m.FileSizeBytes,
        SortOrder = m.SortOrder,
        IsPrimary = m.IsPrimary,
        CertificateKind = m.CertificateKind,
    };
}
