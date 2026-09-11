using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SeQrJewellery.Application.DTOs.Rbac;
using SeQrJewellery.Application.Interfaces;
using SeQrJewellery.Domain.Entities.Main;
using SeQrJewellery.Domain.Enums;

namespace SeQrJewellery.API.Controllers;

/// <summary>Role & permission management (Phase 8 RBAC)</summary>
[Authorize]
public class RolesController : BaseController
{
    private readonly IMainDbContext _db;
    private readonly ITenantContextAccessor _tenantContext;
    private readonly IPermissionService _permissionService;

    public RolesController(IMainDbContext db, ITenantContextAccessor tenantContext, IPermissionService permissionService)
    {
        _db = db;
        _tenantContext = tenantContext;
        _permissionService = permissionService;
    }

    [HttpGet]
    public async Task<IActionResult> GetAll(CancellationToken ct)
    {
        await _permissionService.EnsureDefaultRolesAsync(_tenantContext.TenantId, ct);

        var tenantId = _tenantContext.TenantId;
        var roles = await _db.Roles.Include(r => r.Permissions)
            .Where(r => r.TenantId == tenantId)
            .AsNoTracking()
            .ToListAsync(ct);

        var userCounts = await _db.UserRoleAssignments
            .Where(a => roles.Select(r => r.Id).Contains(a.RoleId))
            .GroupBy(a => a.RoleId)
            .Select(g => new { RoleId = g.Key, Count = g.Count() })
            .ToListAsync(ct);

        return OkResult(roles.Select(r => MapToDto(r, userCounts.FirstOrDefault(u => u.RoleId == r.Id)?.Count ?? 0))
            .OrderBy(r => r.IsSystemRole ? 0 : 1).ThenBy(r => r.Name));
    }

    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetById(Guid id, CancellationToken ct)
    {
        var tenantId = _tenantContext.TenantId;
        var role = await _db.Roles.Include(r => r.Permissions).AsNoTracking()
            .FirstOrDefaultAsync(r => r.Id == id && r.TenantId == tenantId, ct);
        return role is null ? NotFoundResult($"Role {id} not found.") : OkResult(MapToDto(role, 0));
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateRoleRequest request, CancellationToken ct)
    {
        var tenantId = _tenantContext.TenantId;
        if (await _db.Roles.AnyAsync(r => r.TenantId == tenantId && r.Name == request.Name, ct))
            return BadRequestResult($"A role named '{request.Name}' already exists.");

        var role = new Role { TenantId = tenantId, Name = request.Name, Description = request.Description, IsSystemRole = false };
        foreach (var p in request.Permissions)
            role.Permissions.Add(new RolePermission { Module = p.Module, Actions = p.Actions });

        await _db.Roles.AddAsync(role, ct);
        await _db.SaveChangesAsync(ct);
        return CreatedResult(MapToDto(role, 0), "Role created.");
    }

    [HttpPut("{id:guid}")]
    public async Task<IActionResult> Update(Guid id, [FromBody] UpdateRoleRequest request, CancellationToken ct)
    {
        var tenantId = _tenantContext.TenantId;
        var role = await _db.Roles.Include(r => r.Permissions).FirstOrDefaultAsync(r => r.Id == id && r.TenantId == tenantId, ct);
        if (role is null) return NotFoundResult($"Role {id} not found.");

        if (request.Name != null) role.Name = request.Name;
        if (request.Description != null) role.Description = request.Description;

        if (request.Permissions != null)
        {
            foreach (var existing in role.Permissions.ToList())
                _db.RolePermissions.Remove(existing);
            foreach (var p in request.Permissions)
                role.Permissions.Add(new RolePermission { Module = p.Module, Actions = p.Actions });
        }

        await _db.SaveChangesAsync(ct);
        return OkResult(MapToDto(role, 0));
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id, CancellationToken ct)
    {
        var tenantId = _tenantContext.TenantId;
        var role = await _db.Roles.FirstOrDefaultAsync(r => r.Id == id && r.TenantId == tenantId, ct);
        if (role is null) return NotFoundResult($"Role {id} not found.");
        if (role.IsSystemRole) return BadRequestResult("System roles cannot be deleted.");

        role.IsDeleted = true;
        role.DeletedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync(ct);
        return OkResult(true, "Role deleted.");
    }

    /// <summary>All available modules and actions, for building the permission matrix UI</summary>
    [HttpGet("modules")]
    public IActionResult GetModules()
    {
        return OkResult(new
        {
            modules = Enum.GetValues<AppModule>().Select(m => new { value = (int)m, name = m.ToString() }),
            actions = Enum.GetValues<PermissionAction>().Where(a => a != PermissionAction.All).Select(a => new { value = (int)a, name = a.ToString() }),
        });
    }

    private static RoleDto MapToDto(Role r, int userCount) => new()
    {
        Id = r.Id,
        Name = r.Name,
        Description = r.Description,
        IsSystemRole = r.IsSystemRole,
        UserCount = userCount,
        Permissions = r.Permissions.Select(p => new RolePermissionDto { Module = p.Module, Actions = p.Actions }).ToList(),
    };
}
