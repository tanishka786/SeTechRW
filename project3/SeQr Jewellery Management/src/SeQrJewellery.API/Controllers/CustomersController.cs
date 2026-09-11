using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SeQrJewellery.Application.DTOs.Common;
using SeQrJewellery.Application.DTOs.Customer;
using SeQrJewellery.Application.Interfaces;
using SeQrJewellery.Domain.Entities.Tenant;
using SeQrJewellery.Infrastructure.Data;

namespace SeQrJewellery.API.Controllers;

/// <summary>Customer management</summary>
[Authorize]
public class CustomersController : BaseController
{
    private const string XlsxContentType = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

    private readonly TenantDbContextAccessor _contextAccessor;
    private readonly IExcelExportService _excelExport;

    public CustomersController(TenantDbContextAccessor contextAccessor, IExcelExportService excelExport)
    {
        _contextAccessor = contextAccessor;
        _excelExport = excelExport;
    }

    /// <summary>Get all customers with optional search</summary>
    [HttpGet]
    public async Task<IActionResult> GetAll([FromQuery] string? search, [FromQuery] int page = 1, [FromQuery] int pageSize = 20, CancellationToken ct = default)
    {
        var db = await _contextAccessor.GetContextAsync(ct);
        var query = db.Customers.AsNoTracking();

        if (!string.IsNullOrWhiteSpace(search))
        {
            var term = search.ToLower();
            query = query.Where(c => c.FirstName.ToLower().Contains(term) ||
                c.LastName.ToLower().Contains(term) ||
                c.CustomerCode.ToLower().Contains(term) ||
                (c.Phone != null && c.Phone.Contains(search)) ||
                (c.Email != null && c.Email.ToLower().Contains(term)));
        }

        var total = await query.CountAsync(ct);
        var customers = await query.OrderByDescending(c => c.CreatedAt)
            .Skip((page - 1) * pageSize).Take(pageSize).ToListAsync(ct);

        return OkResult(new PagedResult<CustomerDto>
        {
            Items = customers.Select(MapToDto),
            TotalCount = total,
            PageNumber = page,
            PageSize = pageSize
        });
    }

    /// <summary>Get customer by ID</summary>
    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetById(Guid id, CancellationToken ct)
    {
        var db = await _contextAccessor.GetContextAsync(ct);
        var customer = await db.Customers.AsNoTracking().FirstOrDefaultAsync(c => c.Id == id, ct);
        return customer is null ? NotFoundResult($"Customer {id} not found.") : OkResult(MapToDto(customer));
    }

    /// <summary>Create a new customer</summary>
    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateCustomerRequest request, CancellationToken ct)
    {
        var db = await _contextAccessor.GetContextAsync(ct);
        var code = await GenerateCustomerCodeAsync(db, ct);

        var customer = new Customer
        {
            CustomerCode = code,
            FirstName = request.FirstName,
            LastName = request.LastName ?? "",
            Email = request.Email,
            Phone = request.Phone,
            AlternatePhone = request.AlternatePhone,
            DateOfBirth = request.DateOfBirth,
            Anniversary = request.Anniversary,
            Gender = request.Gender,
            CustomerType = request.CustomerType,
            PAN = request.PAN,
            AadhaarNumber = request.AadhaarNumber,
            GST = request.GST,
            CreditLimit = request.CreditLimit,
            Address = request.Address,
            City = request.City,
            State = request.State,
            Country = request.Country ?? "India",
            PostalCode = request.PostalCode,
            Notes = request.Notes,
            ReferredBy = request.ReferredBy
        };

        await db.Customers.AddAsync(customer, ct);
        await db.SaveChangesAsync(ct);
        return CreatedResult(MapToDto(customer), "Customer created successfully.");
    }

    /// <summary>Update customer</summary>
    [HttpPut("{id:guid}")]
    public async Task<IActionResult> Update(Guid id, [FromBody] UpdateCustomerRequest request, CancellationToken ct)
    {
        var db = await _contextAccessor.GetContextAsync(ct);
        var customer = await db.Customers.FindAsync([id], cancellationToken: ct);
        if (customer is null) return NotFoundResult($"Customer {id} not found.");

        if (request.FirstName != null) customer.FirstName = request.FirstName;
        if (request.LastName != null) customer.LastName = request.LastName;
        if (request.Email != null) customer.Email = request.Email;
        if (request.Phone != null) customer.Phone = request.Phone;
        if (request.AlternatePhone != null) customer.AlternatePhone = request.AlternatePhone;
        if (request.DateOfBirth.HasValue) customer.DateOfBirth = request.DateOfBirth;
        if (request.Anniversary.HasValue) customer.Anniversary = request.Anniversary;
        if (request.Gender.HasValue) customer.Gender = request.Gender.Value;
        if (request.CustomerType.HasValue) customer.CustomerType = request.CustomerType.Value;
        if (request.PAN != null) customer.PAN = request.PAN;
        if (request.GST != null) customer.GST = request.GST;
        if (request.CreditLimit.HasValue) customer.CreditLimit = request.CreditLimit.Value;
        if (request.Address != null) customer.Address = request.Address;
        if (request.City != null) customer.City = request.City;
        if (request.State != null) customer.State = request.State;
        if (request.Notes != null) customer.Notes = request.Notes;

        await db.SaveChangesAsync(ct);
        return OkResult(MapToDto(customer));
    }

    /// <summary>Get customer purchase history</summary>
    [HttpGet("{id:guid}/invoices")]
    public async Task<IActionResult> GetInvoices(Guid id, CancellationToken ct)
    {
        var db = await _contextAccessor.GetContextAsync(ct);
        var invoices = await db.Invoices
            .Where(i => i.CustomerId == id)
            .Include(i => i.Items)
            .Include(i => i.Payments)
            .OrderByDescending(i => i.InvoiceDate)
            .AsNoTracking()
            .ToListAsync(ct);
        return OkResult(invoices);
    }

    /// <summary>Get customers with upcoming birthdays or anniversaries (next 30 days)</summary>
    [HttpGet("upcoming-occasions")]
    public async Task<IActionResult> GetUpcomingOccasions(CancellationToken ct)
    {
        var db = await _contextAccessor.GetContextAsync(ct);
        var today = DateTime.UtcNow.Date;
        var next30Days = today.AddDays(30);
        var todayDayOfYear = today.DayOfYear;
        var endDayOfYear = next30Days.DayOfYear;

        var customers = await db.Customers.AsNoTracking()
            .Where(c => (c.DateOfBirth.HasValue &&
                    c.DateOfBirth.Value.DayOfYear >= todayDayOfYear &&
                    c.DateOfBirth.Value.DayOfYear <= endDayOfYear) ||
                (c.Anniversary.HasValue &&
                    c.Anniversary.Value.DayOfYear >= todayDayOfYear &&
                    c.Anniversary.Value.DayOfYear <= endDayOfYear))
            .ToListAsync(ct);

        return OkResult(customers.Select(c => new
        {
            c.Id,
            Name = $"{c.FirstName} {c.LastName}",
            c.Phone,
            c.Email,
            c.DateOfBirth,
            c.Anniversary,
            UpcomingBirthday = c.DateOfBirth.HasValue ? $"{c.DateOfBirth.Value:MMM dd}" : null,
            UpcomingAnniversary = c.Anniversary.HasValue ? $"{c.Anniversary.Value:MMM dd}" : null,
            c.LoyaltyPoints
        }));
    }

    /// <summary>Export the (optionally search-filtered) customer list as an .xlsx workbook</summary>
    [HttpGet("export")]
    public async Task<IActionResult> Export([FromQuery] string? search, CancellationToken ct)
    {
        var db = await _contextAccessor.GetContextAsync(ct);
        var query = db.Customers.AsNoTracking();

        if (!string.IsNullOrWhiteSpace(search))
        {
            var term = search.ToLower();
            query = query.Where(c => c.FirstName.ToLower().Contains(term) ||
                c.LastName.ToLower().Contains(term) ||
                c.CustomerCode.ToLower().Contains(term) ||
                (c.Phone != null && c.Phone.Contains(search)) ||
                (c.Email != null && c.Email.ToLower().Contains(term)));
        }

        var customers = await query.OrderByDescending(c => c.CreatedAt).Take(10000).ToListAsync(ct);

        var headers = new[] { "Code", "Name", "Phone", "Email", "Type", "City", "State", "Total Purchases", "Purchase Count", "Loyalty Points", "Last Purchase" };
        var rows = customers.Select(c => (IReadOnlyList<object?>)new object?[]
        {
            c.CustomerCode, $"{c.FirstName} {c.LastName}".Trim(), c.Phone, c.Email, c.CustomerType.ToString(),
            c.City, c.State, c.TotalPurchaseAmount, c.TotalPurchaseCount, c.LoyaltyPoints, c.LastPurchaseDate
        });

        var bytes = _excelExport.Export("Customers", headers, rows);
        return File(bytes, XlsxContentType, $"Customers_{DateTime.UtcNow:yyyyMMdd}.xlsx");
    }

    private static async Task<string> GenerateCustomerCodeAsync(TenantDbContext db, CancellationToken ct)
    {
        var count = await db.Customers.IgnoreQueryFilters().CountAsync(ct);
        return $"CUS{(count + 1):D5}";
    }

    private static CustomerDto MapToDto(Customer c) => new()
    {
        Id = c.Id,
        CustomerCode = c.CustomerCode,
        FirstName = c.FirstName,
        LastName = c.LastName,
        FullName = $"{c.FirstName} {c.LastName}".Trim(),
        Email = c.Email,
        Phone = c.Phone,
        AlternatePhone = c.AlternatePhone,
        DateOfBirth = c.DateOfBirth,
        Anniversary = c.Anniversary,
        Gender = c.Gender,
        CustomerType = c.CustomerType,
        PAN = c.PAN,
        GST = c.GST,
        CreditLimit = c.CreditLimit,
        LoyaltyPoints = c.LoyaltyPoints,
        Address = c.Address,
        City = c.City,
        State = c.State,
        Country = c.Country,
        TotalPurchaseAmount = c.TotalPurchaseAmount,
        TotalPurchaseCount = c.TotalPurchaseCount,
        LastPurchaseDate = c.LastPurchaseDate,
        IsActive = c.IsActive,
        CreatedAt = c.CreatedAt
    };
}
