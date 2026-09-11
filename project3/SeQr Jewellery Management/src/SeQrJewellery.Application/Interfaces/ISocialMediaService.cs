using SeQrJewellery.Domain.Entities.Tenant;

namespace SeQrJewellery.Application.Interfaces;

public record GoogleReviewDto(string ReviewId, string ReviewerName, int? StarRating, string Comment, string? ReplyComment, DateTime CreateTime);

public interface ISocialMediaService
{
    Task<IReadOnlyList<GoogleReviewDto>> GetGoogleReviewsAsync(SocialAccount account, CancellationToken ct = default);
    Task ReplyToGoogleReviewAsync(SocialAccount account, string reviewId, string replyText, CancellationToken ct = default);

    /// <summary>Creates + publishes an Instagram media container from a publicly reachable image URL. Returns the published media id.</summary>
    Task<string> PublishInstagramMediaAsync(SocialAccount account, string imageUrl, string caption, CancellationToken ct = default);
}
