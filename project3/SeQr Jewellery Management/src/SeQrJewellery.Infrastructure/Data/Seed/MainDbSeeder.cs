using Microsoft.EntityFrameworkCore;
using SeQrJewellery.Domain.Entities.Main;
using SeQrJewellery.Domain.Enums;

namespace SeQrJewellery.Infrastructure.Data.Seed;

public static class MainDbSeeder
{
    public static async Task SeedAsync(MainDbContext context, string masterConnectionString)
    {
        await context.Database.MigrateAsync();

        await SeedSystemConfigurationsAsync(context);
        await SeedRFIDReaderProfilesAsync(context);
        await SeedDemoTenantAsync(context, masterConnectionString);

        await context.SaveChangesAsync();
    }

    private static async Task SeedSystemConfigurationsAsync(MainDbContext context)
    {
        if (await context.SystemConfigurations.AnyAsync()) return;

        var configs = new List<SystemConfiguration>
        {
            new() { Key = "System.Name", Value = "SeQr Jewellery Management", Category = "General", Description = "System display name" },
            new() { Key = "System.Version", Value = "1.0.0", Category = "General", IsReadOnly = true },
            new() { Key = "System.DefaultCurrency", Value = "INR", Category = "General", Description = "Default currency for new tenants" },
            new() { Key = "System.DefaultTimeZone", Value = "Asia/Kolkata", Category = "General", Description = "Default timezone for new tenants" },
            new() { Key = "System.DefaultCountry", Value = "India", Category = "General" },
            new() { Key = "System.MaxTenantsPerServer", Value = "100", Category = "Limits" },
            new() { Key = "JWT.Secret", Value = "SeQr-JWT-Super-Secret-Key-2024-Jewellery-Mgmt-System", Category = "Security", IsEncrypted = true },
            new() { Key = "JWT.Issuer", Value = "SeQrJewelleryManagement", Category = "Security" },
            new() { Key = "JWT.Audience", Value = "SeQrClients", Category = "Security" },
            new() { Key = "JWT.ExpiryMinutes", Value = "60", Category = "Security" },
            new() { Key = "JWT.RefreshExpiryDays", Value = "30", Category = "Security" },
            new() { Key = "Barcode.Prefix", Value = "SQR", Category = "Labelling", Description = "Prefix for generated barcodes" },
            new() { Key = "Barcode.Format", Value = "CODE128", Category = "Labelling", Description = "Default barcode format" },
            new() { Key = "RFID.DefaultProtocol", Value = "EPC_GEN2", Category = "RFID" },
            new() { Key = "RFID.DefaultReadPower", Value = "27", Category = "RFID", Description = "Default read power in dBm" },
            new() { Key = "PrintQueue.PollIntervalSeconds", Value = "5", Category = "Printing" },
            new() { Key = "PrintQueue.MaxRetries", Value = "3", Category = "Printing" },
            new() { Key = "Email.SmtpHost", Value = "smtp.sendgrid.net", Category = "Email" },
            new() { Key = "Email.SmtpPort", Value = "587", Category = "Email" },
            new() { Key = "Email.FromAddress", Value = "noreply@seqrjewellery.com", Category = "Email" },
            new() { Key = "Invoice.Prefix.Sale", Value = "INV", Category = "Invoice" },
            new() { Key = "Invoice.Prefix.Purchase", Value = "PUR", Category = "Invoice" },
            new() { Key = "Invoice.Prefix.Repair", Value = "REP", Category = "Invoice" },
            new() { Key = "Stock.AutoDeductOnSale", Value = "true", Category = "Inventory" },
            new() { Key = "Trial.DurationDays", Value = "30", Category = "Subscription" },
        };

        await context.SystemConfigurations.AddRangeAsync(configs);
    }

    private static async Task SeedRFIDReaderProfilesAsync(MainDbContext context)
    {
        if (await context.RFIDReaderProfiles.AnyAsync()) return;

        var profiles = new List<RFIDReaderProfile>
        {
            new()
            {
                Name = "Zebra FX9600",
                Manufacturer = RFIDReaderManufacturer.Zebra,
                ModelNumber = "FX9600",
                ConnectionType = RFIDConnectionType.Ethernet,
                Protocol = "EPC_GEN2",
                AntennaCount = 4,
                ReadPowerDbm = 27,
                WritePowerDbm = 27,
                Description = "Fixed RFID Reader - Ideal for store entrance/exit monitoring",
                ConnectionParameters = """{"port": 5084, "keepAlive": true, "timeout": 5000}""",
                FirmwareVersion = "3.10.0.0"
            },
            new()
            {
                Name = "Zebra RFD8500",
                Manufacturer = RFIDReaderManufacturer.Zebra,
                ModelNumber = "RFD8500",
                ConnectionType = RFIDConnectionType.Bluetooth,
                Protocol = "EPC_GEN2",
                AntennaCount = 1,
                ReadPowerDbm = 27,
                Description = "Handheld RFID Sled - Attach to Android device for mobile scanning",
                ConnectionParameters = """{"bluetoothName": "RFD8500", "timeout": 5000}"""
            },
            new()
            {
                Name = "Impinj Speedway R420",
                Manufacturer = RFIDReaderManufacturer.Impinj,
                ModelNumber = "R420",
                ConnectionType = RFIDConnectionType.Ethernet,
                Protocol = "EPC_GEN2",
                AntennaCount = 4,
                ReadPowerDbm = 30,
                WritePowerDbm = 30,
                Description = "Industrial fixed RFID reader with Octane SDK support",
                ConnectionParameters = """{"port": 5084, "useOctaneSDK": true}""",
                FirmwareVersion = "5.14.0.240"
            },
            new()
            {
                Name = "Impinj xSpan Gateway",
                Manufacturer = RFIDReaderManufacturer.Impinj,
                ModelNumber = "xSpan",
                ConnectionType = RFIDConnectionType.Ethernet,
                Protocol = "EPC_GEN2",
                AntennaCount = 1,
                ReadPowerDbm = 27,
                Description = "Portal-style reader for doorway monitoring",
                ConnectionParameters = """{"port": 5084}"""
            },
            new()
            {
                Name = "Honeywell IF2 RFID Reader",
                Manufacturer = RFIDReaderManufacturer.Honeywell,
                ModelNumber = "IF2",
                ConnectionType = RFIDConnectionType.USB,
                Protocol = "EPC_GEN2",
                AntennaCount = 1,
                ReadPowerDbm = 25,
                Description = "Desktop USB RFID reader for point-of-sale scanning",
                ConnectionParameters = """{"comPort": "COM3", "baudRate": 115200}"""
            },
            new()
            {
                Name = "Alien ALR-9900+",
                Manufacturer = RFIDReaderManufacturer.Alien,
                ModelNumber = "ALR-9900+",
                ConnectionType = RFIDConnectionType.Ethernet,
                Protocol = "EPC_GEN2",
                AntennaCount = 4,
                ReadPowerDbm = 28,
                Description = "High performance fixed reader",
                ConnectionParameters = """{"port": 23, "username": "alien", "password": "password"}"""
            },
            new()
            {
                Name = "Generic USB Barcode Scanner",
                Manufacturer = RFIDReaderManufacturer.Other,
                ModelNumber = "USB-HID",
                ConnectionType = RFIDConnectionType.USB,
                Protocol = "HID",
                AntennaCount = 0,
                Description = "Standard USB HID barcode scanner (keyboard emulation mode)",
                ConnectionParameters = """{"mode": "keyboard_emulation", "prefix": "", "suffix": "\r"}"""
            }
        };

        await context.RFIDReaderProfiles.AddRangeAsync(profiles);
    }

    private static async Task SeedDemoTenantAsync(MainDbContext context, string masterConnectionString)
    {
        if (await context.Tenants.AnyAsync()) return;

        var demoTenantId = Guid.NewGuid();
        var demoDbName = "SeQrJewellery_Demo";
        var demoConnStr = BuildTenantConnectionString(masterConnectionString, demoDbName);

        var tenant = new Tenant
        {
            Id = demoTenantId,
            Name = "Gold Palace Jewellers",
            Identifier = "goldpalace",
            DatabaseName = demoDbName,
            ConnectionString = demoConnStr,
            Status = TenantStatus.Active,
            Plan = TenantPlan.Professional,
            BusinessName = "Gold Palace Jewellers Pvt Ltd",
            BusinessRegistrationNumber = "U74999MH2020PTC123456",
            GSTNumber = "27AABCU9603R1ZM",
            TaxNumber = "AABCU9603R",
            Address = "Shop No. 12, Zaveri Bazaar",
            City = "Mumbai",
            State = "Maharashtra",
            Country = "India",
            PostalCode = "400002",
            Phone = "+91-22-23429999",
            Email = "info@goldpalace.in",
            Website = "www.goldpalace.in",
            TimeZone = "Asia/Kolkata",
            Currency = "INR",
            CurrencySymbol = "₹",
            DateFormat = "dd/MM/yyyy",
            SubscriptionStartDate = DateTime.UtcNow,
            SubscriptionEndDate = DateTime.UtcNow.AddYears(1),
            MaxUsers = 20,
            MaxLocations = 3
        };

        await context.Tenants.AddAsync(tenant);

        // Add tenant configurations
        var configs = new List<TenantConfiguration>
        {
            new() { TenantId = demoTenantId, Key = "Invoice.Prefix.Sale", Value = "GP-INV", Category = "Invoice" },
            new() { TenantId = demoTenantId, Key = "Invoice.Prefix.Purchase", Value = "GP-PUR", Category = "Invoice" },
            new() { TenantId = demoTenantId, Key = "Invoice.Prefix.Repair", Value = "GP-REP", Category = "Invoice" },
            new() { TenantId = demoTenantId, Key = "Customer.Code.Prefix", Value = "GP-CUS", Category = "Customer" },
            new() { TenantId = demoTenantId, Key = "Label.DefaultTemplate", Value = "GoldPalaceSmall", Category = "Printing" },
            new() { TenantId = demoTenantId, Key = "Label.BartenderServer", Value = "localhost", Category = "Printing" },
            new() { TenantId = demoTenantId, Key = "Tax.CGST", Value = "1.5", Category = "Tax" },
            new() { TenantId = demoTenantId, Key = "Tax.SGST", Value = "1.5", Category = "Tax" },
            new() { TenantId = demoTenantId, Key = "Making.DefaultPercent", Value = "12", Category = "Pricing" },
            new() { TenantId = demoTenantId, Key = "Wastage.DefaultPercent", Value = "3", Category = "Pricing" },
        };

        await context.TenantConfigurations.AddRangeAsync(configs);

        // Add admin user for demo tenant (password: Admin@123)
        var adminUser = new TenantUser
        {
            TenantId = demoTenantId,
            Username = "admin",
            Email = "admin@goldpalace.in",
            PasswordHash = BCrypt.HashPassword("Admin@123"),
            FirstName = "Admin",
            LastName = "User",
            Role = UserRole.TenantAdmin,
            IsEmailVerified = true,
            IsActive = true
        };

        await context.TenantUsers.AddAsync(adminUser);
    }

    /// <summary>
    /// Builds a tenant DB connection string from the main DB connection string.
    /// Prefer this over string.Replace so Server/auth settings stay intact.
    /// </summary>
    public static string BuildTenantConnectionString(string masterConnectionString, string databaseName)
    {
        var builder = new Microsoft.Data.SqlClient.SqlConnectionStringBuilder(masterConnectionString)
        {
            InitialCatalog = databaseName
        };
        return builder.ConnectionString;
    }

    private static string BCrypt_HashPassword(string password)
    {
        // Simple implementation placeholder - actual BCrypt should be used
        using var sha = System.Security.Cryptography.SHA256.Create();
        var bytes = System.Text.Encoding.UTF8.GetBytes(password);
        var hash = sha.ComputeHash(bytes);
        return "$bcrypt$" + Convert.ToBase64String(hash);
    }
}

// Simple BCrypt stub - in production use BCrypt.Net-Next package
public static class BCrypt
{
    public static string HashPassword(string password)
    {
        using var sha = System.Security.Cryptography.SHA256.Create();
        var saltedPassword = "SeQr_Salt_2024_" + password;
        var bytes = System.Text.Encoding.UTF8.GetBytes(saltedPassword);
        var hash = sha.ComputeHash(bytes);
        return "$2a$11$" + Convert.ToBase64String(hash);
    }

    public static bool Verify(string password, string hash)
    {
        return HashPassword(password) == hash;
    }
}
