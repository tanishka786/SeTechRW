using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SeQrJewellery.Application.DTOs.Common;
using SeQrJewellery.Application.DTOs.Jewellery;
using SeQrJewellery.Application.DTOs.Tags;
using SeQrJewellery.Application.Interfaces;
using SeQrJewellery.Domain.Entities.Tenant;
using SeQrJewellery.Domain.Enums;
using SeQrJewellery.Domain.Helpers;
using SeQrJewellery.Infrastructure.Data;

namespace SeQrJewellery.API.Controllers;

/// <summary>Jewellery inventory management</summary>
[Authorize]
public class JewelleryItemsController : BaseController
{
    private readonly TenantDbContextAccessor _contextAccessor;
    private readonly ITagService _tagService;
    private readonly IImageEmbeddingService _embeddingService;
    private readonly Services.IMediaFileStorage _mediaStorage;

    public JewelleryItemsController(
        TenantDbContextAccessor contextAccessor,
        ITagService tagService,
        IImageEmbeddingService embeddingService,
        Services.IMediaFileStorage mediaStorage)
    {
        _contextAccessor = contextAccessor;
        _tagService = tagService;
        _embeddingService = embeddingService;
        _mediaStorage = mediaStorage;
    }

    /// <summary>Get paginated list of jewellery items with filtering</summary>
    [HttpGet]
    public async Task<IActionResult> GetAll([FromQuery] JewelleryItemFilterRequest filter, CancellationToken ct)
    {
        var db = await _contextAccessor.GetContextAsync(ct);
        var query = db.JewelleryItems
            .Include(i => i.Category)
            .Include(i => i.Metal)
            .Include(i => i.Purity)
            .Include(i => i.Supplier)
            .Include(i => i.Media)
            .AsNoTracking()
            .Where(i => !i.IsDeleted);

        if (!string.IsNullOrWhiteSpace(filter.SearchTerm))
        {
            var term = filter.SearchTerm.ToLower();
            query = query.Where(i => i.SKU.ToLower().Contains(term) ||
                i.Name.ToLower().Contains(term) ||
                (i.Description != null && i.Description.ToLower().Contains(term)));
        }

        if (filter.CategoryId.HasValue)
            query = await ApplyCategoryFilterAsync(db, query, filter.CategoryId.Value, ct);
        if (filter.MetalId.HasValue)
            query = await ApplyMetalFilterAsync(db, query, filter.MetalId.Value, ct);
        if (filter.PurityId.HasValue) query = query.Where(i => i.PurityId == filter.PurityId);
        if (filter.SupplierId.HasValue) query = query.Where(i => i.SupplierId == filter.SupplierId);
        if (filter.MinPrice.HasValue) query = query.Where(i => i.SellingPrice >= filter.MinPrice);
        if (filter.MaxPrice.HasValue) query = query.Where(i => i.SellingPrice <= filter.MaxPrice);
        if (filter.MinWeight.HasValue) query = query.Where(i => i.NetWeight >= filter.MinWeight);
        if (filter.MaxWeight.HasValue) query = query.Where(i => i.NetWeight <= filter.MaxWeight);
        if (!string.IsNullOrWhiteSpace(filter.Location))
            query = query.Where(i => i.Location != null && i.Location.ToLower().Contains(filter.Location.ToLower()));
        if (!string.IsNullOrWhiteSpace(filter.Design))
            query = query.Where(i => i.Design != null && i.Design.ToLower().Contains(filter.Design.ToLower()));
        if (!string.IsNullOrWhiteSpace(filter.Style))
            query = query.Where(i => i.Style != null && i.Style.ToLower().Contains(filter.Style.ToLower()));
        if (filter.HallmarkedOnly == true)
            query = query.Where(i => i.HallmarkNumber != null && i.HallmarkNumber != "");
        if (filter.CreatedFrom.HasValue) query = query.Where(i => i.CreatedAt >= filter.CreatedFrom.Value);
        if (filter.CreatedTo.HasValue) query = query.Where(i => i.CreatedAt <= filter.CreatedTo.Value);
        if (filter.InStock.HasValue) query = filter.InStock.Value
            ? query.Where(i => i.QuantityInStock > 0)
            : query.Where(i => i.QuantityInStock == 0);
        if (filter.IsActive.HasValue) query = query.Where(i => i.IsActive == filter.IsActive.Value);

        var totalCount = await query.CountAsync(ct);

        query = filter.SortBy?.ToLower() switch
        {
            "sku" => filter.SortDescending ? query.OrderByDescending(i => i.SKU) : query.OrderBy(i => i.SKU),
            "name" => filter.SortDescending ? query.OrderByDescending(i => i.Name) : query.OrderBy(i => i.Name),
            "price" => filter.SortDescending ? query.OrderByDescending(i => i.SellingPrice) : query.OrderBy(i => i.SellingPrice),
            "weight" => filter.SortDescending ? query.OrderByDescending(i => i.NetWeight) : query.OrderBy(i => i.NetWeight),
            _ => filter.SortDescending ? query.OrderByDescending(i => i.CreatedAt) : query.OrderBy(i => i.CreatedAt)
        };

        var items = await query.Skip((filter.PageNumber - 1) * filter.PageSize).Take(filter.PageSize).ToListAsync(ct);

        return OkResult(new PagedResult<JewelleryItemDto>
        {
            Items = items.Select(MapToDto),
            TotalCount = totalCount,
            PageNumber = filter.PageNumber,
            PageSize = filter.PageSize
        });
    }

    /// <summary>Get a single jewellery item by ID</summary>
    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetById(Guid id, CancellationToken ct)
    {
        var db = await _contextAccessor.GetContextAsync(ct);
        var item = await db.JewelleryItems
            .Include(i => i.Category)
            .Include(i => i.Metal)
            .Include(i => i.Purity)
            .Include(i => i.Supplier)
            .Include(i => i.Tags.Where(t => t.IsActive))
            .Include(i => i.Media)
            .AsNoTracking()
            .FirstOrDefaultAsync(i => i.Id == id, ct);

        return item is null ? NotFoundResult($"Item {id} not found.") : OkResult(MapToDto(item));
    }

    /// <summary>Get jewellery item by SKU</summary>
    [HttpGet("sku/{sku}")]
    public async Task<IActionResult> GetBySku(string sku, CancellationToken ct)
    {
        var db = await _contextAccessor.GetContextAsync(ct);
        var item = await db.JewelleryItems
            .Include(i => i.Category).Include(i => i.Metal).Include(i => i.Purity)
            .AsNoTracking().FirstOrDefaultAsync(i => i.SKU == sku, ct);
        return item is null ? NotFoundResult($"Item with SKU '{sku}' not found.") : OkResult(MapToDto(item));
    }

    /// <summary>SKU autocomplete suggestions for inventory entry</summary>
    [HttpGet("sku-suggestions")]
    public async Task<IActionResult> SkuSuggestions([FromQuery] string? q, [FromQuery] int limit = 10, CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(q) || q.Trim().Length < 1)
            return OkResult(Array.Empty<SkuSuggestionDto>());

        var db = await _contextAccessor.GetContextAsync(ct);
        var term = q.Trim().ToLower();
        limit = Math.Clamp(limit, 1, 50);

        var items = await db.JewelleryItems
            .AsNoTracking()
            .Include(i => i.Metal)
            .Include(i => i.Purity)
            .Where(i => i.IsActive && (i.SKU.ToLower().Contains(term) || i.Name.ToLower().Contains(term)))
            .OrderBy(i => i.SKU)
            .Take(limit)
            .Select(i => new SkuSuggestionDto
            {
                Id = i.Id,
                SKU = i.SKU,
                Name = i.Name,
                MetalName = i.Metal != null ? i.Metal.Name : "",
                PurityName = i.Purity != null ? i.Purity.Name : "",
                QuantityInStock = i.QuantityInStock,
                SellingPrice = i.SellingPrice
            })
            .ToListAsync(ct);

        return OkResult(items);
    }

    /// <summary>Create a new jewellery item, or add stock to an existing SKU when AddToExistingSku is true</summary>
    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateJewelleryItemRequest request, CancellationToken ct)
    {
        var db = await _contextAccessor.GetContextAsync(ct);

        var sku = string.IsNullOrWhiteSpace(request.SKU)
            ? await GenerateSKUAsync(db, ct)
            : request.SKU.Trim();

        var existing = await db.JewelleryItems.FirstOrDefaultAsync(i => i.SKU == sku, ct);
        if (existing is not null)
        {
            if (!request.AddToExistingSku)
                return BadRequestResult($"SKU '{sku}' already exists. Set addToExistingSku to add stock instead.");

            var addQty = request.InitialStock > 0 ? request.InitialStock : 1;
            var before = existing.QuantityInStock;
            existing.QuantityInStock += addQty;
            if (existing.IsSold && existing.QuantityInStock > 0)
            {
                existing.IsSold = false;
                existing.SoldAt = null;
            }

            // Refresh pricing from request so bulk restocks can update rate/charges
            ApplyPricingFromRequest(existing, request);

            await db.StockMovements.AddAsync(new StockMovement
            {
                JewelleryItemId = existing.Id,
                MovementType = StockMovementType.Purchase,
                QuantityBefore = before,
                QuantityChange = addQty,
                QuantityAfter = existing.QuantityInStock,
                ReferenceType = "StockAdd",
                Notes = $"Stock added via existing SKU '{sku}'",
                MovedBy = User.Identity?.Name ?? "system"
            }, ct);

            await db.SaveChangesAsync(ct);

            existing.Category = (await db.Categories.FindAsync([existing.CategoryId], cancellationToken: ct))!;
            existing.Metal = (await db.Metals.FindAsync([existing.MetalId], cancellationToken: ct))!;
            existing.Purity = (await db.Purities.FindAsync([existing.PurityId], cancellationToken: ct))!;

            return OkResult(MapToDto(existing), $"Added {addQty} unit(s) to existing SKU '{sku}'. New stock: {existing.QuantityInStock}.");
        }

        // Validate optional preprinted tag before creating the item.
        if (!string.IsNullOrWhiteSpace(request.MapTagValue))
        {
            var stock = await _tagService.LookupStockTagAsync(request.MapTagValue.Trim(), ct);
            if (stock is null || !stock.IsAvailable)
                return BadRequestResult(stock?.Message ?? $"Tag '{request.MapTagValue}' is not available to map.");
        }

        var item = BuildItem(request, sku, request.InitialStock);

        await db.JewelleryItems.AddAsync(item, ct);

        if (request.InitialStock > 0)
        {
            await db.StockMovements.AddAsync(new StockMovement
            {
                JewelleryItemId = item.Id,
                MovementType = StockMovementType.Opening,
                QuantityBefore = 0,
                QuantityChange = request.InitialStock,
                QuantityAfter = request.InitialStock,
                ReferenceType = "Opening",
                Notes = "Initial stock",
                MovedBy = "system"
            }, ct);
        }

        await db.SaveChangesAsync(ct);

        if (!string.IsNullOrWhiteSpace(request.MapTagValue))
        {
            try
            {
                await _tagService.MapTagToItemAsync(item.Id, new MapTagRequest
                {
                    ScanValue = request.MapTagValue.Trim(),
                    IsPrimary = true
                }, ct);
            }
            catch (InvalidOperationException ex)
            {
                return BadRequestResult(ex.Message);
            }
        }

        item.Category = (await db.Categories.FindAsync([item.CategoryId], cancellationToken: ct))!;
        item.Metal = (await db.Metals.FindAsync([item.MetalId], cancellationToken: ct))!;
        item.Purity = (await db.Purities.FindAsync([item.PurityId], cancellationToken: ct))!;

        return CreatedResult(MapToDto(item!), "Jewellery item created successfully.");
    }

    /// <summary>Update a jewellery item</summary>
    [HttpPut("{id:guid}")]
    public async Task<IActionResult> Update(Guid id, [FromBody] UpdateJewelleryItemRequest request, CancellationToken ct)
    {
        var db = await _contextAccessor.GetContextAsync(ct);
        var item = await db.JewelleryItems.FindAsync([id], cancellationToken: ct);
        if (item is null) return NotFoundResult($"Item {id} not found.");

        if (request.Name != null) item.Name = request.Name;
        if (request.Description != null) item.Description = request.Description;
        if (request.CategoryId.HasValue) item.CategoryId = request.CategoryId.Value;
        if (request.MetalId.HasValue) item.MetalId = request.MetalId.Value;
        if (request.PurityId.HasValue) item.PurityId = request.PurityId.Value;
        if (request.SupplierId.HasValue) item.SupplierId = request.SupplierId;
        if (request.GrossWeight.HasValue) item.GrossWeight = request.GrossWeight.Value;
        if (request.NetWeight.HasValue) item.NetWeight = request.NetWeight.Value;
        if (request.StoneWeight.HasValue) item.StoneWeight = request.StoneWeight.Value;
        if (request.WastagePercent.HasValue) item.WastagePercent = request.WastagePercent.Value;
        if (request.MetalRate.HasValue) item.MetalRate = request.MetalRate.Value;
        if (request.MakingCharges.HasValue) item.MakingCharges = request.MakingCharges.Value;
        if (request.MakingChargesPercent.HasValue) item.MakingChargesPercent = request.MakingChargesPercent.Value;
        if (request.MakingChargeType.HasValue) item.MakingChargeType = request.MakingChargeType.Value;
        if (request.MakingChargeValue.HasValue) item.MakingChargeValue = request.MakingChargeValue.Value;
        if (request.StoneCharges.HasValue) item.StoneCharges = request.StoneCharges.Value;
        if (request.OtherCharges.HasValue) item.OtherCharges = request.OtherCharges.Value;
        if (request.Discount.HasValue) item.Discount = request.Discount.Value;
        if (request.TaxPercent.HasValue) item.TaxPercent = request.TaxPercent.Value;
        if (request.CostPrice.HasValue) item.CostPrice = request.CostPrice.Value;
        if (request.Location != null) item.Location = request.Location;
        if (request.Design != null) item.Design = request.Design;
        if (request.Style != null) item.Style = request.Style;
        if (request.Size != null) item.Size = request.Size;
        if (request.CertificateNumber != null) item.CertificateNumber = request.CertificateNumber;
        if (request.HallmarkNumber != null) item.HallmarkNumber = request.HallmarkNumber;
        if (request.IsBISCertified.HasValue) item.IsBISCertified = request.IsBISCertified.Value;
        if (request.Notes != null) item.Notes = request.Notes;
        if (request.IsActive.HasValue) item.IsActive = request.IsActive.Value;

        // Recalculate price when pricing inputs change
        if (request.MetalRate.HasValue || request.MakingCharges.HasValue || request.MakingChargeType.HasValue
            || request.MakingChargeValue.HasValue || request.MakingChargesPercent.HasValue
            || request.TaxPercent.HasValue || request.NetWeight.HasValue || request.WastagePercent.HasValue
            || request.StoneCharges.HasValue || request.OtherCharges.HasValue || request.Discount.HasValue)
        {
            RecalculateItemPricing(item);
        }

        await db.SaveChangesAsync(ct);
        return OkResult(MapToDto(item));
    }

    /// <summary>Soft-delete a jewellery item</summary>
    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id, CancellationToken ct)
    {
        var db = await _contextAccessor.GetContextAsync(ct);
        var item = await db.JewelleryItems.FindAsync([id], cancellationToken: ct);
        if (item is null) return NotFoundResult($"Item {id} not found.");
        item.IsDeleted = true;
        item.IsActive = false;
        await db.SaveChangesAsync(ct);
        return OkResult(true, "Item deleted.");
    }

    /// <summary>Get stock movements for an item</summary>
    [HttpGet("{id:guid}/stock-movements")]
    public async Task<IActionResult> GetStockMovements(Guid id, CancellationToken ct)
    {
        var db = await _contextAccessor.GetContextAsync(ct);
        var movements = await db.StockMovements
            .Where(s => s.JewelleryItemId == id)
            .OrderByDescending(s => s.CreatedAt)
            .AsNoTracking()
            .ToListAsync(ct);
        return OkResult(movements);
    }

    /// <summary>
    /// Create many identical items at once, one per preprinted tag.
    /// Tags come from TagValues (scanned Barcode/QR/EPC/Hex) or a ReferenceNumber range.
    /// Each item is created with quantity 1, a suffixed SKU, and its tag mapped as primary.
    /// </summary>
    [HttpPost("bulk")]
    public async Task<IActionResult> BulkCreate([FromBody] BulkCreateJewelleryItemsRequest request, CancellationToken ct)
    {
        const int maxBatch = 500;
        var db = await _contextAccessor.GetContextAsync(ct);

        // ── Resolve tags ─────────────────────────────────────────────────
        List<JewelleryTag> tags;
        if (request.ReferenceFrom.HasValue || request.ReferenceTo.HasValue)
        {
            if (!request.ReferenceFrom.HasValue || !request.ReferenceTo.HasValue)
                return BadRequestResult("Both referenceFrom and referenceTo are required for a range.");
            var from = request.ReferenceFrom.Value;
            var to = request.ReferenceTo.Value;
            if (to < from) return BadRequestResult("referenceTo must be greater than or equal to referenceFrom.");
            if (to - from + 1 > maxBatch) return BadRequestResult($"Range cannot exceed {maxBatch} tags.");

            var range = await _tagService.LookupStockRangeAsync(from, to, ct);
            if (!range.IsAvailable) return BadRequestResult(range.Message);

            tags = await db.JewelleryTags
                .Where(t => t.ReferenceNumber >= from && t.ReferenceNumber <= to)
                .OrderBy(t => t.ReferenceNumber)
                .ToListAsync(ct);
        }
        else if (request.TagValues is { Count: > 0 })
        {
            var values = request.TagValues
                .Select(v => v?.Trim())
                .Where(v => !string.IsNullOrEmpty(v))
                .Select(v => v!)
                .Distinct()
                .ToList();
            if (values.Count == 0) return BadRequestResult("No valid tag values provided.");
            if (values.Count > maxBatch) return BadRequestResult($"Cannot map more than {maxBatch} tags per request.");

            var upperValues = values.Select(v => v.ToUpperInvariant()).ToList();
            var candidates = await db.JewelleryTags
                .Where(t => values.Contains(t.BarcodeValue)
                    || (t.QRCodeValue != null && values.Contains(t.QRCodeValue))
                    || (t.EPC != null && values.Contains(t.EPC))
                    || (t.EPCHex != null && (values.Contains(t.EPCHex) || upperValues.Contains(t.EPCHex))))
                .ToListAsync(ct);

            tags = [];
            var seen = new HashSet<Guid>();
            var notFound = new List<string>();
            foreach (var value in values)
            {
                var upper = value.ToUpperInvariant();
                var tag = candidates.FirstOrDefault(t =>
                    t.BarcodeValue == value || t.QRCodeValue == value || t.EPC == value ||
                    t.EPCHex == value || t.EPCHex == upper);
                if (tag is null) { notFound.Add(value); continue; }
                if (seen.Add(tag.Id)) tags.Add(tag);
            }
            if (notFound.Count > 0)
                return BadRequestResult($"No tag found for: {string.Join(", ", notFound.Take(20))}.");

            var unavailable = tags.Where(t => t.JewelleryItemId.HasValue || !t.IsActive)
                .Select(t => t.BarcodeValue).ToList();
            if (unavailable.Count > 0)
                return BadRequestResult($"Tag(s) already mapped or inactive: {string.Join(", ", unavailable.Take(20))}.");
        }
        else
        {
            return BadRequestResult("Provide either tagValues or a referenceFrom/referenceTo range.");
        }

        if (tags.Count == 0) return BadRequestResult("No tags resolved for the request.");

        // ── SKUs (unique index — suffix per piece) ───────────────────────
        var baseSku = string.IsNullOrWhiteSpace(request.SKU)
            ? await GenerateSKUAsync(db, ct)
            : request.SKU.Trim();
        var suffixDigits = tags.Count >= 1000 ? 4 : 3;
        var skus = Enumerable.Range(1, tags.Count)
            .Select(i => $"{baseSku}-{i.ToString($"D{suffixDigits}")}")
            .ToList();
        var conflicts = await db.JewelleryItems.IgnoreQueryFilters()
            .Where(i => skus.Contains(i.SKU))
            .Select(i => i.SKU)
            .ToListAsync(ct);
        if (conflicts.Count > 0)
            return BadRequestResult($"SKU(s) already exist: {string.Join(", ", conflicts.Take(10))}. Choose a different base SKU.");

        // ── Create one item per tag (single transaction via one SaveChanges) ─
        var created = new List<JewelleryItem>(tags.Count);
        for (var i = 0; i < tags.Count; i++)
        {
            var item = BuildItem(request, skus[i], quantity: 1);
            await db.JewelleryItems.AddAsync(item, ct);
            await db.StockMovements.AddAsync(new StockMovement
            {
                JewelleryItemId = item.Id,
                MovementType = StockMovementType.Opening,
                QuantityBefore = 0,
                QuantityChange = 1,
                QuantityAfter = 1,
                ReferenceType = "Opening",
                Notes = "Initial stock (bulk create)",
                MovedBy = "system"
            }, ct);

            tags[i].JewelleryItemId = item.Id;
            tags[i].IsPrimary = true;
            created.Add(item);
        }

        await db.SaveChangesAsync(ct);

        return CreatedResult(new BulkCreateJewelleryItemsResult
        {
            CreatedCount = created.Count,
            BaseSku = baseSku,
            FirstSku = created.FirstOrDefault()?.SKU,
            LastSku = created.LastOrDefault()?.SKU,
        }, $"{created.Count} item(s) created and mapped to tags.");
    }

    /// <summary>
    /// Find inventory items that look like the uploaded photo (multipart/form-data, field "image").
    /// Uses CLIP visual embeddings over item media; returns the best matches with a similarity score.
    /// </summary>
    [HttpPost("search-by-image")]
    [RequestSizeLimit(20 * 1024 * 1024)]
    public async Task<IActionResult> SearchByImage([FromForm] IFormFile image, [FromQuery] int top = 10, CancellationToken ct = default)
    {
        if (image is null || image.Length == 0) return BadRequestResult("No image uploaded.");
        if (!_embeddingService.IsAvailable)
            return BadRequestResult(_embeddingService.UnavailableReason
                ?? $"Image search is not available. Expected model at '{_embeddingService.ModelPath}'.");

        byte[] bytes;
        await using (var ms = new MemoryStream())
        {
            await image.CopyToAsync(ms, ct);
            bytes = ms.ToArray();
        }

        byte[]? queryEmbedding;
        try
        {
            queryEmbedding = await _embeddingService.EmbedImageAsync(bytes, ct);
        }
        catch
        {
            return BadRequestResult("Could not process the uploaded image. Use a JPG/PNG/WebP photo.");
        }
        if (queryEmbedding is null) return BadRequestResult("Image search is not available.");

        var queryVector = Infrastructure.Services.ClipImageEmbeddingService.ToFloats(queryEmbedding);

        var db = await _contextAccessor.GetContextAsync(ct);
        var mediaEmbeddings = await db.ItemMedia
            .Where(m => m.Embedding != null)
            .Select(m => new { m.JewelleryItemId, m.Embedding, m.StoragePath })
            .AsNoTracking()
            .ToListAsync(ct);

        if (mediaEmbeddings.Count == 0)
            return OkResult(Array.Empty<ImageSearchResultDto>(),
                "No items have indexed images yet. Upload item photos (or run the embedding backfill) first.");

        // Best score per item across all its images
        var bestPerItem = new Dictionary<Guid, (double Score, string Url)>();
        foreach (var m in mediaEmbeddings)
        {
            var score = Infrastructure.Services.ClipImageEmbeddingService.CosineSimilarity(
                queryVector, Infrastructure.Services.ClipImageEmbeddingService.ToFloats(m.Embedding!));
            if (!bestPerItem.TryGetValue(m.JewelleryItemId, out var existing) || score > existing.Score)
                bestPerItem[m.JewelleryItemId] = (score, m.StoragePath);
        }

        var topMatches = bestPerItem
            .OrderByDescending(kv => kv.Value.Score)
            .Take(Math.Clamp(top, 1, 50))
            .ToList();

        var itemIds = topMatches.Select(kv => kv.Key).ToList();
        var items = await db.JewelleryItems
            .Include(i => i.Category).Include(i => i.Metal).Include(i => i.Purity).Include(i => i.Media)
            .Where(i => itemIds.Contains(i.Id))
            .AsNoTracking()
            .ToListAsync(ct);
        var itemsById = items.ToDictionary(i => i.Id);

        var results = topMatches
            .Where(kv => itemsById.ContainsKey(kv.Key))
            .Select(kv => new ImageSearchResultDto
            {
                Item = MapToDto(itemsById[kv.Key]),
                Score = Math.Round(kv.Value.Score, 4),
                MatchedMediaUrl = kv.Value.Url,
            });

        return OkResult(results);
    }

    /// <summary>Compute embeddings for item images uploaded before image search was enabled.</summary>
    [HttpPost("media/embeddings/backfill")]
    public async Task<IActionResult> BackfillEmbeddings(CancellationToken ct)
    {
        if (!_embeddingService.IsAvailable)
            return BadRequestResult(_embeddingService.UnavailableReason
                ?? $"CLIP model is not available. Expected at '{_embeddingService.ModelPath}'.");

        var db = await _contextAccessor.GetContextAsync(ct);
        var pending = await db.ItemMedia
            .Where(m => m.Embedding == null && m.MediaType == MediaType.Image)
            .ToListAsync(ct);

        int done = 0, failed = 0;
        foreach (var media in pending)
        {
            var physical = _mediaStorage.GetPhysicalPath(media.StoragePath);
            if (physical is null || !System.IO.File.Exists(physical)) { failed++; continue; }
            try
            {
                media.Embedding = await _embeddingService.EmbedImageFileAsync(physical, ct);
                if (media.Embedding is null) { failed++; continue; }
                done++;
            }
            catch
            {
                failed++;
            }
        }

        await db.SaveChangesAsync(ct);
        return OkResult(new { processed = done, failed, total = pending.Count },
            $"Embedded {done} image(s); {failed} failed or missing.");
    }

    private static JewelleryItem BuildItem(CreateJewelleryItemRequest request, string sku, int quantity)
    {
        var chargeType = ResolveMakingChargeType(request);
        var chargeValue = ResolveMakingChargeValue(request, chargeType);
        var (metalValue, makingCharges, taxAmount, sellingPrice) = PricingHelper.Calculate(
            request.NetWeight, request.MetalRate, request.WastagePercent,
            chargeType, chargeValue,
            request.StoneCharges, request.OtherCharges, request.Discount, request.TaxPercent,
            request.MakingCharges, request.MakingChargesPercent);

        return new JewelleryItem
        {
            SKU = sku,
            Name = request.Name,
            Description = request.Description,
            CategoryId = request.CategoryId,
            MetalId = request.MetalId,
            PurityId = request.PurityId,
            SupplierId = request.SupplierId,
            GrossWeight = request.GrossWeight,
            NetWeight = request.NetWeight,
            StoneWeight = request.StoneWeight,
            WastagePercent = request.WastagePercent,
            WastageWeight = request.NetWeight * request.WastagePercent / 100,
            MetalRate = request.MetalRate,
            MetalValue = metalValue,
            MakingCharges = makingCharges,
            MakingChargesPercent = chargeType == MakingChargeType.PercentOfMetalRate
                ? chargeValue
                : request.MakingChargesPercent,
            MakingChargeType = chargeType,
            MakingChargeValue = chargeValue,
            StoneCharges = request.StoneCharges,
            OtherCharges = request.OtherCharges,
            Discount = request.Discount,
            TaxPercent = request.TaxPercent,
            TaxAmount = taxAmount,
            SellingPrice = sellingPrice,
            CostPrice = request.CostPrice,
            QuantityInStock = quantity,
            Location = request.Location,
            Design = request.Design,
            Style = request.Style,
            Size = request.Size,
            Color = request.Color,
            Occasion = request.Occasion,
            Gender = request.Gender,
            Collection = request.Collection,
            CertificateNumber = request.CertificateNumber,
            HallmarkNumber = request.HallmarkNumber,
            IsBISCertified = request.IsBISCertified,
            IsConsignment = request.IsConsignment,
            Notes = request.Notes,
            PurchaseDate = request.PurchaseDate
        };
    }

    private static MakingChargeType ResolveMakingChargeType(CreateJewelleryItemRequest request)
    {
        if (request.MakingChargeType != MakingChargeType.Lumpsum || request.MakingChargeValue > 0)
            return request.MakingChargeType;
        // Legacy clients: percent > 0 means percent mode
        if (request.MakingChargesPercent > 0) return MakingChargeType.PercentOfMetalRate;
        return MakingChargeType.Lumpsum;
    }

    private static decimal ResolveMakingChargeValue(CreateJewelleryItemRequest request, MakingChargeType type) =>
        type switch
        {
            MakingChargeType.PercentOfMetalRate => request.MakingChargeValue > 0
                ? request.MakingChargeValue
                : request.MakingChargesPercent,
            MakingChargeType.PerGramAmount => request.MakingChargeValue,
            _ => request.MakingChargeValue > 0 ? request.MakingChargeValue : request.MakingCharges
        };

    private static void ApplyPricingFromRequest(JewelleryItem item, CreateJewelleryItemRequest request)
    {
        item.Name = string.IsNullOrWhiteSpace(request.Name) ? item.Name : request.Name;
        if (request.CategoryId != Guid.Empty) item.CategoryId = request.CategoryId;
        if (request.MetalId != Guid.Empty) item.MetalId = request.MetalId;
        if (request.PurityId != Guid.Empty) item.PurityId = request.PurityId;
        if (request.GrossWeight > 0) item.GrossWeight = request.GrossWeight;
        if (request.NetWeight > 0) item.NetWeight = request.NetWeight;
        item.StoneWeight = request.StoneWeight;
        item.WastagePercent = request.WastagePercent;
        if (request.MetalRate > 0) item.MetalRate = request.MetalRate;
        item.MakingChargeType = ResolveMakingChargeType(request);
        item.MakingChargeValue = ResolveMakingChargeValue(request, item.MakingChargeType);
        item.MakingChargesPercent = item.MakingChargeType == MakingChargeType.PercentOfMetalRate
            ? item.MakingChargeValue
            : request.MakingChargesPercent;
        item.StoneCharges = request.StoneCharges;
        item.OtherCharges = request.OtherCharges;
        item.Discount = request.Discount;
        item.TaxPercent = request.TaxPercent;
        if (request.CostPrice > 0) item.CostPrice = request.CostPrice;
        if (request.Location != null) item.Location = request.Location;
        if (request.Design != null) item.Design = request.Design;
        if (request.Style != null) item.Style = request.Style;
        if (request.Size != null) item.Size = request.Size;
        if (request.HallmarkNumber != null) item.HallmarkNumber = request.HallmarkNumber;
        if (request.CertificateNumber != null) item.CertificateNumber = request.CertificateNumber;
        item.IsBISCertified = request.IsBISCertified;
        RecalculateItemPricing(item);
    }

    internal static void RecalculateItemPricing(JewelleryItem item)
    {
        var (metalValue, makingCharges, taxAmount, sellingPrice) = PricingHelper.Calculate(
            item.NetWeight, item.MetalRate, item.WastagePercent,
            item.MakingChargeType, item.MakingChargeValue,
            item.StoneCharges, item.OtherCharges, item.Discount, item.TaxPercent,
            item.MakingCharges, item.MakingChargesPercent);
        item.MetalValue = metalValue;
        item.MakingCharges = makingCharges;
        item.WastageWeight = item.NetWeight * item.WastagePercent / 100;
        item.TaxAmount = taxAmount;
        item.SellingPrice = sellingPrice;
    }

    private static async Task<string> GenerateSKUAsync(Infrastructure.Data.TenantDbContext db, CancellationToken ct)
    {
        var count = await db.JewelleryItems.IgnoreQueryFilters().CountAsync(ct);
        return $"ITEM-{(count + 1):D5}";
    }

    /// <summary>
    /// Parent category → that category plus all subcategories.
    /// Subcategory (e.g. Gold Bangles) → items in that subcategory, plus parent-category
    /// items that match the implied metal or distinctive keyword (e.g. Gold / Engagement).
    /// </summary>
    private static async Task<IQueryable<JewelleryItem>> ApplyCategoryFilterAsync(
        TenantDbContext db,
        IQueryable<JewelleryItem> query,
        Guid categoryId,
        CancellationToken ct)
    {
        var category = await db.Categories.AsNoTracking()
            .FirstOrDefaultAsync(c => c.Id == categoryId, ct);
        if (category is null)
            return query.Where(i => i.CategoryId == categoryId);

        if (category.ParentCategoryId is null)
        {
            var ids = await db.Categories.AsNoTracking()
                .Where(c => c.Id == categoryId || c.ParentCategoryId == categoryId)
                .Select(c => c.Id)
                .ToListAsync(ct);
            return query.Where(i => ids.Contains(i.CategoryId));
        }

        var parentId = category.ParentCategoryId.Value;
        var parentName = await db.Categories.AsNoTracking()
            .Where(c => c.Id == parentId)
            .Select(c => c.Name)
            .FirstOrDefaultAsync(ct) ?? "";

        var metalIds = await db.Metals.AsNoTracking()
            .Where(m => category.Name.Contains(m.Name))
            .Select(m => m.Id)
            .ToListAsync(ct);

        if (metalIds.Count > 0)
        {
            return query.Where(i =>
                i.CategoryId == categoryId
                || (i.CategoryId == parentId && metalIds.Contains(i.MetalId)));
        }

        var keyword = DistinctiveCategoryKeyword(category.Name, parentName);
        if (string.IsNullOrEmpty(keyword))
            return query.Where(i => i.CategoryId == categoryId);

        var terms = ExpandSearchStems(keyword);
        var term0 = terms[0];
        var term1 = terms.Count > 1 ? terms[1] : terms[0];

        return query.Where(i =>
            i.CategoryId == categoryId
            || (i.CategoryId == parentId && (
                i.Name.ToLower().Contains(term0) || i.Name.ToLower().Contains(term1)
                || (i.Style != null && (i.Style.ToLower().Contains(term0) || i.Style.ToLower().Contains(term1)))
                || (i.Design != null && (i.Design.ToLower().Contains(term0) || i.Design.ToLower().Contains(term1)))
                || (i.Description != null && (i.Description.ToLower().Contains(term0) || i.Description.ToLower().Contains(term1))))));
    }

    /// <summary>
    /// Match by metal record, and also by name/category/description so pieces like
    /// "Diamond Solitaire Ring" (gold setting, diamond stone) appear under Diamond.
    /// </summary>
    private static async Task<IQueryable<JewelleryItem>> ApplyMetalFilterAsync(
        TenantDbContext db,
        IQueryable<JewelleryItem> query,
        Guid metalId,
        CancellationToken ct)
    {
        var metalName = (await db.Metals.AsNoTracking()
            .Where(m => m.Id == metalId)
            .Select(m => m.Name)
            .FirstOrDefaultAsync(ct))?.ToLower();

        if (string.IsNullOrEmpty(metalName))
            return query.Where(i => i.MetalId == metalId);

        return query.Where(i =>
            i.MetalId == metalId
            || i.Name.ToLower().Contains(metalName)
            || (i.Category != null && i.Category.Name.ToLower().Contains(metalName))
            || (i.Description != null && i.Description.ToLower().Contains(metalName)));
    }

    private static string DistinctiveCategoryKeyword(string categoryName, string parentName)
    {
        var separators = new[] { ' ', '&', '-' };
        var parentTokens = parentName.Split(separators, StringSplitOptions.RemoveEmptyEntries)
            .Select(t => t.Trim().ToLowerInvariant())
            .Where(t => t.Length > 1)
            .ToHashSet();
        return categoryName.Split(separators, StringSplitOptions.RemoveEmptyEntries)
            .Select(t => t.Trim().ToLowerInvariant())
            .FirstOrDefault(t => t.Length > 1 && !parentTokens.Contains(t)) ?? "";
    }

    /// <summary>jhumkas → jhumka so singular item names still match the subcategory.</summary>
    private static List<string> ExpandSearchStems(string keyword)
    {
        var terms = new List<string> { keyword };
        if (keyword.EndsWith("ies", StringComparison.Ordinal) && keyword.Length > 4)
            terms.Add(keyword[..^3] + "y");
        else if (keyword.EndsWith("ses", StringComparison.Ordinal) && keyword.Length > 4)
            terms.Add(keyword[..^2]);
        else if (keyword.EndsWith('s') && !keyword.EndsWith("ss", StringComparison.Ordinal) && keyword.Length > 3)
            terms.Add(keyword[..^1]);
        return terms.Distinct().ToList();
    }

    private static JewelleryItemDto MapToDto(JewelleryItem i) => new()
    {
        Id = i.Id,
        SKU = i.SKU,
        Name = i.Name,
        Description = i.Description,
        CategoryId = i.CategoryId,
        CategoryName = i.Category?.Name ?? "",
        MetalId = i.MetalId,
        MetalName = i.Metal?.Name ?? "",
        PurityId = i.PurityId,
        PurityName = i.Purity?.Name ?? "",
        SupplierId = i.SupplierId,
        SupplierName = i.Supplier?.Name,
        GrossWeight = i.GrossWeight,
        NetWeight = i.NetWeight,
        StoneWeight = i.StoneWeight,
        WastagePercent = i.WastagePercent,
        MetalRate = i.MetalRate,
        MetalValue = i.MetalValue,
        MakingCharges = i.MakingCharges,
        MakingChargesPercent = i.MakingChargesPercent,
        MakingChargeType = i.MakingChargeType,
        MakingChargeValue = i.MakingChargeValue,
        StoneCharges = i.StoneCharges,
        OtherCharges = i.OtherCharges,
        Discount = i.Discount,
        TaxPercent = i.TaxPercent,
        TaxAmount = i.TaxAmount,
        SellingPrice = i.SellingPrice,
        CostPrice = i.CostPrice,
        QuantityInStock = i.QuantityInStock,
        Location = i.Location,
        Design = i.Design,
        Style = i.Style,
        Size = i.Size,
        Color = i.Color,
        Occasion = i.Occasion,
        Gender = i.Gender,
        Collection = i.Collection,
        HallmarkNumber = i.HallmarkNumber,
        CertificateNumber = i.CertificateNumber,
        IsBISCertified = i.IsBISCertified,
        IsConsignment = i.IsConsignment,
        Notes = i.Notes,
        ImageUrls = i.ImageUrls,
        PrimaryImageUrl = i.Media?
            .Where(m => m.MediaType == Domain.Enums.MediaType.Image)
            .OrderByDescending(m => m.IsPrimary).ThenBy(m => m.SortOrder)
            .Select(m => m.StoragePath).FirstOrDefault(),
        Media = i.Media?
            .OrderByDescending(m => m.IsPrimary).ThenBy(m => m.SortOrder).ThenBy(m => m.CreatedAt)
            .Select(ItemMediaController.MapToDto).ToList() ?? [],
        IsActive = i.IsActive,
        IsSold = i.IsSold,
        CreatedAt = i.CreatedAt
    };
}
