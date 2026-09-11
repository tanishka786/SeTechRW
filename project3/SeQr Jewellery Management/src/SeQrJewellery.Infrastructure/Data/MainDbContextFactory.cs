using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Design;
using Microsoft.Extensions.Configuration;

namespace SeQrJewellery.Infrastructure.Data;

public class MainDbContextFactory : IDesignTimeDbContextFactory<MainDbContext>
{
    public MainDbContext CreateDbContext(string[] args)
    {
        var connStr = "Server=localhost\\SQLEXPRESS;Database=SeQrJewelleryMain;Trusted_Connection=True;TrustServerCertificate=True;";
        var options = new DbContextOptionsBuilder<MainDbContext>()
            .UseSqlServer(connStr, sql => sql.MigrationsAssembly("SeQrJewellery.Infrastructure"))
            .Options;
        return new MainDbContext(options);
    }
}

public class TenantDbContextDesignFactory : IDesignTimeDbContextFactory<TenantDbContext>
{
    public TenantDbContext CreateDbContext(string[] args)
    {
        var connStr = "Server=localhost\\SQLEXPRESS;Database=SeQrJewellery_Template;Trusted_Connection=True;TrustServerCertificate=True;";
        var options = new DbContextOptionsBuilder<TenantDbContext>()
            .UseSqlServer(connStr, sql => sql.MigrationsAssembly("SeQrJewellery.Infrastructure"))
            .Options;
        return new TenantDbContext(options);
    }
}
