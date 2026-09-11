using Microsoft.EntityFrameworkCore;
using SeQrJewellery.Domain.Entities.Tenant;
using SeQrJewellery.Domain.Enums;

namespace SeQrJewellery.Infrastructure.Data.Seed;

public static class TenantDbSeeder
{
    public static async Task SeedAsync(TenantDbContext context)
    {
        await context.Database.MigrateAsync();

        var metals = await SeedMetalsAndPuritiesAsync(context);
        await SeedCategoriesAsync(context);
        await SeedSuppliersAsync(context);
        await SeedLabelTemplatesAsync(context);
        await SeedEmployeesAsync(context);
        await SeedSampleCustomersAsync(context);
        await SeedSampleInventoryAsync(context, metals);

        await context.SaveChangesAsync();
    }

    private static async Task<Dictionary<string, (Guid MetalId, Dictionary<string, Guid> Purities)>> SeedMetalsAndPuritiesAsync(TenantDbContext context)
    {
        var result = new Dictionary<string, (Guid, Dictionary<string, Guid>)>();

        if (await context.Metals.AnyAsync()) return result;

        var goldId = Guid.NewGuid();
        var silverId = Guid.NewGuid();
        var platinumId = Guid.NewGuid();
        var diamondId = Guid.NewGuid();

        var metals = new List<Metal>
        {
            new() { Id = goldId, Name = "Gold", MetalType = MetalType.Gold, Symbol = "Au", CurrentMarketRate = 6200, RateUnit = "per gram", Description = "Precious yellow metal used in jewellery" },
            new() { Id = silverId, Name = "Silver", MetalType = MetalType.Silver, Symbol = "Ag", CurrentMarketRate = 75, RateUnit = "per gram", Description = "Precious white metal" },
            new() { Id = platinumId, Name = "Platinum", MetalType = MetalType.Platinum, Symbol = "Pt", CurrentMarketRate = 3200, RateUnit = "per gram", Description = "Precious white metal, harder than gold" },
            new() { Id = diamondId, Name = "Diamond", MetalType = MetalType.Diamond, Symbol = "D", CurrentMarketRate = 250000, RateUnit = "per carat", Description = "Precious gemstone" },
        };

        await context.Metals.AddRangeAsync(metals);

        // Gold purities
        var gold24K = Guid.NewGuid();
        var gold22K = Guid.NewGuid();
        var gold18K = Guid.NewGuid();
        var gold14K = Guid.NewGuid();

        var purities = new List<Purity>
        {
            // Gold
            new() { Id = gold24K, MetalId = goldId, Name = "24K", PurityPercentage = 99.9m, HallmarkCode = "999", Description = "Pure gold - 24 karat" },
            new() { Id = gold22K, MetalId = goldId, Name = "22K", PurityPercentage = 91.6m, HallmarkCode = "916", Description = "22 karat gold - Most common for jewellery in India" },
            new() { Id = gold18K, MetalId = goldId, Name = "18K", PurityPercentage = 75.0m, HallmarkCode = "750", Description = "18 karat gold - Common for diamond jewellery" },
            new() { Id = gold14K, MetalId = goldId, Name = "14K", PurityPercentage = 58.5m, HallmarkCode = "585", Description = "14 karat gold" },
            new() { MetalId = goldId, Name = "10K", PurityPercentage = 41.7m, HallmarkCode = "417", Description = "10 karat gold" },
            new() { MetalId = goldId, Name = "9K", PurityPercentage = 37.5m, HallmarkCode = "375", Description = "9 karat gold" },

            // Silver
            new() { MetalId = silverId, Name = "999 Fine Silver", PurityPercentage = 99.9m, HallmarkCode = "999", Description = "Pure fine silver" },
            new() { MetalId = silverId, Name = "925 Sterling Silver", PurityPercentage = 92.5m, HallmarkCode = "925", Description = "Most common silver alloy for jewellery" },
            new() { MetalId = silverId, Name = "800 Silver", PurityPercentage = 80.0m, HallmarkCode = "800", Description = "Continental silver" },

            // Platinum
            new() { MetalId = platinumId, Name = "PT 950", PurityPercentage = 95.0m, HallmarkCode = "PT950", Description = "95% platinum" },
            new() { MetalId = platinumId, Name = "PT 900", PurityPercentage = 90.0m, HallmarkCode = "PT900", Description = "90% platinum" },
            new() { MetalId = platinumId, Name = "PT 850", PurityPercentage = 85.0m, HallmarkCode = "PT850", Description = "85% platinum" },

            // Diamond
            new() { MetalId = diamondId, Name = "SI1-H", PurityPercentage = 100m, HallmarkCode = "SI1H", Description = "SI1 clarity, H color grade" },
            new() { MetalId = diamondId, Name = "VS1-F", PurityPercentage = 100m, HallmarkCode = "VS1F", Description = "VS1 clarity, F color grade" },
            new() { MetalId = diamondId, Name = "VVS1-D", PurityPercentage = 100m, HallmarkCode = "VVS1D", Description = "VVS1 clarity, D color grade - Highest quality" },
        };

        await context.Purities.AddRangeAsync(purities);

        result["Gold"] = (goldId, new Dictionary<string, Guid> { ["22K"] = gold22K, ["18K"] = gold18K });
        result["Silver"] = (silverId, new Dictionary<string, Guid>());

        return result;
    }

    private static async Task SeedCategoriesAsync(TenantDbContext context)
    {
        if (await context.Categories.AnyAsync()) return;

        var ringsId = Guid.NewGuid();
        var necklacesId = Guid.NewGuid();
        var earringsId = Guid.NewGuid();
        var banglesId = Guid.NewGuid();
        var braceletsId = Guid.NewGuid();

        var categories = new List<Category>
        {
            new() { Id = ringsId, Name = "Rings", Description = "All types of rings", DisplayOrder = 1 },
            new() { Id = necklacesId, Name = "Necklaces & Chains", Description = "Necklaces, chains, and mangalsutra", DisplayOrder = 2 },
            new() { Id = earringsId, Name = "Earrings", Description = "Earrings and ear studs", DisplayOrder = 3 },
            new() { Id = banglesId, Name = "Bangles", Description = "Gold and silver bangles", DisplayOrder = 4 },
            new() { Id = braceletsId, Name = "Bracelets", Description = "Bracelets and wristbands", DisplayOrder = 5 },
            new() { Name = "Pendants", Description = "Pendants and lockets", DisplayOrder = 6 },
            new() { Name = "Anklets", Description = "Anklets and payal", DisplayOrder = 7 },
            new() { Name = "Nose Pins", Description = "Nose rings and pins", DisplayOrder = 8 },
            new() { Name = "Maang Tikka", Description = "Maang tikka and hair accessories", DisplayOrder = 9 },
            new() { Name = "Waist Band", Description = "Kamarband and waist jewellery", DisplayOrder = 10 },
            new() { Name = "Coins & Bars", Description = "Gold coins, silver coins, bars", DisplayOrder = 11 },
            new() { Name = "Sets", Description = "Complete jewellery sets", DisplayOrder = 12 },

            // Sub-categories
            new() { Name = "Engagement Rings", ParentCategoryId = ringsId, DisplayOrder = 1 },
            new() { Name = "Wedding Rings", ParentCategoryId = ringsId, DisplayOrder = 2 },
            new() { Name = "Fashion Rings", ParentCategoryId = ringsId, DisplayOrder = 3 },
            new() { Name = "Cocktail Rings", ParentCategoryId = ringsId, DisplayOrder = 4 },
            new() { Name = "Mangalsutra", ParentCategoryId = necklacesId, DisplayOrder = 1 },
            new() { Name = "Gold Chains", ParentCategoryId = necklacesId, DisplayOrder = 2 },
            new() { Name = "Stud Earrings", ParentCategoryId = earringsId, DisplayOrder = 1 },
            new() { Name = "Hoop Earrings", ParentCategoryId = earringsId, DisplayOrder = 2 },
            new() { Name = "Jhumkas", ParentCategoryId = earringsId, DisplayOrder = 3 },
            new() { Name = "Gold Bangles", ParentCategoryId = banglesId, DisplayOrder = 1 },
            new() { Name = "Diamond Bangles", ParentCategoryId = banglesId, DisplayOrder = 2 },
            new() { Name = "Gold Bracelets", ParentCategoryId = braceletsId, DisplayOrder = 1 },
            new() { Name = "Diamond Bracelets", ParentCategoryId = braceletsId, DisplayOrder = 2 },
        };

        await context.Categories.AddRangeAsync(categories);
    }

    private static async Task SeedSuppliersAsync(TenantDbContext context)
    {
        if (await context.Suppliers.AnyAsync()) return;

        var suppliers = new List<Supplier>
        {
            new()
            {
                Name = "Shree Jewellery Suppliers",
                ContactPerson = "Ramesh Shah",
                Email = "ramesh@shreejewellery.com",
                Phone = "+91-22-23451234",
                City = "Mumbai",
                State = "Maharashtra",
                Country = "India",
                GSTNumber = "27AABCS9603R1ZM",
                CreditLimit = 500000,
                PaymentTermDays = 30,
                Notes = "Primary gold supplier"
            },
            new()
            {
                Name = "Diamond World Exports",
                ContactPerson = "Amit Mehta",
                Email = "amit@diamondworld.in",
                Phone = "+91-22-26550000",
                City = "Surat",
                State = "Gujarat",
                Country = "India",
                GSTNumber = "24AABCD9603R1ZM",
                CreditLimit = 1000000,
                PaymentTermDays = 45,
                Notes = "Diamond supplier - IGI certified"
            },
            new()
            {
                Name = "Silver Craft Industries",
                ContactPerson = "Priya Jain",
                Email = "priya@silvercraft.com",
                Phone = "+91-141-4001234",
                City = "Jaipur",
                State = "Rajasthan",
                Country = "India",
                GSTNumber = "08AABCS9603R1ZM",
                CreditLimit = 200000,
                PaymentTermDays = 30,
                Notes = "Silver jewellery wholesale supplier"
            },
        };

        await context.Suppliers.AddRangeAsync(suppliers);
    }

    private static async Task SeedLabelTemplatesAsync(TenantDbContext context)
    {
        if (await context.LabelTemplates.AnyAsync()) return;

        var templates = new List<LabelTemplate>
        {
            new()
            {
                Name = "Small Barcode Label",
                Description = "38mm x 25mm barcode label for jewellery tags",
                TagType = TagType.Barcode,
                LabelSize = LabelSize.Small,
                LabelWidthMm = 38,
                LabelHeightMm = 25,
                BartenderTemplateName = "JewellerySmall.btw",
                IsDefault = true,
                FieldMappings = """{"barcode": "BarcodeValue", "line1": "Name", "line2": "Metal+Purity", "line3": "Weight+Price"}"""
            },
            new()
            {
                Name = "Medium Barcode Label",
                Description = "50mm x 30mm barcode label with more details",
                TagType = TagType.Barcode,
                LabelSize = LabelSize.Medium,
                LabelWidthMm = 50,
                LabelHeightMm = 30,
                BartenderTemplateName = "JewelleryMedium.btw",
                IsDefault = false,
                FieldMappings = """{"barcode": "BarcodeValue", "line1": "SKU", "line2": "Name", "line3": "Metal+Purity", "line4": "GrossWeight+NetWeight", "line5": "Price"}"""
            },
            new()
            {
                Name = "RFID Tag Label",
                Description = "RFID label for electronic tagging",
                TagType = TagType.RFID,
                LabelSize = LabelSize.Medium,
                LabelWidthMm = 50,
                LabelHeightMm = 25,
                BartenderTemplateName = "JewelleryRFID.btw",
                IsDefault = false,
                FieldMappings = """{"epc": "EPC", "barcode": "BarcodeValue", "qr": "QRCodeValue", "line1": "Name", "line2": "SKU", "line3": "Price"}"""
            },
            new()
            {
                Name = "QR Code Label",
                Description = "QR code label with product URL",
                TagType = TagType.QRCode,
                LabelSize = LabelSize.Medium,
                LabelWidthMm = 40,
                LabelHeightMm = 40,
                BartenderTemplateName = "JewelleryQR.btw",
                IsDefault = false,
                FieldMappings = """{"qrcode": "ProductURL", "line1": "Name", "line2": "Price"}"""
            },
        };

        await context.LabelTemplates.AddRangeAsync(templates);
    }

    private static async Task SeedEmployeesAsync(TenantDbContext context)
    {
        if (await context.Employees.AnyAsync()) return;

        var employees = new List<Employee>
        {
            new() { EmployeeCode = "EMP001", FirstName = "Suresh", LastName = "Kumar", Email = "suresh@goldpalace.in", Phone = "+91-9876543210", Position = "Store Manager", Department = "Management", JoinDate = DateTime.UtcNow.AddYears(-3) },
            new() { EmployeeCode = "EMP002", FirstName = "Priya", LastName = "Sharma", Email = "priya@goldpalace.in", Phone = "+91-9876543211", Position = "Sales Executive", Department = "Sales", JoinDate = DateTime.UtcNow.AddYears(-2) },
            new() { EmployeeCode = "EMP003", FirstName = "Rahul", LastName = "Verma", Email = "rahul@goldpalace.in", Phone = "+91-9876543212", Position = "Accountant", Department = "Finance", JoinDate = DateTime.UtcNow.AddYears(-1) },
            new() { EmployeeCode = "EMP004", FirstName = "Anita", LastName = "Patel", Email = "anita@goldpalace.in", Phone = "+91-9876543213", Position = "Sales Executive", Department = "Sales", JoinDate = DateTime.UtcNow.AddMonths(-6) },
        };

        await context.Employees.AddRangeAsync(employees);
    }

    private static async Task SeedSampleCustomersAsync(TenantDbContext context)
    {
        if (await context.Customers.AnyAsync()) return;

        var customers = new List<Customer>
        {
            new() { CustomerCode = "GP-CUS001", FirstName = "Ramesh", LastName = "Agarwal", Email = "ramesh.agarwal@gmail.com", Phone = "+91-9901234567", City = "Mumbai", DateOfBirth = new DateTime(1975, 5, 15), CustomerType = CustomerType.VIP, LoyaltyPoints = 1500 },
            new() { CustomerCode = "GP-CUS002", FirstName = "Sunita", LastName = "Mehta", Email = "sunita.mehta@yahoo.com", Phone = "+91-9812345678", City = "Pune", Anniversary = new DateTime(2005, 11, 20), CustomerType = CustomerType.Retail },
            new() { CustomerCode = "GP-CUS003", FirstName = "Vikram", LastName = "Singh", Phone = "+91-9723456789", City = "Thane", CustomerType = CustomerType.Wholesale, GST = "27AAAFS1234R1ZM" },
            new() { CustomerCode = "GP-CUS004", FirstName = "Pooja", LastName = "Desai", Email = "pooja.d@gmail.com", Phone = "+91-9634567890", City = "Mumbai", DateOfBirth = new DateTime(1988, 8, 25), CustomerType = CustomerType.Retail, LoyaltyPoints = 250 },
            new() { CustomerCode = "GP-CUS005", FirstName = "Ajay", LastName = "Kapoor", Email = "ajay.k@hotmail.com", Phone = "+91-9545678901", City = "Navi Mumbai", CustomerType = CustomerType.Retail },
        };

        await context.Customers.AddRangeAsync(customers);
    }

    private static async Task SeedSampleInventoryAsync(TenantDbContext context,
        Dictionary<string, (Guid MetalId, Dictionary<string, Guid> Purities)> metals)
    {
        if (await context.JewelleryItems.AnyAsync()) return;

        var goldId = (await context.Metals.FirstOrDefaultAsync(m => m.Name == "Gold"))?.Id ?? Guid.Empty;
        var silverId = (await context.Metals.FirstOrDefaultAsync(m => m.Name == "Silver"))?.Id ?? Guid.Empty;
        var platinumId = (await context.Metals.FirstOrDefaultAsync(m => m.Name == "Platinum"))?.Id ?? Guid.Empty;

        var gold22KId = (await context.Purities.FirstOrDefaultAsync(p => p.MetalId == goldId && p.Name == "22K"))?.Id ?? Guid.Empty;
        var gold18KId = (await context.Purities.FirstOrDefaultAsync(p => p.MetalId == goldId && p.Name == "18K"))?.Id ?? Guid.Empty;
        var silver925Id = (await context.Purities.FirstOrDefaultAsync(p => p.MetalId == silverId && p.Name == "925 Sterling Silver"))?.Id ?? Guid.Empty;
        var platinum950Id = (await context.Purities.FirstOrDefaultAsync(p => p.MetalId == platinumId && p.Name == "PT 950"))?.Id ?? Guid.Empty;

        var ringsCatId = (await context.Categories.FirstOrDefaultAsync(c => c.Name == "Rings"))?.Id ?? Guid.Empty;
        var necklacesCatId = (await context.Categories.FirstOrDefaultAsync(c => c.Name == "Necklaces & Chains"))?.Id ?? Guid.Empty;
        var earringsCatId = (await context.Categories.FirstOrDefaultAsync(c => c.Name == "Earrings"))?.Id ?? Guid.Empty;
        var banglesCatId = (await context.Categories.FirstOrDefaultAsync(c => c.Name == "Bangles"))?.Id ?? Guid.Empty;

        if (goldId == Guid.Empty || gold22KId == Guid.Empty) return;

        var items = new List<JewelleryItem>
        {
            new()
            {
                SKU = "GP-GR-001",
                Name = "Gold Solitaire Ring 22K",
                Description = "Classic solitaire ring in 22K gold",
                CategoryId = ringsCatId,
                MetalId = goldId,
                PurityId = gold22KId,
                GrossWeight = 5.2m,
                NetWeight = 5.0m,
                StoneWeight = 0,
                WastagePercent = 2,
                MetalRate = 6200,
                MetalValue = 31000,
                MakingCharges = 2500,
                MakingChargesPercent = 8,
                StoneCharges = 0,
                TaxPercent = 3,
                TaxAmount = 1005,
                SellingPrice = 34505,
                CostPrice = 28000,
                QuantityInStock = 3,
                Size = "18",
                HallmarkNumber = "916-BIS-2024-001",
                IsBISCertified = true,
                Gender = "Female",
                Occasion = "Wedding",
                Design = "Solitaire"
            },
            new()
            {
                SKU = "GP-GN-001",
                Name = "Gold Chain 22K - 18 inch",
                Description = "Rope style gold chain, 18 inches",
                CategoryId = necklacesCatId,
                MetalId = goldId,
                PurityId = gold22KId,
                GrossWeight = 8.5m,
                NetWeight = 8.2m,
                StoneWeight = 0,
                WastagePercent = 2,
                MetalRate = 6200,
                MetalValue = 50840,
                MakingCharges = 4000,
                MakingChargesPercent = 8,
                TaxPercent = 3,
                TaxAmount = 1646,
                SellingPrice = 56486,
                CostPrice = 48000,
                QuantityInStock = 5,
                Size = "18 inch",
                HallmarkNumber = "916-BIS-2024-002",
                IsBISCertified = true,
                Style = "Rope Chain",
                Gender = "Female"
            },
            new()
            {
                SKU = "GP-GE-001",
                Name = "Gold Jhumka Earrings 22K",
                Description = "Traditional jhumka style earrings",
                CategoryId = earringsCatId,
                MetalId = goldId,
                PurityId = gold22KId,
                GrossWeight = 6.8m,
                NetWeight = 6.5m,
                StoneWeight = 0,
                WastagePercent = 3,
                MetalRate = 6200,
                MetalValue = 40300,
                MakingCharges = 3500,
                MakingChargesPercent = 10,
                TaxPercent = 3,
                TaxAmount = 1314,
                SellingPrice = 45114,
                CostPrice = 36000,
                QuantityInStock = 2,
                HallmarkNumber = "916-BIS-2024-003",
                IsBISCertified = true,
                Style = "Jhumka",
                Gender = "Female",
                Occasion = "Festival"
            },
            new()
            {
                SKU = "GP-GB-001",
                Name = "Gold Bangle Set 22K",
                Description = "Set of 4 plain gold bangles",
                CategoryId = banglesCatId,
                MetalId = goldId,
                PurityId = gold22KId,
                GrossWeight = 24.0m,
                NetWeight = 23.5m,
                StoneWeight = 0,
                WastagePercent = 2,
                MetalRate = 6200,
                MetalValue = 145700,
                MakingCharges = 8000,
                TaxPercent = 3,
                TaxAmount = 4611,
                SellingPrice = 158311,
                CostPrice = 138000,
                QuantityInStock = 1,
                Size = "2-6",
                HallmarkNumber = "916-BIS-2024-004",
                IsBISCertified = true,
                Gender = "Female"
            },
            new()
            {
                SKU = "GP-DR-001",
                Name = "Diamond Solitaire Ring 18K",
                Description = "Diamond solitaire engagement ring, 0.5 carat",
                CategoryId = ringsCatId,
                MetalId = goldId,
                PurityId = gold18KId,
                GrossWeight = 3.8m,
                NetWeight = 3.5m,
                StoneWeight = 0.1m,
                WastagePercent = 1,
                MetalRate = 5000,
                MetalValue = 17500,
                MakingCharges = 5000,
                StoneCharges = 65000,
                TaxPercent = 3,
                TaxAmount = 2625,
                SellingPrice = 90125,
                CostPrice = 75000,
                QuantityInStock = 1,
                Size = "17",
                CertificateNumber = "IGI-2024-1234567",
                HallmarkNumber = "750-BIS-2024-005",
                IsBISCertified = true,
                Gender = "Female",
                Occasion = "Engagement",
                Design = "Solitaire"
            },
            new()
            {
                SKU = "GP-SR-001",
                Name = "Silver Anklet",
                Description = "Sterling silver anklet with bells",
                CategoryId = (await context.Categories.FirstOrDefaultAsync(c => c.Name == "Anklets"))?.Id ?? ringsCatId,
                MetalId = silverId,
                PurityId = silver925Id,
                GrossWeight = 15.0m,
                NetWeight = 14.5m,
                StoneWeight = 0,
                WastagePercent = 2,
                MetalRate = 75,
                MetalValue = 1088,
                MakingCharges = 500,
                TaxPercent = 3,
                TaxAmount = 47,
                SellingPrice = 1635,
                CostPrice = 1200,
                QuantityInStock = 10,
                Gender = "Female",
                Style = "Traditional"
            },
        };

        await context.JewelleryItems.AddRangeAsync(items);
        await context.SaveChangesAsync();

        // Assign barcodes to items
        var savedItems = await context.JewelleryItems.ToListAsync();
        var tags = savedItems.Select((item, idx) =>
        {
            var barcode = $"SQR{item.SKU.Replace("-", "")}{DateTime.UtcNow.Year}";
            return new JewelleryTag
            {
                JewelleryItemId = item.Id,
                BarcodeValue = barcode,
                QRCodeValue = $"QR-{barcode}",
                IsPrimary = true,
                IsActive = true
            };
        }).ToList();

        await context.JewelleryTags.AddRangeAsync(tags);

        // Seed initial stock movements
        var movements = savedItems.Select(item => new StockMovement
        {
            JewelleryItemId = item.Id,
            MovementType = StockMovementType.Opening,
            QuantityBefore = 0,
            QuantityChange = item.QuantityInStock,
            QuantityAfter = item.QuantityInStock,
            ReferenceType = "Opening",
            Notes = "Opening stock entry",
            MovedBy = "system"
        }).ToList();

        await context.StockMovements.AddRangeAsync(movements);

        // Seed today's metal rates
        var goldMetal = await context.Metals.FirstOrDefaultAsync(m => m.Name == "Gold");
        var silverMetal = await context.Metals.FirstOrDefaultAsync(m => m.Name == "Silver");
        var gold22KPurity = await context.Purities.FirstOrDefaultAsync(p => p.MetalId == goldId && p.Name == "22K");
        var gold18KPurity = await context.Purities.FirstOrDefaultAsync(p => p.MetalId == goldId && p.Name == "18K");
        var silver925Purity = await context.Purities.FirstOrDefaultAsync(p => p.MetalId == silverId && p.Name == "925 Sterling Silver");

        if (goldMetal != null && gold22KPurity != null)
        {
            var rates = new List<MetalRate>
            {
                new() { MetalId = goldId, PurityId = gold22KId, RatePerGram = 6200, RatePerTola = 72301, RatePerOz = 192882, RateDate = DateTime.UtcNow.Date, Source = "IBJA" },
                new() { MetalId = goldId, PurityId = gold18KId, RatePerGram = 5000, RatePerTola = 58320, RatePerOz = 155500, RateDate = DateTime.UtcNow.Date, Source = "IBJA" },
                new() { MetalId = silverId, PurityId = silver925Id, RatePerGram = 75, RatePerTola = 875, RatePerOz = 2332, RateDate = DateTime.UtcNow.Date, Source = "IBJA" },
            };
            await context.MetalRates.AddRangeAsync(rates);
        }
    }
}
