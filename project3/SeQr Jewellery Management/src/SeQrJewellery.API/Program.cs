using System.Text;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Scalar.AspNetCore;
using SeQrJewellery.API.Middleware;
using SeQrJewellery.API.Services;
using SeQrJewellery.Application;
using SeQrJewellery.Application.Interfaces;
using SeQrJewellery.Infrastructure;
using SeQrJewellery.Infrastructure.Data;
using SeQrJewellery.Infrastructure.Data.Seed;

QuestPDF.Settings.License = QuestPDF.Infrastructure.LicenseType.Community;

var builder = WebApplication.CreateBuilder(args);

// ---- Services ----

builder.Services.AddControllers()
    .AddJsonOptions(options =>
    {
        options.JsonSerializerOptions.Converters.Add(new System.Text.Json.Serialization.JsonStringEnumConverter());
        options.JsonSerializerOptions.ReferenceHandler = System.Text.Json.Serialization.ReferenceHandler.IgnoreCycles;
        options.JsonSerializerOptions.DefaultIgnoreCondition = System.Text.Json.Serialization.JsonIgnoreCondition.WhenWritingNull;
    });

builder.Services.AddOpenApi();

// JWT Authentication
var jwtSecret = builder.Configuration["JWT:Secret"] ?? "SeQr-JWT-Super-Secret-Key-2024-Jewellery-Mgmt-System";
var key = Encoding.UTF8.GetBytes(jwtSecret);

builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidateAudience = true,
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,
            ValidIssuer = builder.Configuration["JWT:Issuer"] ?? "SeQrJewelleryManagement",
            ValidAudience = builder.Configuration["JWT:Audience"] ?? "SeQrClients",
            IssuerSigningKey = new SymmetricSecurityKey(key),
            ClockSkew = TimeSpan.Zero
        };
    });

builder.Services.AddAuthorization();

builder.Services.AddHttpContextAccessor();
builder.Services.AddScoped<ITenantContextAccessor, HttpTenantContextAccessor>();
builder.Services.AddSingleton<IMediaFileStorage, MediaFileStorage>();

builder.Services.AddApplication();
builder.Services.AddInfrastructure(builder.Configuration);

builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowAll", policy =>
        policy.AllowAnyOrigin().AllowAnyMethod().AllowAnyHeader());
});

builder.Services.AddResponseCompression();
builder.Services.AddHealthChecks();

var app = builder.Build();

// ---- Middleware Pipeline ----

app.MapOpenApi();
if (app.Environment.IsDevelopment())
{
    app.MapScalarApiReference();
}

if (!app.Environment.IsDevelopment())
{
    app.UseHttpsRedirection();
}
app.UseCors("AllowAll");
app.UseResponseCompression();

// Serve React static files from wwwroot
app.UseDefaultFiles();
app.UseStaticFiles();

// Serve uploaded item media from the configured storage root at /uploads
var mediaStorage = (MediaFileStorage)app.Services.GetRequiredService<IMediaFileStorage>();
app.UseStaticFiles(new StaticFileOptions
{
    FileProvider = new Microsoft.Extensions.FileProviders.PhysicalFileProvider(mediaStorage.Root),
    RequestPath = MediaFileStorage.RequestPath,
});

app.UseTenantResolution();

app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();
app.MapHealthChecks("/health");

// SPA fallback: any non-API route serves index.html (React Router handles it)
app.MapFallbackToFile("index.html");

// ---- Database Initialization ----
using (var scope = app.Services.CreateScope())
{
    var logger = scope.ServiceProvider.GetRequiredService<ILogger<Program>>();

    // 1. Main database: migrate + seed system data & demo tenant record
    try
    {
        var mainDb = scope.ServiceProvider.GetRequiredService<MainDbContext>();
        var config = scope.ServiceProvider.GetRequiredService<IConfiguration>();
        var mainConnStr = config.GetConnectionString("MainDatabase")!;

        logger.LogInformation("Initializing main database...");
        await MainDbSeeder.SeedAsync(mainDb, mainConnStr);
        logger.LogInformation("Main database initialized successfully.");
    }
    catch (Exception ex)
    {
        logger.LogError(ex, "Error initializing main database.");
    }

    // 2. Tenant databases: for every active tenant in [dbo].[Tenants],
    //    rebuild connection strings from MainDatabase + DatabaseName, then migrate + seed.
    try
    {
        var mainDb = scope.ServiceProvider.GetRequiredService<MainDbContext>();
        var factory = scope.ServiceProvider.GetRequiredService<TenantDbContextFactory>();
        var config = scope.ServiceProvider.GetRequiredService<IConfiguration>();
        var mainConnStr = config.GetConnectionString("MainDatabase")
            ?? throw new InvalidOperationException("ConnectionStrings:MainDatabase is missing.");

        var tenants = await mainDb.Tenants
            .Where(t => !t.IsDeleted && t.DatabaseName != null)
            .ToListAsync();

        logger.LogWarning("Provisioning {Count} tenant database(s)...", tenants.Count);

        foreach (var tenant in tenants)
        {
            try
            {
                // Always rebuild from current main connection string so IIS/SQL auth settings stay correct
                var tenantConnStr = MainDbSeeder.BuildTenantConnectionString(mainConnStr, tenant.DatabaseName);
                if (tenant.ConnectionString != tenantConnStr)
                {
                    tenant.ConnectionString = tenantConnStr;
                    await mainDb.SaveChangesAsync();
                }

                logger.LogWarning("  → Provisioning tenant '{Identifier}' ({DbName})...",
                    tenant.Identifier, tenant.DatabaseName);

                using var tenantDb = factory.CreateForTenant(tenantConnStr);
                await TenantDbSeeder.SeedAsync(tenantDb);

                logger.LogWarning("  ✓ Tenant '{Identifier}' provisioned successfully.", tenant.Identifier);
            }
            catch (Exception ex)
            {
                // Log full exception — common cause on IIS: app pool has no rights on a manually-created DB
                logger.LogError(ex,
                    "  ✗ Failed to provision tenant '{Identifier}' DB '{DbName}'. " +
                    "If you created the DB manually, grant db_owner to the IIS app pool identity " +
                    "(e.g. [IIS AppPool\\SeQrJewellery]) or delete the empty DB and let the app recreate it.",
                    tenant.Identifier, tenant.DatabaseName);
            }
        }

        logger.LogWarning("Tenant database provisioning finished.");
    }
    catch (Exception ex)
    {
        logger.LogError(ex, "Error during tenant database provisioning.");
    }
}

app.Run();
