using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SeQrJewellery.Application.DTOs.Rbac;
using SeQrJewellery.Application.Interfaces;
using SeQrJewellery.Domain.Entities.Main;
using SeQrJewellery.Infrastructure.Data.Seed;

namespace SeQrJewellery.API.Controllers;

internal record RoleAssignmentInfo(Guid TenantUserId, Guid RoleId, string RoleName);

/// <summary>Tenant user management (Phase 8 RBAC)</summary>
[Authorize]
public class UsersController : BaseController
{
    private readonly IMainDbContext _db;
    private readonly ITenantContextAccessor _tenantContext;

    public UsersController(IMainDbContext db, ITenantContextAccessor tenantContext)
    {
        _db = db;
        _tenantContext = tenantContext;
    }

    [HttpGet]
    public async Task<IActionResult> GetAll(CancellationToken ct)
    {
        var tenantId = _tenantContext.TenantId;
        var users = await _db.TenantUsers.Where(u => u.TenantId == tenantId).AsNoTracking().ToListAsync(ct);
        var userIds = users.Select(u => u.Id).ToList();

        var assignments = await _db.UserRoleAssignments
            .Where(a => userIds.Contains(a.TenantUserId))
            .Join(_db.Roles, a => a.RoleId, r => r.Id, (a, r) => new RoleAssignmentInfo(a.TenantUserId, r.Id, r.Name))
            .ToListAsync(ct);

        return OkResult(users.OrderByDescending(u => u.CreatedAt).Select(u => MapToDto(u, assignments.Where(a => a.TenantUserId == u.Id))));
    }

    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetById(Guid id, CancellationToken ct)
    {
        var tenantId = _tenantContext.TenantId;
        var user = await _db.TenantUsers.AsNoTracking().FirstOrDefaultAsync(u => u.Id == id && u.TenantId == tenantId, ct);
        if (user is null) return NotFoundResult($"User {id} not found.");

        var assignments = await _db.UserRoleAssignments.Where(a => a.TenantUserId == id)
            .Join(_db.Roles, a => a.RoleId, r => r.Id, (a, r) => new RoleAssignmentInfo(a.TenantUserId, r.Id, r.Name))
            .ToListAsync(ct);
        return OkResult(MapToDto(user, assignments));
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateTenantUserRequest request, CancellationToken ct)
    {
        var tenantId = _tenantContext.TenantId;
        if (await _db.TenantUsers.AnyAsync(u => u.TenantId == tenantId && (u.Username == request.Username || u.Email == request.Email), ct))
            return BadRequestResult("A user with this username or email already exists.");

        var user = new TenantUser
        {
            TenantId = tenantId,
            Username = request.Username,
            Email = request.Email,
            PasswordHash = BCrypt.HashPassword(request.Password),
            FirstName = request.FirstName,
            LastName = request.LastName,
            Phone = request.Phone,
            Role = request.Role,
        };
        await _db.TenantUsers.AddAsync(user, ct);
        await _db.SaveChangesAsync(ct);

        if (request.RoleIds?.Count > 0)
        {
            foreach (var roleId in request.RoleIds.Distinct())
                await _db.UserRoleAssignments.AddAsync(new UserRoleAssignment { TenantUserId = user.Id, RoleId = roleId }, ct);
            await _db.SaveChangesAsync(ct);
        }

        return CreatedResult(MapToDto(user, []), "User created.");
    }

    [HttpPut("{id:guid}")]
    public async Task<IActionResult> Update(Guid id, [FromBody] UpdateTenantUserRequest request, CancellationToken ct)
    {
        var tenantId = _tenantContext.TenantId;
        var user = await _db.TenantUsers.FirstOrDefaultAsync(u => u.Id == id && u.TenantId == tenantId, ct);
        if (user is null) return NotFoundResult($"User {id} not found.");

        if (request.Email != null) user.Email = request.Email;
        if (request.FirstName != null) user.FirstName = request.FirstName;
        if (request.LastName != null) user.LastName = request.LastName;
        if (request.Phone != null) user.Phone = request.Phone;
        if (request.Role.HasValue) user.Role = request.Role.Value;
        if (request.IsActive.HasValue) user.IsActive = request.IsActive.Value;

        if (request.RoleIds != null)
        {
            var existing = await _db.UserRoleAssignments.Where(a => a.TenantUserId == id).ToListAsync(ct);
            foreach (var e in existing) _db.UserRoleAssignments.Remove(e);
            foreach (var roleId in request.RoleIds.Distinct())
                await _db.UserRoleAssignments.AddAsync(new UserRoleAssignment { TenantUserId = id, RoleId = roleId }, ct);
        }

        await _db.SaveChangesAsync(ct);

        var assignments = await _db.UserRoleAssignments.Where(a => a.TenantUserId == id)
            .Join(_db.Roles, a => a.RoleId, r => r.Id, (a, r) => new RoleAssignmentInfo(a.TenantUserId, r.Id, r.Name))
            .ToListAsync(ct);
        return OkResult(MapToDto(user, assignments));
    }

    [HttpPost("{id:guid}/reset-password")]
    public async Task<IActionResult> ResetPassword(Guid id, [FromBody] ResetPasswordRequest request, CancellationToken ct)
    {
        var tenantId = _tenantContext.TenantId;
        var user = await _db.TenantUsers.FirstOrDefaultAsync(u => u.Id == id && u.TenantId == tenantId, ct);
        if (user is null) return NotFoundResult($"User {id} not found.");

        user.PasswordHash = BCrypt.HashPassword(request.NewPassword);
        user.MustChangePassword = true;
        await _db.SaveChangesAsync(ct);
        return OkResult(true, "Password reset.");
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id, CancellationToken ct)
    {
        var tenantId = _tenantContext.TenantId;
        var user = await _db.TenantUsers.FirstOrDefaultAsync(u => u.Id == id && u.TenantId == tenantId, ct);
        if (user is null) return NotFoundResult($"User {id} not found.");
        if (user.Id.ToString() == _tenantContext.UserId) return BadRequestResult("You cannot delete your own account.");

        user.IsDeleted = true;
        user.DeletedAt = DateTime.UtcNow;
        user.IsActive = false;
        await _db.SaveChangesAsync(ct);
        return OkResult(true, "User deactivated.");
    }

    private static TenantUserDto MapToDto(TenantUser u, IEnumerable<RoleAssignmentInfo> assignments)
    {
        var roleNames = new List<string>();
        var roleIds = new List<Guid>();
        foreach (var a in assignments)
        {
            roleNames.Add(a.RoleName);
            roleIds.Add(a.RoleId);
        }

        return new TenantUserDto
        {
            Id = u.Id, Username = u.Username, Email = u.Email, FirstName = u.FirstName, LastName = u.LastName,
            Phone = u.Phone, Role = u.Role, IsActive = u.IsActive, LastLoginAt = u.LastLoginAt,
            RoleNames = roleNames, RoleIds = roleIds, CreatedAt = u.CreatedAt,
        };
    }
}
