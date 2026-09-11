using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SeQrJewellery.Application.DTOs.Reports;
using SeQrJewellery.Application.Interfaces;
using SeQrJewellery.Domain.Enums;
using SeQrJewellery.Infrastructure.Data;

namespace SeQrJewellery.API.Controllers;

/// <summary>Reports and analytics</summary>
[Authorize]
public class ReportsController : BaseController
{
    private const string XlsxContentType = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

    private readonly TenantDbContextAccessor _contextAccessor;
    private readonly IExcelExportService _excelExport;

    public ReportsController(TenantDbContextAccessor contextAccessor, IExcelExportService excelExport)
    {
        _contextAccessor = contextAccessor;
        _excelExport = excelExport;
    }

    /// <summary>Sales report for a date range</summary>
    [HttpGet("sales")]
    public async Task<IActionResult> GetSalesReport([FromQuery] ReportFilterRequest filter, CancellationToken ct)
    {
        var db = await _contextAccessor.GetContextAsync(ct);
        var fromDate = filter.FromDate ?? DateTime.UtcNow.Date.AddDays(-30);
        var toDate = filter.ToDate ?? DateTime.UtcNow.Date.AddDays(1);

        var invoices = await db.Invoices
            .Include(i => i.Items).ThenInclude(item => item.JewelleryItem).ThenInclude(j => j.Category)
            .Include(i => i.Items).ThenInclude(item => item.JewelleryItem).ThenInclude(j => j.Metal)
            .Include(i => i.Customer)
            .Where(i => i.InvoiceType == InvoiceType.Sale &&
                i.Status != InvoiceStatus.Cancelled &&
                i.InvoiceDate >= fromDate &&
                i.InvoiceDate <= toDate)
            .AsNoTracking()
            .ToListAsync(ct);

        var report = new SalesReportDto
        {
            FromDate = fromDate,
            ToDate = toDate,
            TotalInvoices = invoices.Count,
            TotalSalesAmount = invoices.Sum(i => i.TotalAmount),
            TotalTaxCollected = invoices.Sum(i => i.TotalTax),
            TotalDiscount = invoices.Sum(i => i.TotalDiscount),
            TotalWeight = invoices.SelectMany(i => i.Items).Sum(item => item.GrossWeight),

            SalesByDay = invoices
                .GroupBy(i => i.InvoiceDate.Date)
                .Select(g => new SalesByDayDto
                {
                    Date = g.Key,
                    InvoiceCount = g.Count(),
                    Amount = g.Sum(i => i.TotalAmount),
                    GoldWeight = g.SelectMany(i => i.Items)
                        .Where(item => item.JewelleryItem?.Metal?.MetalType == MetalType.Gold)
                        .Sum(item => item.NetWeight * item.Quantity)
                })
                .OrderBy(x => x.Date),

            SalesByCategory = invoices.SelectMany(i => i.Items)
                .GroupBy(item => item.JewelleryItem?.Category?.Name ?? "Unknown")
                .Select(g => new SalesByCategoryDto
                {
                    CategoryName = g.Key,
                    ItemCount = g.Count(),
                    TotalAmount = g.Sum(item => item.TotalPrice),
                    Percentage = invoices.Sum(i => i.TotalAmount) > 0
                        ? g.Sum(item => item.TotalPrice) / invoices.Sum(i => i.TotalAmount) * 100 : 0
                }),

            SalesByMetal = invoices.SelectMany(i => i.Items)
                .GroupBy(item => item.JewelleryItem?.Metal?.Name ?? "Unknown")
                .Select(g => new SalesByMetalDto
                {
                    MetalName = g.Key,
                    TotalWeight = g.Sum(item => item.NetWeight),
                    TotalAmount = g.Sum(item => item.TotalPrice)
                }),

            TopCustomers = invoices
                .Where(i => i.Customer != null)
                .GroupBy(i => new { i.CustomerId, Name = $"{i.Customer!.FirstName} {i.Customer.LastName}" })
                .Select(g => new TopCustomerDto
                {
                    CustomerName = g.Key.Name,
                    PurchaseCount = g.Count(),
                    TotalAmount = g.Sum(i => i.TotalAmount)
                })
                .OrderByDescending(x => x.TotalAmount)
                .Take(10)
        };

        return OkResult(report);
    }

    /// <summary>Current inventory report</summary>
    [HttpGet("inventory")]
    public async Task<IActionResult> GetInventoryReport([FromQuery] ReportFilterRequest filter, CancellationToken ct)
    {
        var db = await _contextAccessor.GetContextAsync(ct);
        var items = await db.JewelleryItems
            .Include(i => i.Category).Include(i => i.Metal).Include(i => i.Purity)
            .Where(i => i.IsActive)
            .AsNoTracking()
            .ToListAsync(ct);

        var report = new InventoryReportDto
        {
            TotalItems = items.Count,
            TotalInStockItems = items.Count(i => i.QuantityInStock > 0),
            TotalOutOfStockItems = items.Count(i => i.QuantityInStock == 0),
            TotalStockValue = items.Sum(i => i.SellingPrice * i.QuantityInStock),
            TotalGoldWeight = items.Where(i => i.Metal?.MetalType == MetalType.Gold).Sum(i => i.NetWeight * i.QuantityInStock),
            TotalSilverWeight = items.Where(i => i.Metal?.MetalType == MetalType.Silver).Sum(i => i.NetWeight * i.QuantityInStock),

            ByCategory = items
                .GroupBy(i => i.Category?.Name ?? "Unknown")
                .Select(g => new InventoryByCategoryDto
                {
                    CategoryName = g.Key,
                    ItemCount = g.Sum(i => i.QuantityInStock),
                    StockValue = g.Sum(i => i.SellingPrice * i.QuantityInStock),
                    TotalWeight = g.Sum(i => i.NetWeight * i.QuantityInStock)
                })
                .OrderByDescending(x => x.StockValue),

            ByMetal = items
                .GroupBy(i => new { MetalName = i.Metal?.Name ?? "Unknown", PurityName = i.Purity?.Name ?? "" })
                .Select(g => new InventoryByMetalDto
                {
                    MetalName = g.Key.MetalName,
                    PurityName = g.Key.PurityName,
                    ItemCount = g.Sum(i => i.QuantityInStock),
                    TotalWeight = g.Sum(i => i.NetWeight * i.QuantityInStock),
                    StockValue = g.Sum(i => i.SellingPrice * i.QuantityInStock)
                })
                .OrderByDescending(x => x.StockValue),

            LowStockItems = items
                .Where(i => i.QuantityInStock <= i.ReorderLevel && i.QuantityInStock > 0)
                .Select(i => new LowStockItemDto
                {
                    Id = i.Id,
                    SKU = i.SKU,
                    Name = i.Name,
                    QuantityInStock = i.QuantityInStock,
                    ReorderLevel = i.ReorderLevel
                })
        };

        return OkResult(report);
    }

    /// <summary>Audit log report</summary>
    [HttpGet("audit")]
    public async Task<IActionResult> GetAuditReport(
        [FromQuery] DateTime? fromDate, [FromQuery] DateTime? toDate,
        [FromQuery] string? entityType, [FromQuery] string? userId,
        [FromQuery] int page = 1, [FromQuery] int pageSize = 50,
        CancellationToken ct = default)
    {
        var db = await _contextAccessor.GetContextAsync(ct);
        var query = db.AuditLogs.AsNoTracking();

        if (fromDate.HasValue) query = query.Where(a => a.Timestamp >= fromDate);
        if (toDate.HasValue) query = query.Where(a => a.Timestamp <= toDate);
        if (!string.IsNullOrEmpty(entityType)) query = query.Where(a => a.EntityType == entityType);
        if (!string.IsNullOrEmpty(userId)) query = query.Where(a => a.UserId == userId);

        var total = await query.CountAsync(ct);
        var logs = await query.OrderByDescending(a => a.Timestamp)
            .Skip((page - 1) * pageSize).Take(pageSize).ToListAsync(ct);

        return OkResult(new { total, page, pageSize, logs });
    }

    /// <summary>Metal rate history report</summary>
    [HttpGet("metal-rates")]
    public async Task<IActionResult> GetMetalRates([FromQuery] Guid? metalId, [FromQuery] int days = 30, CancellationToken ct = default)
    {
        var db = await _contextAccessor.GetContextAsync(ct);
        var fromDate = DateTime.UtcNow.Date.AddDays(-days);

        var query = db.MetalRates
            .Include(r => r.Metal)
            .Include(r => r.Purity)
            .Where(r => r.RateDate >= fromDate)
            .AsNoTracking();

        if (metalId.HasValue) query = query.Where(r => r.MetalId == metalId.Value);

        var rates = await query.OrderByDescending(r => r.RateDate).ToListAsync(ct);
        return OkResult(rates);
    }

    /// <summary>Dashboard summary statistics</summary>
    [HttpGet("dashboard")]
    public async Task<IActionResult> GetDashboard(CancellationToken ct)
    {
        var db = await _contextAccessor.GetContextAsync(ct);
        var today = DateTime.UtcNow.Date;
        var thisMonthStart = new DateTime(today.Year, today.Month, 1);

        var todaySales = await db.Invoices
            .Where(i => i.InvoiceType == InvoiceType.Sale && i.Status != InvoiceStatus.Cancelled && i.InvoiceDate >= today)
            .SumAsync(i => (decimal?)i.TotalAmount, ct) ?? 0;

        var monthSales = await db.Invoices
            .Where(i => i.InvoiceType == InvoiceType.Sale && i.Status != InvoiceStatus.Cancelled && i.InvoiceDate >= thisMonthStart)
            .SumAsync(i => (decimal?)i.TotalAmount, ct) ?? 0;

        var goldLine = db.InvoiceItems.Where(li =>
            li.Invoice.InvoiceType == InvoiceType.Sale
            && li.Invoice.Status != InvoiceStatus.Cancelled
            && li.JewelleryItem.Metal.MetalType == MetalType.Gold);

        var todayGoldWeightSold = await goldLine
            .Where(li => li.Invoice.InvoiceDate >= today)
            .SumAsync(li => (decimal?)(li.NetWeight * li.Quantity), ct) ?? 0;

        var monthGoldWeightSold = await goldLine
            .Where(li => li.Invoice.InvoiceDate >= thisMonthStart)
            .SumAsync(li => (decimal?)(li.NetWeight * li.Quantity), ct) ?? 0;

        var todayOldGoldWeight = await db.Invoices
            .Where(i => i.InvoiceType == InvoiceType.Sale && i.Status != InvoiceStatus.Cancelled && i.InvoiceDate >= today)
            .SumAsync(i => (decimal?)i.OldGoldWeight, ct) ?? 0;

        var goldStockWeight = await db.JewelleryItems
            .Where(i => i.IsActive && i.QuantityInStock > 0 && i.Metal.MetalType == MetalType.Gold)
            .SumAsync(i => (decimal?)(i.NetWeight * i.QuantityInStock), ct) ?? 0;

        var silverStockWeight = await db.JewelleryItems
            .Where(i => i.IsActive && i.QuantityInStock > 0 && i.Metal.MetalType == MetalType.Silver)
            .SumAsync(i => (decimal?)(i.NetWeight * i.QuantityInStock), ct) ?? 0;

        var totalItems = await db.JewelleryItems.CountAsync(ct);
        var inStockItems = await db.JewelleryItems.CountAsync(i => i.QuantityInStock > 0, ct);
        var totalCustomers = await db.Customers.CountAsync(ct);
        var pendingRepairs = await db.Repairs.CountAsync(r => r.Status != RepairStatus.Delivered && r.Status != RepairStatus.Cancelled, ct);
        var pendingPrintJobs = await db.PrintQueues.CountAsync(p => p.Status == PrintStatus.Pending, ct);

        var recentInvoices = await db.Invoices
            .Include(i => i.Customer)
            .Where(i => i.InvoiceType == InvoiceType.Sale)
            .OrderByDescending(i => i.InvoiceDate)
            .Take(5)
            .Select(i => new DashboardInvoiceDto
            {
                InvoiceNumber = i.InvoiceNumber,
                CustomerName = i.Customer != null ? $"{i.Customer.FirstName} {i.Customer.LastName}" : "Walk-in",
                TotalAmount = i.TotalAmount,
                Status = i.Status,
                InvoiceDate = i.InvoiceDate
            })
            .AsNoTracking()
            .ToListAsync(ct);

        return OkResult(new DashboardDto
        {
            TodaySales = todaySales,
            MonthSales = monthSales,
            TotalItems = totalItems,
            InStockItems = inStockItems,
            TotalCustomers = totalCustomers,
            PendingRepairs = pendingRepairs,
            PendingPrintJobs = pendingPrintJobs,
            TodayGoldWeightSold = todayGoldWeightSold,
            MonthGoldWeightSold = monthGoldWeightSold,
            GoldStockWeight = goldStockWeight,
            SilverStockWeight = silverStockWeight,
            TodayOldGoldWeight = todayOldGoldWeight,
            RecentInvoices = recentInvoices
        });
    }

    // ---- Excel exports (Phase 3) ----

    /// <summary>Export the sales report for a date range as an .xlsx workbook</summary>
    [HttpGet("sales/export")]
    public async Task<IActionResult> ExportSales([FromQuery] ReportFilterRequest filter, CancellationToken ct)
    {
        var db = await _contextAccessor.GetContextAsync(ct);
        var fromDate = filter.FromDate ?? DateTime.UtcNow.Date.AddDays(-30);
        var toDate = filter.ToDate ?? DateTime.UtcNow.Date.AddDays(1);

        var invoices = await db.Invoices
            .Include(i => i.Customer)
            .Where(i => i.InvoiceType == InvoiceType.Sale &&
                i.Status != InvoiceStatus.Cancelled &&
                i.InvoiceDate >= fromDate && i.InvoiceDate <= toDate)
            .OrderBy(i => i.InvoiceDate)
            .AsNoTracking()
            .ToListAsync(ct);

        var headers = new[] { "Invoice #", "Date", "Customer", "SubTotal", "Discount", "Tax", "Total", "Paid", "Balance", "Status" };
        var rows = invoices.Select(i => (IReadOnlyList<object?>)new object?[]
        {
            i.InvoiceNumber, i.InvoiceDate, i.Customer != null ? $"{i.Customer.FirstName} {i.Customer.LastName}".Trim() : "Walk-in",
            i.SubTotal, i.TotalDiscount, i.TotalTax, i.TotalAmount, i.PaidAmount, i.BalanceAmount, i.Status.ToString()
        });

        var bytes = _excelExport.Export("Sales Report", headers, rows);
        return File(bytes, XlsxContentType, $"SalesReport_{fromDate:yyyyMMdd}-{toDate:yyyyMMdd}.xlsx");
    }

    /// <summary>Export current inventory as an .xlsx workbook</summary>
    [HttpGet("inventory/export")]
    public async Task<IActionResult> ExportInventory(CancellationToken ct)
    {
        var db = await _contextAccessor.GetContextAsync(ct);
        var items = await db.JewelleryItems
            .Include(i => i.Category).Include(i => i.Metal).Include(i => i.Purity).Include(i => i.Supplier)
            .Where(i => i.IsActive)
            .OrderBy(i => i.SKU)
            .AsNoTracking()
            .ToListAsync(ct);

        var headers = new[] { "SKU", "Name", "Category", "Metal", "Purity", "Gross Wt (g)", "Net Wt (g)", "Metal Rate", "Selling Price", "Qty In Stock", "Location", "Supplier", "Sold" };
        var rows = items.Select(i => (IReadOnlyList<object?>)new object?[]
        {
            i.SKU, i.Name, i.Category?.Name, i.Metal?.Name, i.Purity?.Name,
            i.GrossWeight, i.NetWeight, i.MetalRate, i.SellingPrice, i.QuantityInStock, i.Location, i.Supplier?.Name, i.IsSold
        });

        var bytes = _excelExport.Export("Inventory", headers, rows);
        return File(bytes, XlsxContentType, $"InventoryReport_{DateTime.UtcNow:yyyyMMdd}.xlsx");
    }

    /// <summary>Export metal rate history as an .xlsx workbook</summary>
    [HttpGet("metal-rates/export")]
    public async Task<IActionResult> ExportMetalRates([FromQuery] Guid? metalId, [FromQuery] int days = 90, CancellationToken ct = default)
    {
        var db = await _contextAccessor.GetContextAsync(ct);
        var fromDate = DateTime.UtcNow.Date.AddDays(-days);
        var query = db.MetalRates.Include(r => r.Metal).Include(r => r.Purity)
            .Where(r => r.RateDate >= fromDate).AsNoTracking();
        if (metalId.HasValue) query = query.Where(r => r.MetalId == metalId.Value);

        var rates = await query.OrderByDescending(r => r.RateDate).ToListAsync(ct);

        var headers = new[] { "Date", "Metal", "Purity", "Rate/g", "Rate/Tola", "Previous Rate", "Source", "Updated By", "Items Repriced" };
        var rows = rates.Select(r => (IReadOnlyList<object?>)new object?[]
        {
            r.RateDate, r.Metal?.Name, r.Purity?.Name, r.RatePerGram, r.RatePerTola, r.PreviousRate, r.Source, r.UpdatedByUserName, r.ItemsRepriced
        });

        var bytes = _excelExport.Export("Metal Rates", headers, rows);
        return File(bytes, XlsxContentType, $"MetalRateHistory_{DateTime.UtcNow:yyyyMMdd}.xlsx");
    }

    /// <summary>Export the audit log as an .xlsx workbook</summary>
    [HttpGet("audit/export")]
    public async Task<IActionResult> ExportAudit(
        [FromQuery] DateTime? fromDate, [FromQuery] DateTime? toDate,
        [FromQuery] string? entityType, [FromQuery] string? userId,
        CancellationToken ct = default)
    {
        var db = await _contextAccessor.GetContextAsync(ct);
        var query = db.AuditLogs.AsNoTracking();

        if (fromDate.HasValue) query = query.Where(a => a.Timestamp >= fromDate);
        if (toDate.HasValue) query = query.Where(a => a.Timestamp <= toDate);
        if (!string.IsNullOrEmpty(entityType)) query = query.Where(a => a.EntityType == entityType);
        if (!string.IsNullOrEmpty(userId)) query = query.Where(a => a.UserId == userId);

        var logs = await query.OrderByDescending(a => a.Timestamp).Take(5000).ToListAsync(ct);

        var headers = new[] { "Timestamp", "Entity Type", "Entity Id", "Action", "User", "Changed Properties", "Additional Info" };
        var rows = logs.Select(a => (IReadOnlyList<object?>)new object?[]
        {
            a.Timestamp, a.EntityType, a.EntityId, a.Action, a.UserName, a.ChangedProperties, a.AdditionalInfo
        });

        var bytes = _excelExport.Export("Audit Log", headers, rows);
        return File(bytes, XlsxContentType, $"AuditLog_{DateTime.UtcNow:yyyyMMdd}.xlsx");
    }
}
