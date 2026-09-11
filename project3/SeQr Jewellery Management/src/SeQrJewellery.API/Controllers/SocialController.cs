using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SeQrJewellery.Application.DTOs.Social;
using SeQrJewellery.Application.Interfaces;
using SeQrJewellery.Domain.Entities.Tenant;
using SeQrJewellery.Domain.Enums;
using SeQrJewellery.Infrastructure.Data;

namespace SeQrJewellery.API.Controllers;

/// <summary>Social media: Google Business Profile reviews and Instagram publishing (Phase 9)</summary>
[Authorize]
public class SocialController : BaseController
{
    private readonly TenantDbContextAccessor _contextAccessor;
    private readonly ISocialMediaService _socialMedia;

    public SocialController(TenantDbContextAccessor contextAccessor, ISocialMediaService socialMedia)
    {
        _contextAccessor = contextAccessor;
        _socialMedia = socialMedia;
    }

    /// <summary>List Google Business Profile reviews. Returns 400 with a clear message when not configured.</summary>
    [HttpGet("google/reviews")]
    public async Task<IActionResult> GetGoogleReviews(CancellationToken ct)
    {
        var db = await _contextAccessor.GetContextAsync(ct);
        var account = await db.SocialAccounts.AsNoTracking().FirstOrDefaultAsync(a => a.Platform == SocialPlatform.Google, ct);
        if (account is null || !account.IsConnected)
            return BadRequestResult("Google Business Profile is not connected. Configure credentials in Settings > Social.");

        try
        {
            var reviews = await _socialMedia.GetGoogleReviewsAsync(account, ct);
            return OkResult(reviews.Select(r => new SocialReviewDto
            {
                ReviewId = r.ReviewId, ReviewerName = r.ReviewerName, StarRating = r.StarRating,
                Comment = r.Comment, ReplyComment = r.ReplyComment, CreateTime = r.CreateTime
            }));
        }
        catch (Exception ex)
        {
            return ErrorResult(ex.Message);
        }
    }

    /// <summary>Reply to a Google Business Profile review.</summary>
    [HttpPost("google/reviews/reply")]
    public async Task<IActionResult> ReplyToGoogleReview([FromBody] ReplyToReviewRequest request, CancellationToken ct)
    {
        var db = await _contextAccessor.GetContextAsync(ct);
        var account = await db.SocialAccounts.AsNoTracking().FirstOrDefaultAsync(a => a.Platform == SocialPlatform.Google, ct);
        if (account is null || !account.IsConnected)
            return BadRequestResult("Google Business Profile is not connected. Configure credentials in Settings > Social.");

        try
        {
            await _socialMedia.ReplyToGoogleReviewAsync(account, request.ReviewId, request.ReplyText, ct);
            return OkResult(true, "Reply posted.");
        }
        catch (Exception ex)
        {
            return ErrorResult(ex.Message);
        }
    }

    /// <summary>List past Instagram posts created from inventory items.</summary>
    [HttpGet("instagram/posts")]
    public async Task<IActionResult> GetInstagramPosts(CancellationToken ct)
    {
        var db = await _contextAccessor.GetContextAsync(ct);
        var posts = await db.SocialPosts.Include(p => p.JewelleryItem)
            .Where(p => p.Platform == SocialPlatform.Instagram)
            .OrderByDescending(p => p.CreatedAt)
            .AsNoTracking()
            .Take(100)
            .ToListAsync(ct);

        return OkResult(posts.Select(MapToDto));
    }

    /// <summary>Create + publish an Instagram post, optionally from an inventory item's primary image.</summary>
    [HttpPost("instagram/posts")]
    public async Task<IActionResult> CreateInstagramPost([FromBody] CreateInstagramPostRequest request, CancellationToken ct)
    {
        var db = await _contextAccessor.GetContextAsync(ct);
        var account = await db.SocialAccounts.AsNoTracking().FirstOrDefaultAsync(a => a.Platform == SocialPlatform.Instagram, ct);

        var post = new SocialPost
        {
            Platform = SocialPlatform.Instagram,
            JewelleryItemId = request.JewelleryItemId,
            Caption = request.Caption,
            ImageUrl = request.ImageUrl,
            Status = SocialPostStatus.Draft,
        };

        if (account is null || !account.IsConnected)
        {
            post.Status = SocialPostStatus.Failed;
            post.ErrorMessage = "Instagram is not connected. Configure credentials in Settings > Social.";
            await db.SocialPosts.AddAsync(post, ct);
            await db.SaveChangesAsync(ct);
            return BadRequestResult(post.ErrorMessage);
        }

        try
        {
            var externalId = await _socialMedia.PublishInstagramMediaAsync(account, request.ImageUrl, request.Caption, ct);
            post.Status = SocialPostStatus.Published;
            post.ExternalPostId = externalId;
            post.PublishedAt = DateTime.UtcNow;
            await db.SocialPosts.AddAsync(post, ct);
            await db.SaveChangesAsync(ct);
            return CreatedResult(MapToDto(post), "Published to Instagram.");
        }
        catch (Exception ex)
        {
            post.Status = SocialPostStatus.Failed;
            post.ErrorMessage = ex.Message;
            await db.SocialPosts.AddAsync(post, ct);
            await db.SaveChangesAsync(ct);
            return ErrorResult($"Failed to publish to Instagram: {ex.Message}");
        }
    }

    private static SocialPostDto MapToDto(SocialPost p) => new()
    {
        Id = p.Id, Platform = p.Platform, JewelleryItemId = p.JewelleryItemId, Caption = p.Caption,
        ImageUrl = p.ImageUrl, Status = p.Status, ExternalPostId = p.ExternalPostId,
        ErrorMessage = p.ErrorMessage, PublishedAt = p.PublishedAt, CreatedAt = p.CreatedAt,
    };
}
