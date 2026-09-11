using Microsoft.EntityFrameworkCore;
using SeQrJewellery.Application.Interfaces;

namespace SeQrJewellery.API.Middleware;

public class TenantResolutionMiddleware
{
    private readonly RequestDelegate _next;

    public TenantResolutionMiddleware(RequestDelegate next)
    {
        _next = next;
    }

    public async Task InvokeAsync(HttpContext context, IMainDbContext mainDb)
    {
        string? tenantIdentifier = null;

        if (context.Request.Headers.TryGetValue("X-Tenant-Id", out var tenantHeader))
            tenantIdentifier = tenantHeader.ToString();
        else if (context.Request.Headers.TryGetValue("X-Tenant-Identifier", out var tenantIdentifierHeader))
            tenantIdentifier = tenantIdentifierHeader.ToString();
        else
        {
            var host = context.Request.Host.Host;
            var parts = host.Split('.');
            if (parts.Length > 2)
                tenantIdentifier = parts[0];
        }

        if (!string.IsNullOrEmpty(tenantIdentifier))
        {
            var tenant = await mainDb.Tenants
                .Where(t => t.Identifier == tenantIdentifier.ToLower() && !t.IsDeleted && t.IsActive)
                .Select(t => new { t.Id, t.Identifier })
                .FirstOrDefaultAsync();

            if (tenant != null)
            {
                context.Items["TenantId"] = tenant.Id;
                context.Items["TenantIdentifier"] = tenant.Identifier;
            }
        }

        await _next(context);
    }
}

public static class TenantResolutionMiddlewareExtensions
{
    public static IApplicationBuilder UseTenantResolution(this IApplicationBuilder app)
        => app.UseMiddleware<TenantResolutionMiddleware>();
}
