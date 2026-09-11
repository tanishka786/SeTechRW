using Microsoft.EntityFrameworkCore;

namespace SeQrJewellery.Infrastructure.Data;

public class TenantDbContextFactory
{
    public TenantDbContext CreateForTenant(string connectionString)
    {
        var options = new DbContextOptionsBuilder<TenantDbContext>()
            .UseSqlServer(connectionString, sql =>
            {
                sql.EnableRetryOnFailure(3);
                sql.CommandTimeout(60);
                sql.MigrationsAssembly("SeQrJewellery.Infrastructure");
                sql.MigrationsHistoryTable("__EFMigrationsHistory_Tenant");
            })
            .Options;

        return new TenantDbContext(options);
    }
}
