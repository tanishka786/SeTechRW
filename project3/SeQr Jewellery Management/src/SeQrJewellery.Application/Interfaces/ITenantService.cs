using SeQrJewellery.Application.DTOs.Tenant;

namespace SeQrJewellery.Application.Interfaces;

public interface ITenantService
{
    Task<TenantDto?> GetTenantByIdAsync(Guid id, CancellationToken ct = default);
    Task<TenantDto?> GetTenantByIdentifierAsync(string identifier, CancellationToken ct = default);
    Task<IEnumerable<TenantDto>> GetAllTenantsAsync(CancellationToken ct = default);
    Task<TenantDto> CreateTenantAsync(CreateTenantRequest request, CancellationToken ct = default);
    Task<TenantDto> UpdateTenantAsync(Guid id, UpdateTenantRequest request, CancellationToken ct = default);
    Task<bool> DeleteTenantAsync(Guid id, CancellationToken ct = default);
    Task<string> GetConnectionStringAsync(Guid tenantId, CancellationToken ct = default);
    Task<bool> ProvisionTenantDatabaseAsync(Guid tenantId, CancellationToken ct = default);
}
