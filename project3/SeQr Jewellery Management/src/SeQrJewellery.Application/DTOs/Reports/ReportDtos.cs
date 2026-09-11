using SeQrJewellery.Domain.Enums;

namespace SeQrJewellery.Application.DTOs.Reports;

public class SalesReportDto
{
    public DateTime FromDate { get; set; }
    public DateTime ToDate { get; set; }
    public int TotalInvoices { get; set; }
    public decimal TotalSalesAmount { get; set; }
    public decimal TotalTaxCollected { get; set; }
    public decimal TotalDiscount { get; set; }
    public decimal TotalWeight { get; set; }
    public IEnumerable<SalesByDayDto> SalesByDay { get; set; } = Enumerable.Empty<SalesByDayDto>();
    public IEnumerable<SalesByCategoryDto> SalesByCategory { get; set; } = Enumerable.Empty<SalesByCategoryDto>();
    public IEnumerable<SalesByMetalDto> SalesByMetal { get; set; } = Enumerable.Empty<SalesByMetalDto>();
    public IEnumerable<TopCustomerDto> TopCustomers { get; set; } = Enumerable.Empty<TopCustomerDto>();
}

public class SalesByDayDto
{
    public DateTime Date { get; set; }
    public int InvoiceCount { get; set; }
    public decimal Amount { get; set; }
    public decimal GoldWeight { get; set; }
}

public class SalesByCategoryDto
{
    public string CategoryName { get; set; } = string.Empty;
    public int ItemCount { get; set; }
    public decimal TotalAmount { get; set; }
    public decimal Percentage { get; set; }
}

public class SalesByMetalDto
{
    public string MetalName { get; set; } = string.Empty;
    public decimal TotalWeight { get; set; }
    public decimal TotalAmount { get; set; }
}

public class TopCustomerDto
{
    public string CustomerName { get; set; } = string.Empty;
    public int PurchaseCount { get; set; }
    public decimal TotalAmount { get; set; }
}

public class InventoryReportDto
{
    public int TotalItems { get; set; }
    public int TotalInStockItems { get; set; }
    public int TotalOutOfStockItems { get; set; }
    public decimal TotalStockValue { get; set; }
    public decimal TotalGoldWeight { get; set; }
    public decimal TotalSilverWeight { get; set; }
    public IEnumerable<InventoryByCategoryDto> ByCategory { get; set; } = Enumerable.Empty<InventoryByCategoryDto>();
    public IEnumerable<InventoryByMetalDto> ByMetal { get; set; } = Enumerable.Empty<InventoryByMetalDto>();
    public IEnumerable<LowStockItemDto> LowStockItems { get; set; } = Enumerable.Empty<LowStockItemDto>();
}

public class InventoryByCategoryDto
{
    public string CategoryName { get; set; } = string.Empty;
    public int ItemCount { get; set; }
    public decimal StockValue { get; set; }
    public decimal TotalWeight { get; set; }
}

public class InventoryByMetalDto
{
    public string MetalName { get; set; } = string.Empty;
    public string PurityName { get; set; } = string.Empty;
    public int ItemCount { get; set; }
    public decimal TotalWeight { get; set; }
    public decimal StockValue { get; set; }
}

public class LowStockItemDto
{
    public Guid Id { get; set; }
    public string SKU { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public int QuantityInStock { get; set; }
    public int ReorderLevel { get; set; }
}

public class ReportFilterRequest
{
    public DateTime? FromDate { get; set; }
    public DateTime? ToDate { get; set; }
    public Guid? CategoryId { get; set; }
    public Guid? MetalId { get; set; }
    public Guid? SupplierId { get; set; }
    public Guid? CustomerId { get; set; }
}

public class DashboardDto
{
    public decimal TodaySales { get; set; }
    public decimal MonthSales { get; set; }
    public int TotalItems { get; set; }
    public int InStockItems { get; set; }
    public int TotalCustomers { get; set; }
    public int PendingRepairs { get; set; }
    public int PendingPrintJobs { get; set; }
    public decimal TodayGoldWeightSold { get; set; }
    public decimal MonthGoldWeightSold { get; set; }
    public decimal GoldStockWeight { get; set; }
    public decimal SilverStockWeight { get; set; }
    public decimal TodayOldGoldWeight { get; set; }
    public IEnumerable<DashboardInvoiceDto> RecentInvoices { get; set; } = Enumerable.Empty<DashboardInvoiceDto>();
}

public class DashboardInvoiceDto
{
    public string InvoiceNumber { get; set; } = string.Empty;
    public string CustomerName { get; set; } = string.Empty;
    public decimal TotalAmount { get; set; }
    public InvoiceStatus Status { get; set; }
    public DateTime InvoiceDate { get; set; }
}
