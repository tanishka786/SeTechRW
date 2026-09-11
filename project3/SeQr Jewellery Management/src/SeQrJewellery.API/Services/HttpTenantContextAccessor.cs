using System.Security.Claims;
using SeQrJewellery.Application.Interfaces;

namespace SeQrJewellery.API.Services;

public class HttpTenantContextAccessor : ITenantContextAccessor
{
    private readonly IHttpContextAccessor _httpContextAccessor;

    public HttpTenantContextAccessor(IHttpContextAccessor httpContextAccessor)
    {
        _httpContextAccessor = httpContextAccessor;
    }

    public Guid TenantId
    {
        get
        {
            var context = _httpContextAccessor.HttpContext;
            if (context?.Items.TryGetValue("TenantId", out var tenantId) == true && tenantId is Guid id)
                return id;

            var claim = context?.User?.FindFirst("TenantId")?.Value;
            if (claim != null && Guid.TryParse(claim, out var claimId))
                return claimId;

            return Guid.Empty;
        }
    }

    public string TenantIdentifier
    {
        get
        {
            var context = _httpContextAccessor.HttpContext;
            if (context?.Items.TryGetValue("TenantIdentifier", out var id) == true && id is string identifier)
                return identifier;
            return context?.User?.FindFirst("TenantIdentifier")?.Value ?? "";
        }
    }

    public string UserId =>
        _httpContextAccessor.HttpContext?.User?.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? "anonymous";

    public string UserName =>
        _httpContextAccessor.HttpContext?.User?.FindFirst(ClaimTypes.Name)?.Value ?? "anonymous";
}
