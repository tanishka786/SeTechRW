using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using SeQrJewellery.Application.Interfaces;
using SeQrJewellery.Infrastructure.Data;
using SeQrJewellery.Infrastructure.Services;

namespace SeQrJewellery.Infrastructure;

public static class DependencyInjection
{
    public static IServiceCollection AddInfrastructure(this IServiceCollection services, IConfiguration configuration)
    {
        var mainConnStr = configuration.GetConnectionString("MainDatabase")
            ?? throw new InvalidOperationException("MainDatabase connection string not configured.");

        services.AddDbContext<MainDbContext>(options =>
            options.UseSqlServer(mainConnStr, sql =>
            {
                sql.EnableRetryOnFailure(3);
                sql.CommandTimeout(60);
                sql.MigrationsAssembly("SeQrJewellery.Infrastructure");
                sql.MigrationsHistoryTable("__EFMigrationsHistory_Main");
            }));

        services.AddScoped<IMainDbContext>(sp => sp.GetRequiredService<MainDbContext>());

        services.AddSingleton<TenantDbContextFactory>();

        services.AddScoped<TenantDbContextAccessor>();

        services.AddScoped<ITenantService>(sp =>
            new TenantService(
                sp.GetRequiredService<IMainDbContext>(),
                sp.GetRequiredService<TenantDbContextFactory>(),
                mainConnStr));

        services.AddScoped<IPrintQueueService, PrintQueueService>();
        services.AddScoped<ITagService, TagService>();
        services.AddSingleton<IImageEmbeddingService, ClipImageEmbeddingService>();

        services.AddHttpClient();
        services.AddSingleton<IExcelExportService, ExcelExportService>();
        services.AddSingleton<IInvoicePdfService, InvoicePdfService>();
        services.AddScoped<IPermissionService, PermissionService>();
        services.AddScoped<IRazorpayService, RazorpayService>();
        services.AddScoped<ISocialMediaService, SocialMediaService>();

        return services;
    }
}
