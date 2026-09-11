using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SeQrJewellery.Application.DTOs.Tenant;
using SeQrJewellery.Application.Interfaces;

namespace SeQrJewellery.API.Controllers;

/// <summary>Tenant management - SuperAdmin only</summary>
[Authorize(Roles = "SuperAdmin")]
public class TenantsController : BaseController
{
    private readonly ITenantService _tenantService;

    public TenantsController(ITenantService tenantService)
    {
        _tenantService = tenantService;
    }

    /// <summary>Get all tenants</summary>
    [HttpGet]
    public async Task<IActionResult> GetAll(CancellationToken ct)
    {
        var tenants = await _tenantService.GetAllTenantsAsync(ct);
        return OkResult(tenants);
    }

    /// <summary>Get tenant by ID</summary>
    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetById(Guid id, CancellationToken ct)
    {
        var tenant = await _tenantService.GetTenantByIdAsync(id, ct);
        return tenant is null ? NotFoundResult($"Tenant {id} not found.") : OkResult(tenant);
    }

    /// <summary>Get tenant by identifier</summary>
    [HttpGet("by-identifier/{identifier}")]
    [AllowAnonymous]
    public async Task<IActionResult> GetByIdentifier(string identifier, CancellationToken ct)
    {
        var tenant = await _tenantService.GetTenantByIdentifierAsync(identifier, ct);
        return tenant is null ? NotFoundResult($"Tenant '{identifier}' not found.") : OkResult(tenant);
    }

    /// <summary>Create a new tenant and provision its database</summary>
    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateTenantRequest request, CancellationToken ct)
    {
        try
        {
            var tenant = await _tenantService.CreateTenantAsync(request, ct);
            return CreatedResult(tenant, "Tenant created and database provisioned successfully.");
        }
        catch (InvalidOperationException ex)
        {
            return BadRequestResult(ex.Message);
        }
    }

    /// <summary>Update tenant details</summary>
    [HttpPut("{id:guid}")]
    public async Task<IActionResult> Update(Guid id, [FromBody] UpdateTenantRequest request, CancellationToken ct)
    {
        try
        {
            var tenant = await _tenantService.UpdateTenantAsync(id, request, ct);
            return OkResult(tenant);
        }
        catch (KeyNotFoundException)
        {
            return NotFoundResult($"Tenant {id} not found.");
        }
    }

    /// <summary>Soft-delete a tenant</summary>
    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id, CancellationToken ct)
    {
        var deleted = await _tenantService.DeleteTenantAsync(id, ct);
        return deleted ? OkResult(true, "Tenant deleted.") : NotFoundResult($"Tenant {id} not found.");
    }

    /// <summary>Re-provision tenant database (run migrations and seed)</summary>
    [HttpPost("{id:guid}/provision")]
    public async Task<IActionResult> Provision(Guid id, CancellationToken ct)
    {
        var result = await _tenantService.ProvisionTenantDatabaseAsync(id, ct);
        return OkResult(result, "Database provisioned successfully.");
    }
}
