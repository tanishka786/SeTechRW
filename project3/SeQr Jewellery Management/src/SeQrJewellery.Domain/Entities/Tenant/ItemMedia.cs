using SeQrJewellery.Domain.Common;
using SeQrJewellery.Domain.Enums;

namespace SeQrJewellery.Domain.Entities.Tenant;

/// <summary>Image or video attached to a jewellery item, stored on disk and served as a static file.</summary>
public class ItemMedia : BaseEntity
{
    public Guid JewelleryItemId { get; set; }
    public string FileName { get; set; } = string.Empty;
    public string ContentType { get; set; } = string.Empty;
    public MediaType MediaType { get; set; } = MediaType.Image;
    /// <summary>Relative URL path under the web root, e.g. /uploads/{tenant}/items/{itemId}/{mediaId}.jpg</summary>
    public string StoragePath { get; set; } = string.Empty;
    public long FileSizeBytes { get; set; }
    public int SortOrder { get; set; }
    public bool IsPrimary { get; set; }
    /// <summary>CLIP image embedding (float32 array as bytes) used for search-by-image. Null for videos.</summary>
    public byte[]? Embedding { get; set; }

    public JewelleryItem JewelleryItem { get; set; } = null!;
}
