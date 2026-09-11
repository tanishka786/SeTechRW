using SeQrJewellery.Application.Interfaces;

namespace SeQrJewellery.Infrastructure.Data;

public class TenantDbContextAccessor
{
    private readonly TenantDbContextFactory _factory;
    private readonly ITenantContextAccessor _tenantContextAccessor;
    private readonly IMainDbContext _mainDbContext;
    private TenantDbContext? _tenantDbContext;

    public TenantDbContextAccessor(
        TenantDbContextFactory factory,
        ITenantContextAccessor tenantContextAccessor,
        IMainDbContext mainDbContext)
    {
        _factory = factory;
        _tenantContextAccessor = tenantContextAccessor;
        _mainDbContext = mainDbContext;
    }

    public async Task<TenantDbContext> GetContextAsync(CancellationToken ct = default)
    {
        if (_tenantDbContext != null) return _tenantDbContext;

        var tenantId = _tenantContextAccessor.TenantId;
        var tenant = await _mainDbContext.Tenants
            .FindAsync([tenantId], cancellationToken: ct)
            ?? throw new InvalidOperationException($"Tenant {tenantId} not found.");

        _tenantDbContext = _factory.CreateForTenant(tenant.ConnectionString);
        return _tenantDbContext;
    }
}
