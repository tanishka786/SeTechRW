using Microsoft.EntityFrameworkCore;
using SeQrJewellery.Application.DTOs.Tenant;
using SeQrJewellery.Application.Interfaces;
using SeQrJewellery.Domain.Entities.Main;
using SeQrJewellery.Domain.Enums;
using SeQrJewellery.Infrastructure.Data;
using SeQrJewellery.Infrastructure.Data.Seed;

namespace SeQrJewellery.Infrastructure.Services;

public class TenantService : ITenantService
{
    private readonly IMainDbContext _context;
    private readonly TenantDbContextFactory _tenantDbFactory;
    private readonly string _masterConnectionString;

    public TenantService(IMainDbContext context, TenantDbContextFactory tenantDbFactory, string masterConnectionString)
    {
        _context = context;
        _tenantDbFactory = tenantDbFactory;
        _masterConnectionString = masterConnectionString;
    }

    public async Task<TenantDto?> GetTenantByIdAsync(Guid id, CancellationToken ct = default)
    {
        var tenant = await _context.Tenants.AsNoTracking().FirstOrDefaultAsync(t => t.Id == id, ct);
        return tenant is null ? null : MapToDto(tenant);
    }

    public async Task<TenantDto?> GetTenantByIdentifierAsync(string identifier, CancellationToken ct = default)
    {
        var tenant = await _context.Tenants.AsNoTracking()
            .FirstOrDefaultAsync(t => t.Identifier == identifier.ToLower(), ct);
        return tenant is null ? null : MapToDto(tenant);
    }

    public async Task<IEnumerable<TenantDto>> GetAllTenantsAsync(CancellationToken ct = default)
    {
        var tenants = await _context.Tenants.AsNoTracking().ToListAsync(ct);
        return tenants.Select(MapToDto);
    }

    public async Task<TenantDto> CreateTenantAsync(CreateTenantRequest request, CancellationToken ct = default)
    {
        var identifier = request.Identifier.ToLower().Replace(" ", "-");
        if (await _context.Tenants.AnyAsync(t => t.Identifier == identifier, ct))
            throw new InvalidOperationException($"Tenant identifier '{identifier}' already exists.");

        var dbName = $"SeQrJewellery_{identifier.Replace("-", "_")}";
        var connStr = BuildTenantConnectionString(dbName);

        var tenant = new Tenant
        {
            Name = request.Name,
            Identifier = identifier,
            DatabaseName = dbName,
            ConnectionString = connStr,
            BusinessName = request.BusinessName,
            BusinessRegistrationNumber = request.BusinessRegistrationNumber,
            TaxNumber = request.TaxNumber,
            GSTNumber = request.GSTNumber,
            Address = request.Address,
            City = request.City,
            State = request.State,
            Country = request.Country ?? "India",
            Phone = request.Phone,
            Email = request.Email,
            Status = TenantStatus.Trial,
            Plan = request.Plan,
            TimeZone = request.TimeZone,
            Currency = request.Currency,
            TrialEndsAt = DateTime.UtcNow.AddDays(30),
            MaxUsers = 5,
            MaxLocations = 1
        };

        var adminUser = new TenantUser
        {
            TenantId = tenant.Id,
            Username = request.AdminEmail.Split('@')[0],
            Email = request.AdminEmail,
            PasswordHash = Infrastructure.Data.Seed.BCrypt.HashPassword(request.AdminPassword),
            FirstName = request.AdminFirstName,
            LastName = request.AdminLastName,
            Role = UserRole.TenantAdmin,
            IsEmailVerified = true,
            IsActive = true,
            MustChangePassword = true
        };

        await _context.Tenants.AddAsync(tenant, ct);
        await _context.TenantUsers.AddAsync(adminUser, ct);
        await _context.SaveChangesAsync(ct);

        await ProvisionTenantDatabaseAsync(tenant.Id, ct);

        return MapToDto(tenant);
    }

    public async Task<TenantDto> UpdateTenantAsync(Guid id, UpdateTenantRequest request, CancellationToken ct = default)
    {
        var tenant = await _context.Tenants.FindAsync([id], cancellationToken: ct)
            ?? throw new KeyNotFoundException($"Tenant {id} not found.");

        if (request.Name != null) tenant.Name = request.Name;
        if (request.BusinessName != null) tenant.BusinessName = request.BusinessName;
        if (request.BusinessRegistrationNumber != null) tenant.BusinessRegistrationNumber = request.BusinessRegistrationNumber;
        if (request.TaxNumber != null) tenant.TaxNumber = request.TaxNumber;
        if (request.GSTNumber != null) tenant.GSTNumber = request.GSTNumber;
        if (request.Logo != null) tenant.Logo = request.Logo;
        if (request.Address != null) tenant.Address = request.Address;
        if (request.City != null) tenant.City = request.City;
        if (request.State != null) tenant.State = request.State;
        if (request.Country != null) tenant.Country = request.Country;
        if (request.Phone != null) tenant.Phone = request.Phone;
        if (request.Email != null) tenant.Email = request.Email;
        if (request.Website != null) tenant.Website = request.Website;
        if (request.Status.HasValue) tenant.Status = request.Status.Value;
        if (request.Plan.HasValue) tenant.Plan = request.Plan.Value;

        await _context.SaveChangesAsync(ct);
        return MapToDto(tenant);
    }

    public async Task<bool> DeleteTenantAsync(Guid id, CancellationToken ct = default)
    {
        var tenant = await _context.Tenants.FindAsync([id], cancellationToken: ct);
        if (tenant is null) return false;

        tenant.IsDeleted = true;
        tenant.Status = TenantStatus.Cancelled;
        await _context.SaveChangesAsync(ct);
        return true;
    }

    public async Task<string> GetConnectionStringAsync(Guid tenantId, CancellationToken ct = default)
    {
        var tenant = await _context.Tenants.AsNoTracking()
            .FirstOrDefaultAsync(t => t.Id == tenantId, ct)
            ?? throw new KeyNotFoundException($"Tenant {tenantId} not found.");
        return tenant.ConnectionString;
    }

    public async Task<bool> ProvisionTenantDatabaseAsync(Guid tenantId, CancellationToken ct = default)
    {
        var connStr = await GetConnectionStringAsync(tenantId, ct);
        using var tenantDb = _tenantDbFactory.CreateForTenant(connStr);
        await TenantDbSeeder.SeedAsync(tenantDb);
        return true;
    }

    private string BuildTenantConnectionString(string dbName)
    {
        var builder = new Microsoft.Data.SqlClient.SqlConnectionStringBuilder(_masterConnectionString)
        {
            InitialCatalog = dbName
        };
        return builder.ConnectionString;
    }

    private static TenantDto MapToDto(Tenant t) => new()
    {
        Id = t.Id,
        Name = t.Name,
        Identifier = t.Identifier,
        BusinessName = t.BusinessName,
        Logo = t.Logo,
        Email = t.Email,
        Phone = t.Phone,
        Address = t.Address,
        City = t.City,
        Country = t.Country,
        Status = t.Status,
        Plan = t.Plan,
        TimeZone = t.TimeZone,
        Currency = t.Currency,
        CurrencySymbol = t.CurrencySymbol,
        SubscriptionEndDate = t.SubscriptionEndDate,
        CreatedAt = t.CreatedAt
    };
}
