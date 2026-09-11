using SeQrJewellery.Domain.Common;
using SeQrJewellery.Domain.Enums;

namespace SeQrJewellery.Domain.Entities.Tenant;

/// <summary>OAuth credentials/tokens for a connected social platform (Google Business Profile, Meta/Instagram).</summary>
public class SocialAccount : BaseEntity
{
    public SocialPlatform Platform { get; set; }
    public string? AccountName { get; set; }
    public string? AccountExternalId { get; set; } // Google location id / Instagram business account id
    public string? AccessToken { get; set; }
    public string? RefreshToken { get; set; }
    public DateTime? TokenExpiresAt { get; set; }
    public string? ClientId { get; set; }
    public string? ClientSecret { get; set; }
    public bool IsConnected { get; set; } = false;
    public string? Notes { get; set; }
}

/// <summary>A social post (e.g. Instagram media) created from an inventory item.</summary>
public class SocialPost : BaseEntity
{
    public SocialPlatform Platform { get; set; }
    public Guid? JewelleryItemId { get; set; }
    public string Caption { get; set; } = string.Empty;
    public string? ImageUrl { get; set; }
    public SocialPostStatus Status { get; set; } = SocialPostStatus.Draft;
    public string? ExternalPostId { get; set; }
    public string? ErrorMessage { get; set; }
    public DateTime? PublishedAt { get; set; }

    public JewelleryItem? JewelleryItem { get; set; }
}
