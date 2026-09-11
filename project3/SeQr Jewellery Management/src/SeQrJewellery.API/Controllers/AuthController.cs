using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using SeQrJewellery.Application.DTOs.Auth;
using SeQrJewellery.Application.Interfaces;
using SeQrJewellery.Infrastructure.Data.Seed;

namespace SeQrJewellery.API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class AuthController : BaseController
{
    private readonly IMainDbContext _mainDb;
    private readonly IConfiguration _configuration;
    private readonly IPermissionService _permissionService;

    public AuthController(IMainDbContext mainDb, IConfiguration configuration, IPermissionService permissionService)
    {
        _mainDb = mainDb;
        _configuration = configuration;
        _permissionService = permissionService;
    }

    /// <summary>Login with username/password. Tenant is resolved from the user account (optional TenantIdentifier still accepted).</summary>
    [HttpPost("login")]
    public async Task<IActionResult> Login([FromBody] LoginRequest request, CancellationToken ct)
    {
        var username = (request.Username ?? string.Empty).Trim();
        if (string.IsNullOrEmpty(username) || string.IsNullOrEmpty(request.Password))
            return BadRequestResult("Username and password are required");

        Domain.Entities.Main.TenantUser? user;
        Domain.Entities.Main.Tenant? tenant;

        if (!string.IsNullOrWhiteSpace(request.TenantIdentifier))
        {
            tenant = await _mainDb.Tenants.AsNoTracking()
                .FirstOrDefaultAsync(t => t.Identifier == request.TenantIdentifier.Trim().ToLower() && !t.IsDeleted, ct);

            if (tenant is null)
                return BadRequestResult("Invalid tenant identifier.");

            user = await _mainDb.TenantUsers.AsNoTracking()
                .FirstOrDefaultAsync(u => u.TenantId == tenant.Id &&
                    (u.Username == username || u.Email == username) &&
                    u.IsActive && !u.IsDeleted, ct);

            if (user is null || !BCrypt.Verify(request.Password, user.PasswordHash))
                return Unauthorized(new { message = "Invalid username or password." });
        }
        else
        {
            var candidates = await _mainDb.TenantUsers.AsNoTracking()
                .Include(u => u.Tenant)
                .Where(u => (u.Username == username || u.Email == username) &&
                            u.IsActive && !u.IsDeleted &&
                            u.Tenant != null && !u.Tenant.IsDeleted)
                .ToListAsync(ct);

            var matches = candidates.Where(u => BCrypt.Verify(request.Password, u.PasswordHash)).ToList();
            if (matches.Count == 0)
                return Unauthorized(new { message = "Invalid username or password." });
            if (matches.Count > 1)
                return BadRequestResult("Multiple accounts match these credentials. Contact your administrator.");

            user = matches[0];
            tenant = user.Tenant;
        }

        var token = GenerateJwtToken(user.Id.ToString(), user.Username, user.Email,
            user.Role.ToString(), tenant.Id.ToString(), tenant.Identifier);

        var refreshToken = GenerateRefreshToken();

        // Update refresh token
        var trackedUser = await _mainDb.TenantUsers.FindAsync([user.Id], cancellationToken: ct);
        if (trackedUser != null)
        {
            trackedUser.RefreshToken = refreshToken;
            trackedUser.RefreshTokenExpiry = DateTime.UtcNow.AddDays(30);
            trackedUser.LastLoginAt = DateTime.UtcNow;
            await _mainDb.SaveChangesAsync(ct);
        }

        var expiryMinutes = int.Parse(_configuration["JWT:ExpiryMinutes"] ?? "60");
        await _permissionService.EnsureDefaultRolesAsync(tenant.Id, ct);
        var permissions = await _permissionService.GetPermissionsAsync(user.Id, tenant.Id, user.Role, ct);

        return OkResult(new LoginResponse
        {
            AccessToken = token,
            RefreshToken = refreshToken,
            ExpiresAt = DateTime.UtcNow.AddMinutes(expiryMinutes),
            Permissions = permissions,
            User = new UserProfileDto
            {
                Id = user.Id,
                Username = user.Username,
                Email = user.Email,
                FirstName = user.FirstName,
                LastName = user.LastName,
                Role = user.Role,
                ProfilePicture = user.ProfilePicture
            },
            Tenant = new TenantInfoDto
            {
                Id = tenant.Id,
                Identifier = tenant.Identifier,
                BusinessName = tenant.BusinessName,
                Logo = tenant.Logo,
                Currency = tenant.Currency,
                CurrencySymbol = tenant.CurrencySymbol
            }
        });
    }

    /// <summary>Refresh the access token using a refresh token</summary>
    [HttpPost("refresh")]
    public async Task<IActionResult> RefreshToken([FromBody] RefreshTokenRequest request, CancellationToken ct)
    {
        var tenant = await _mainDb.Tenants.AsNoTracking()
            .FirstOrDefaultAsync(t => t.Identifier == request.TenantIdentifier.ToLower(), ct);
        if (tenant is null) return BadRequestResult("Invalid tenant.");

        var user = await _mainDb.TenantUsers
            .FirstOrDefaultAsync(u => u.TenantId == tenant.Id &&
                u.RefreshToken == request.RefreshToken &&
                u.RefreshTokenExpiry > DateTime.UtcNow, ct);

        if (user is null) return Unauthorized(new { message = "Invalid or expired refresh token." });

        var token = GenerateJwtToken(user.Id.ToString(), user.Username, user.Email,
            user.Role.ToString(), tenant.Id.ToString(), tenant.Identifier);
        var newRefreshToken = GenerateRefreshToken();

        user.RefreshToken = newRefreshToken;
        user.RefreshTokenExpiry = DateTime.UtcNow.AddDays(30);
        await _mainDb.SaveChangesAsync(ct);

        var expiryMinutes = int.Parse(_configuration["JWT:ExpiryMinutes"] ?? "60");
        return OkResult(new { accessToken = token, refreshToken = newRefreshToken, expiresAt = DateTime.UtcNow.AddMinutes(expiryMinutes) });
    }

    private string GenerateJwtToken(string userId, string username, string email,
        string role, string tenantId, string tenantIdentifier)
    {
        var secret = _configuration["JWT:Secret"] ?? "default-secret-key-change-me";
        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(secret));
        var credentials = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

        var claims = new[]
        {
            new Claim(ClaimTypes.NameIdentifier, userId),
            new Claim(ClaimTypes.Name, username),
            new Claim(ClaimTypes.Email, email),
            new Claim(ClaimTypes.Role, role),
            new Claim("TenantId", tenantId),
            new Claim("TenantIdentifier", tenantIdentifier),
            new Claim(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString())
        };

        var expiryMinutes = int.Parse(_configuration["JWT:ExpiryMinutes"] ?? "60");
        var token = new JwtSecurityToken(
            issuer: _configuration["JWT:Issuer"],
            audience: _configuration["JWT:Audience"],
            claims: claims,
            expires: DateTime.UtcNow.AddMinutes(expiryMinutes),
            signingCredentials: credentials);

        return new JwtSecurityTokenHandler().WriteToken(token);
    }

    private static string GenerateRefreshToken()
        => Convert.ToBase64String(System.Security.Cryptography.RandomNumberGenerator.GetBytes(64));
}
