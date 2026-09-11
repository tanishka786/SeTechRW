using Microsoft.EntityFrameworkCore;
using SeQrJewellery.Application.DTOs.Tags;
using SeQrJewellery.Application.Interfaces;
using SeQrJewellery.Domain.Entities.Tenant;
using SeQrJewellery.Domain.Helpers;
using SeQrJewellery.Infrastructure.Data;

namespace SeQrJewellery.Infrastructure.Services;

public class TagService : ITagService
{
    private readonly TenantDbContextAccessor _contextAccessor;
    private readonly ITenantContextAccessor _tenantContext;

    public TagService(TenantDbContextAccessor contextAccessor, ITenantContextAccessor tenantContext)
    {
        _contextAccessor = contextAccessor;
        _tenantContext = tenantContext;
    }

    public async Task<TagScanResultDto?> LookupTagAsync(string scanValue, CancellationToken ct = default)
    {
        var db = await _contextAccessor.GetContextAsync(ct);
        var key = Normalize(scanValue);
        if (key is null) return null;

        var tag = await FindByAnyIdentifierAsync(db, key, ct);
        if (tag is null) return null;

        // Load item graph for mapped tags
        if (tag.JewelleryItemId.HasValue)
        {
            await db.Entry(tag).Reference(t => t.JewelleryItem).LoadAsync(ct);
            if (tag.JewelleryItem != null)
            {
                await db.Entry(tag.JewelleryItem).Reference(i => i.Category).LoadAsync(ct);
                await db.Entry(tag.JewelleryItem).Reference(i => i.Metal).LoadAsync(ct);
                await db.Entry(tag.JewelleryItem).Reference(i => i.Purity).LoadAsync(ct);
            }
        }

        tag.LastScannedAt = DateTime.UtcNow;
        tag.LastScannedBy = _tenantContext.UserName;
        await db.SaveChangesAsync(ct);

        var (matchedBy, matchedValue) = ResolveMatch(tag, key);

        if (tag.JewelleryItem is null)
        {
            return new TagScanResultDto
            {
                JewelleryItemId = null,
                Name = "(Unmapped label)",
                MatchedValue = matchedValue,
                MatchedBy = matchedBy,
                BarcodeValue = tag.BarcodeValue,
                QRCodeValue = tag.QRCodeValue,
                EPC = tag.EPC,
                EPCHex = tag.EPCHex
            };
        }

        var item = tag.JewelleryItem;
        var live = await LiveMetalRateService.ResolveAsync(db, item.MetalId, item.PurityId, ct);
        var (_, _, _, liveSelling) = LiveMetalRateService.PriceItem(item, live.RatePerGram);
        return new TagScanResultDto
        {
            JewelleryItemId = item.Id,
            SKU = item.SKU,
            Name = item.Name,
            Category = item.Category?.Name ?? "",
            Metal = item.Metal?.Name ?? "",
            Purity = item.Purity?.Name ?? "",
            GrossWeight = item.GrossWeight,
            NetWeight = item.NetWeight,
            MetalRate = live.RatePerGram,
            SellingPrice = liveSelling,
            LivePriced = true,
            QuantityInStock = item.QuantityInStock,
            MatchedValue = matchedValue,
            MatchedBy = matchedBy,
            BarcodeValue = tag.BarcodeValue,
            QRCodeValue = tag.QRCodeValue,
            EPC = tag.EPC,
            EPCHex = tag.EPCHex,
            HallmarkNumber = item.HallmarkNumber,
            CertificateNumber = item.CertificateNumber,
            StoneCarat = item.StoneCarat,
            StoneCut = item.StoneCut,
            StoneClarity = item.StoneClarity,
            StoneColor = item.StoneColor,
            CertificateLab = item.CertificateLab,
            StoneSpecs = StoneSpecHelper.Format(item.StoneCarat, item.StoneCut, item.StoneClarity, item.StoneColor, item.CertificateLab, item.CertificateNumber)
        };
    }

    public async Task<StockTagLookupDto?> LookupStockTagAsync(string scanValue, CancellationToken ct = default)
    {
        var db = await _contextAccessor.GetContextAsync(ct);
        var key = Normalize(scanValue);
        if (key is null) return null;

        var tag = await FindByAnyIdentifierAsync(db, key, ct, asNoTracking: true);

        if (tag is null)
        {
            return new StockTagLookupDto
            {
                MatchedValue = key,
                IsAvailable = false,
                Message = $"No tag found for '{key}'."
            };
        }

        var (matchedBy, matchedValue) = ResolveMatch(tag, key);
        var baseDto = new StockTagLookupDto
        {
            Id = tag.Id,
            BarcodeValue = tag.BarcodeValue,
            QRCodeValue = tag.QRCodeValue,
            EPC = tag.EPC,
            EPCHex = tag.EPCHex,
            MatchedValue = matchedValue,
            MatchedBy = matchedBy,
            JewelleryItemId = tag.JewelleryItemId
        };

        if (!tag.IsActive)
        {
            baseDto.IsAvailable = false;
            baseDto.Message = "Tag is inactive.";
            return baseDto;
        }

        if (tag.JewelleryItemId.HasValue)
        {
            baseDto.IsAvailable = false;
            baseDto.Message = "Tag is already mapped to an item.";
            return baseDto;
        }

        baseDto.IsAvailable = true;
        baseDto.Message = "Tag is available to map.";
        return baseDto;
    }

    public async Task<StockRangeLookupDto> LookupStockRangeAsync(long from, long to, CancellationToken ct = default)
    {
        var db = await _contextAccessor.GetContextAsync(ct);
        var result = new StockRangeLookupDto { From = from, To = to };

        if (to < from)
        {
            result.Message = "Invalid range: 'to' must be greater than or equal to 'from'.";
            return result;
        }

        result.Requested = (int)(to - from + 1);

        var tags = await db.JewelleryTags
            .Where(t => t.ReferenceNumber >= from && t.ReferenceNumber <= to)
            .Select(t => new { t.ReferenceNumber, t.JewelleryItemId, t.IsActive })
            .AsNoTracking()
            .ToListAsync(ct);

        result.Found = tags.Count;
        var foundRefs = tags.Select(t => t.ReferenceNumber!.Value).ToHashSet();
        result.MissingReferenceNumbers = EnumerateRange(from, to)
            .Where(r => !foundRefs.Contains(r)).Take(20).ToList();
        result.UnavailableReferenceNumbers = tags
            .Where(t => t.JewelleryItemId.HasValue || !t.IsActive)
            .Select(t => t.ReferenceNumber!.Value).Order().Take(20).ToList();
        result.Available = tags.Count(t => !t.JewelleryItemId.HasValue && t.IsActive);

        result.Message = result.IsAvailable
            ? $"All {result.Available} tag(s) in range are available to map."
            : $"{result.Available} of {result.Requested} tag(s) available."
              + (result.MissingReferenceNumbers.Count > 0 ? $" Missing: {string.Join(", ", result.MissingReferenceNumbers)}." : "")
              + (result.UnavailableReferenceNumbers.Count > 0 ? $" Already mapped/inactive: {string.Join(", ", result.UnavailableReferenceNumbers)}." : "");
        return result;
    }

    private static IEnumerable<long> EnumerateRange(long from, long to)
    {
        for (var r = from; r <= to; r++) yield return r;
    }

    public async Task<JewelleryTagDto> MapTagToItemAsync(Guid jewelleryItemId, MapTagRequest request, CancellationToken ct = default)
    {
        var db = await _contextAccessor.GetContextAsync(ct);
        var key = Normalize(request.ScanValue)
            ?? throw new InvalidOperationException("Scan value is required.");

        if (!await db.JewelleryItems.AnyAsync(i => i.Id == jewelleryItemId, ct))
            throw new KeyNotFoundException($"Jewellery item {jewelleryItemId} not found.");

        var tag = await FindByAnyIdentifierAsync(db, key, ct)
            ?? throw new InvalidOperationException($"No preprinted tag found for '{key}'.");

        if (!tag.IsActive)
            throw new InvalidOperationException($"Tag '{tag.BarcodeValue}' is inactive.");

        if (tag.JewelleryItemId.HasValue)
            throw new InvalidOperationException($"Tag '{tag.BarcodeValue}' is already mapped to another item.");

        if (request.IsPrimary)
            await ClearPrimaryAsync(db, jewelleryItemId, ct);

        tag.JewelleryItemId = jewelleryItemId;
        tag.IsPrimary = request.IsPrimary;
        await db.SaveChangesAsync(ct);

        return MapToDto(tag);
    }

    public async Task<JewelleryTagDto> AssignTagAsync(Guid jewelleryItemId, AssignTagRequest request, CancellationToken ct = default)
    {
        var db = await _contextAccessor.GetContextAsync(ct);

        if (!await db.JewelleryItems.AnyAsync(i => i.Id == jewelleryItemId, ct))
            throw new KeyNotFoundException($"Jewellery item {jewelleryItemId} not found.");

        var barcode = Normalize(request.BarcodeValue);
        var qr = Normalize(request.QRCodeValue);
        var epc = Normalize(request.EPC);
        var epcHex = Normalize(request.EPCHex)?.ToUpperInvariant() ?? EpcEncoding.ToHex(epc);

        // Prefer mapping an existing unmapped preprinted label matched by any identifier.
        JewelleryTag? existing = null;
        if (barcode != null) existing = await FindByAnyIdentifierAsync(db, barcode, ct);
        if (existing is null && qr != null) existing = await FindByAnyIdentifierAsync(db, qr, ct);
        if (existing is null && epc != null) existing = await FindByAnyIdentifierAsync(db, epc, ct);
        if (existing is null && epcHex != null) existing = await FindByAnyIdentifierAsync(db, epcHex, ct);

        if (existing != null)
        {
            if (existing.JewelleryItemId.HasValue)
                throw new InvalidOperationException($"Tag '{existing.BarcodeValue}' is already assigned to another item.");

            return await MapTagToItemAsync(jewelleryItemId, new MapTagRequest
            {
                ScanValue = existing.BarcodeValue,
                IsPrimary = request.IsPrimary
            }, ct);
        }

        barcode ??= await GenerateBarcodeAsync(jewelleryItemId, ct);

        if (request.IsPrimary)
            await ClearPrimaryAsync(db, jewelleryItemId, ct);

        var tag = new JewelleryTag
        {
            JewelleryItemId = jewelleryItemId,
            BarcodeValue = barcode,
            QRCodeValue = qr,
            EPC = epc,
            EPCHex = epcHex,
            TID = request.TID,
            IsPrimary = request.IsPrimary,
            IsActive = true
        };

        await db.JewelleryTags.AddAsync(tag, ct);
        await db.SaveChangesAsync(ct);

        return MapToDto(tag);
    }

    public async Task<bool> DeactivateTagAsync(Guid tagId, CancellationToken ct = default)
    {
        var db = await _contextAccessor.GetContextAsync(ct);
        var tag = await db.JewelleryTags.FindAsync([tagId], cancellationToken: ct);
        if (tag is null) return false;
        tag.IsActive = false;
        await db.SaveChangesAsync(ct);
        return true;
    }

    public async Task<IEnumerable<JewelleryTagDto>> GetTagsForItemAsync(Guid jewelleryItemId, CancellationToken ct = default)
    {
        var db = await _contextAccessor.GetContextAsync(ct);
        var tags = await db.JewelleryTags
            .Where(t => t.JewelleryItemId == jewelleryItemId)
            .AsNoTracking()
            .ToListAsync(ct);
        return tags.Select(MapToDto);
    }

    public async Task<string> GenerateBarcodeAsync(Guid jewelleryItemId, CancellationToken ct = default)
    {
        var db = await _contextAccessor.GetContextAsync(ct);
        var item = await db.JewelleryItems.FindAsync([jewelleryItemId], cancellationToken: ct)
            ?? throw new KeyNotFoundException($"Item {jewelleryItemId} not found.");

        var cleanSku = item.SKU.Replace("-", "").ToUpper();
        var timestamp = DateTime.UtcNow.ToString("yyMMddHHmm");
        return $"SQR{cleanSku}{timestamp}";
    }

    public async Task<bool> ValidateTagAsync(string scanValue, CancellationToken ct = default)
    {
        var db = await _contextAccessor.GetContextAsync(ct);
        var key = Normalize(scanValue);
        if (key is null) return false;
        var tag = await FindByAnyIdentifierAsync(db, key, ct, asNoTracking: true);
        return tag is { IsActive: true };
    }

    private static async Task<JewelleryTag?> FindByAnyIdentifierAsync(
        TenantDbContext db, string key, CancellationToken ct, bool asNoTracking = false)
    {
        var query = db.JewelleryTags.AsQueryable();
        if (asNoTracking) query = query.AsNoTracking();

        var keyUpper = key.ToUpperInvariant();
        return await query.FirstOrDefaultAsync(
            t => t.BarcodeValue == key
                 || t.QRCodeValue == key
                 || t.EPC == key
                 || t.EPCHex == key
                 || t.EPCHex == keyUpper,
            ct);
    }

    private static async Task ClearPrimaryAsync(TenantDbContext db, Guid jewelleryItemId, CancellationToken ct)
    {
        var existingPrimary = await db.JewelleryTags
            .Where(t => t.JewelleryItemId == jewelleryItemId && t.IsPrimary && t.IsActive)
            .FirstOrDefaultAsync(ct);
        if (existingPrimary != null)
            existingPrimary.IsPrimary = false;
    }

    private static (string MatchedBy, string MatchedValue) ResolveMatch(JewelleryTag tag, string key)
    {
        if (string.Equals(tag.BarcodeValue, key, StringComparison.Ordinal))
            return ("Barcode", tag.BarcodeValue);
        if (tag.QRCodeValue != null && string.Equals(tag.QRCodeValue, key, StringComparison.Ordinal))
            return ("QRCode", tag.QRCodeValue);
        if (tag.EPC != null && string.Equals(tag.EPC, key, StringComparison.Ordinal))
            return ("RFID", tag.EPC);
        if (tag.EPCHex != null && string.Equals(tag.EPCHex, key, StringComparison.OrdinalIgnoreCase))
            return ("EPCHex", tag.EPCHex);
        return ("Barcode", tag.BarcodeValue);
    }

    private static string? Normalize(string? value) =>
        string.IsNullOrWhiteSpace(value) ? null : value.Trim();

    private static JewelleryTagDto MapToDto(JewelleryTag t) => new()
    {
        Id = t.Id,
        JewelleryItemId = t.JewelleryItemId,
        ReferenceNumber = t.ReferenceNumber,
        BarcodeValue = t.BarcodeValue,
        QRCodeValue = t.QRCodeValue,
        EPC = t.EPC,
        EPCHex = t.EPCHex,
        TID = t.TID,
        IsPrimary = t.IsPrimary,
        IsActive = t.IsActive,
        LastScannedAt = t.LastScannedAt,
        PrintCount = t.PrintCount,
        CreatedAt = t.CreatedAt
    };
}
