using System.Net.Http;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using SeQrJewellery.Application.Interfaces;
using SeQrJewellery.Domain.Entities.Tenant;

namespace SeQrJewellery.Infrastructure.Services;

/// <summary>
/// Calls the Google Business Profile API (reviews) and Meta Instagram Graph API (media publishing)
/// when the tenant has configured credentials on the connected <see cref="SocialAccount"/>.
/// </summary>
public class SocialMediaService : ISocialMediaService
{
    private readonly IHttpClientFactory _httpClientFactory;

    public SocialMediaService(IHttpClientFactory httpClientFactory)
    {
        _httpClientFactory = httpClientFactory;
    }

    public async Task<IReadOnlyList<GoogleReviewDto>> GetGoogleReviewsAsync(SocialAccount account, CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(account.AccessToken) || string.IsNullOrWhiteSpace(account.AccountExternalId))
            throw new InvalidOperationException("Google Business Profile is not connected. Add credentials in Settings > Social first.");

        var client = _httpClientFactory.CreateClient("Google");
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", account.AccessToken);

        // Google Business Profile API: accounts/{accountId}/locations/{locationId}/reviews
        var url = $"https://mybusiness.googleapis.com/v4/{account.AccountExternalId}/reviews";
        var response = await client.GetAsync(url, ct);
        var body = await response.Content.ReadAsStringAsync(ct);
        if (!response.IsSuccessStatusCode)
            throw new InvalidOperationException($"Google reviews request failed ({(int)response.StatusCode}): {body}");

        var results = new List<GoogleReviewDto>();
        using var doc = JsonDocument.Parse(body);
        if (doc.RootElement.TryGetProperty("reviews", out var reviews))
        {
            foreach (var r in reviews.EnumerateArray())
            {
                var starRatingStr = r.TryGetProperty("starRating", out var sr) ? sr.GetString() : null;
                int? stars = starRatingStr switch
                {
                    "ONE" => 1, "TWO" => 2, "THREE" => 3, "FOUR" => 4, "FIVE" => 5, _ => null
                };
                results.Add(new GoogleReviewDto(
                    ReviewId: r.TryGetProperty("reviewId", out var id) ? id.GetString() ?? "" : "",
                    ReviewerName: r.TryGetProperty("reviewer", out var rev) && rev.TryGetProperty("displayName", out var dn) ? dn.GetString() ?? "Anonymous" : "Anonymous",
                    StarRating: stars,
                    Comment: r.TryGetProperty("comment", out var comment) ? comment.GetString() ?? "" : "",
                    ReplyComment: r.TryGetProperty("reviewReply", out var reply) && reply.TryGetProperty("comment", out var rc) ? rc.GetString() : null,
                    CreateTime: r.TryGetProperty("createTime", out var ct2) && DateTime.TryParse(ct2.GetString(), out var dt) ? dt : DateTime.UtcNow
                ));
            }
        }
        return results;
    }

    public async Task ReplyToGoogleReviewAsync(SocialAccount account, string reviewId, string replyText, CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(account.AccessToken) || string.IsNullOrWhiteSpace(account.AccountExternalId))
            throw new InvalidOperationException("Google Business Profile is not connected.");

        var client = _httpClientFactory.CreateClient("Google");
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", account.AccessToken);

        var url = $"https://mybusiness.googleapis.com/v4/{account.AccountExternalId}/reviews/{reviewId}/reply";
        var response = await client.PutAsJsonAsync(url, new { comment = replyText }, ct);
        var body = await response.Content.ReadAsStringAsync(ct);
        if (!response.IsSuccessStatusCode)
            throw new InvalidOperationException($"Google review reply failed ({(int)response.StatusCode}): {body}");
    }

    public async Task<string> PublishInstagramMediaAsync(SocialAccount account, string imageUrl, string caption, CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(account.AccessToken) || string.IsNullOrWhiteSpace(account.AccountExternalId))
            throw new InvalidOperationException("Instagram is not connected. Add credentials in Settings > Social first.");

        var client = _httpClientFactory.CreateClient("Meta");
        const string graphBase = "https://graph.facebook.com/v19.0";

        // Step 1: create media container
        var createUrl = $"{graphBase}/{account.AccountExternalId}/media";
        var createResponse = await client.PostAsync(createUrl, new FormUrlEncodedContent(new Dictionary<string, string>
        {
            ["image_url"] = imageUrl,
            ["caption"] = caption,
            ["access_token"] = account.AccessToken!,
        }), ct);
        var createBody = await createResponse.Content.ReadAsStringAsync(ct);
        if (!createResponse.IsSuccessStatusCode)
            throw new InvalidOperationException($"Instagram media container creation failed: {createBody}");

        using var createDoc = JsonDocument.Parse(createBody);
        var containerId = createDoc.RootElement.GetProperty("id").GetString()
            ?? throw new InvalidOperationException("Instagram did not return a media container id.");

        // Step 2: publish the container
        var publishUrl = $"{graphBase}/{account.AccountExternalId}/media_publish";
        var publishResponse = await client.PostAsync(publishUrl, new FormUrlEncodedContent(new Dictionary<string, string>
        {
            ["creation_id"] = containerId,
            ["access_token"] = account.AccessToken!,
        }), ct);
        var publishBody = await publishResponse.Content.ReadAsStringAsync(ct);
        if (!publishResponse.IsSuccessStatusCode)
            throw new InvalidOperationException($"Instagram media publish failed: {publishBody}");

        using var publishDoc = JsonDocument.Parse(publishBody);
        return publishDoc.RootElement.GetProperty("id").GetString() ?? containerId;
    }
}
