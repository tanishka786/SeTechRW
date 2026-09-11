using SeQrJewellery.Domain.Enums;

namespace SeQrJewellery.Application.DTOs.Social;

public class SocialReviewDto
{
    public string ReviewId { get; set; } = string.Empty;
    public string ReviewerName { get; set; } = string.Empty;
    public int? StarRating { get; set; }
    public string Comment { get; set; } = string.Empty;
    public string? ReplyComment { get; set; }
    public DateTime CreateTime { get; set; }
}

public class ReplyToReviewRequest
{
    public string ReviewId { get; set; } = string.Empty;
    public string ReplyText { get; set; } = string.Empty;
}

public class CreateInstagramPostRequest
{
    public Guid? JewelleryItemId { get; set; }
    public string ImageUrl { get; set; } = string.Empty;
    public string Caption { get; set; } = string.Empty;
}

public class SocialPostDto
{
    public Guid Id { get; set; }
    public SocialPlatform Platform { get; set; }
    public Guid? JewelleryItemId { get; set; }
    public string Caption { get; set; } = string.Empty;
    public string? ImageUrl { get; set; }
    public SocialPostStatus Status { get; set; }
    public string? ExternalPostId { get; set; }
    public string? ErrorMessage { get; set; }
    public DateTime? PublishedAt { get; set; }
    public DateTime CreatedAt { get; set; }
}
