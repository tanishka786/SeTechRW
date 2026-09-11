using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SeQrJewellery.Application.DTOs.Common;
using SeQrJewellery.Application.DTOs.Invoice;
using SeQrJewellery.Application.Interfaces;
using SeQrJewellery.Domain.Entities.Tenant;
using SeQrJewellery.Domain.Enums;
using SeQrJewellery.Infrastructure.Data;

namespace SeQrJewellery.API.Controllers;

/// <summary>Invoice and sales management</summary>
[Authorize]
public class InvoicesController : BaseController
{
    private const string XlsxContentType = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

    private readonly TenantDbContextAccessor _contextAccessor;
    private readonly IExcelExportService _excelExport;
    private readonly IInvoicePdfService _pdfService;
    private readonly Services.IMediaFileStorage _mediaStorage;

    public InvoicesController(
        TenantDbContextAccessor contextAccessor,
        IExcelExportService excelExport,
        IInvoicePdfService pdfService,
        Services.IMediaFileStorage mediaStorage)
    {
        _contextAccessor = contextAccessor;
        _excelExport = excelExport;
        _pdfService = pdfService;
        _mediaStorage = mediaStorage;
    }

    /// <summary>Get paginated invoices with filters</summary>
    [HttpGet]
    public async Task<IActionResult> GetAll([FromQuery] InvoiceFilterRequest filter, CancellationToken ct)
    {
        var db = await _contextAccessor.GetContextAsync(ct);
        var query = db.Invoices
            .Include(i => i.Customer)
            .Include(i => i.Supplier)
            .AsNoTracking();

        if (!string.IsNullOrWhiteSpace(filter.SearchTerm))
        {
            var term = filter.SearchTerm.ToLower();
            query = query.Where(i => i.InvoiceNumber.ToLower().Contains(term) ||
                (i.Customer != null && (i.Customer.FirstName + " " + i.Customer.LastName).ToLower().Contains(term)));
        }

        if (filter.InvoiceType.HasValue) query = query.Where(i => i.InvoiceType == filter.InvoiceType);
        if (filter.Status.HasValue) query = query.Where(i => i.Status == filter.Status);
        if (filter.CustomerId.HasValue) query = query.Where(i => i.CustomerId == filter.CustomerId);
        if (filter.FromDate.HasValue) query = query.Where(i => i.InvoiceDate >= filter.FromDate);
        if (filter.ToDate.HasValue) query = query.Where(i => i.InvoiceDate <= filter.ToDate);

        var total = await query.CountAsync(ct);
        var invoices = await query.OrderByDescending(i => i.InvoiceDate)
            .Skip((filter.PageNumber - 1) * filter.PageSize).Take(filter.PageSize).ToListAsync(ct);

        return OkResult(new PagedResult<InvoiceDto>
        {
            Items = invoices.Select(MapToDto),
            TotalCount = total,
            PageNumber = filter.PageNumber,
            PageSize = filter.PageSize
        });
    }

    /// <summary>Get invoice by ID with full details</summary>
    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetById(Guid id, CancellationToken ct)
    {
        var db = await _contextAccessor.GetContextAsync(ct);
        var invoice = await db.Invoices
            .Include(i => i.Customer)
            .Include(i => i.Supplier)
            .Include(i => i.Items).ThenInclude(item => item.JewelleryItem)
            .Include(i => i.Payments)
            .AsNoTracking()
            .FirstOrDefaultAsync(i => i.Id == id, ct);

        return invoice is null ? NotFoundResult($"Invoice {id} not found.") : OkResult(MapToDto(invoice));
    }

    /// <summary>Create a new invoice (sale, purchase, etc.)</summary>
    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateInvoiceRequest request, CancellationToken ct)
    {
        var db = await _contextAccessor.GetContextAsync(ct);

        var invoiceNumber = await GenerateInvoiceNumberAsync(db, request.InvoiceType, ct);

        var invoice = new Invoice
        {
            InvoiceNumber = invoiceNumber,
            InvoiceType = request.InvoiceType,
            Status = InvoiceStatus.Draft,
            InvoiceDate = request.InvoiceDate,
            DueDate = request.DueDate,
            CustomerId = request.CustomerId,
            SupplierId = request.SupplierId,
            OldGoldAmount = request.OldGoldAmount,
            OldGoldWeight = request.OldGoldWeight,
            IsIGST = request.IsIGST,
            Notes = request.Notes,
            Terms = request.Terms
        };

        foreach (var itemReq in request.Items)
        {
            var jewelleryItem = await db.JewelleryItems
                .Include(i => i.Metal).Include(i => i.Purity)
                .FirstOrDefaultAsync(i => i.Id == itemReq.JewelleryItemId, ct);

            if (jewelleryItem is null)
                return BadRequestResult($"Jewellery item {itemReq.JewelleryItemId} not found.");

            if (request.InvoiceType == InvoiceType.Sale && jewelleryItem.QuantityInStock < itemReq.Quantity)
                return BadRequestResult($"Insufficient stock for item {jewelleryItem.SKU}. Available: {jewelleryItem.QuantityInStock}");

            var unitPrice = itemReq.OverridePrice ?? jewelleryItem.SellingPrice;
            var discount = itemReq.Discount ?? jewelleryItem.Discount;
            var taxAmount = (unitPrice - discount) * jewelleryItem.TaxPercent / 100;

            var lineItem = new InvoiceItem
            {
                InvoiceId = invoice.Id,
                JewelleryItemId = itemReq.JewelleryItemId,
                TagValue = itemReq.TagValue,
                Quantity = itemReq.Quantity,
                GrossWeight = jewelleryItem.GrossWeight,
                NetWeight = jewelleryItem.NetWeight,
                StoneWeight = jewelleryItem.StoneWeight,
                MetalRate = jewelleryItem.MetalRate,
                MetalValue = jewelleryItem.MetalValue,
                MakingCharges = jewelleryItem.MakingCharges,
                StoneCharges = jewelleryItem.StoneCharges,
                OtherCharges = jewelleryItem.OtherCharges,
                Discount = discount,
                TaxPercent = jewelleryItem.TaxPercent,
                TaxAmount = taxAmount * itemReq.Quantity,
                UnitPrice = unitPrice,
                TotalPrice = (unitPrice + taxAmount - discount) * itemReq.Quantity
            };

            invoice.Items.Add(lineItem);
        }

        // Calculate invoice totals
        invoice.SubTotal = invoice.Items.Sum(i => i.UnitPrice * i.Quantity);
        invoice.TotalDiscount = invoice.Items.Sum(i => i.Discount * i.Quantity);
        invoice.TotalTax = invoice.Items.Sum(i => i.TaxAmount);
        invoice.TotalAmount = invoice.Items.Sum(i => i.TotalPrice);

        if (!request.IsIGST)
        {
            invoice.CGST = invoice.TotalTax / 2;
            invoice.SGST = invoice.TotalTax / 2;
        }
        else
        {
            invoice.IGST = invoice.TotalTax;
        }

        // Handle payments
        if (request.Payments?.Any() == true)
        {
            foreach (var paymentReq in request.Payments)
            {
                var payment = new Payment
                {
                    InvoiceId = invoice.Id,
                    PaymentMethod = paymentReq.PaymentMethod,
                    Amount = paymentReq.Amount,
                    PaymentDate = DateTime.UtcNow,
                    TransactionReference = paymentReq.TransactionReference,
                    ChequeNumber = paymentReq.ChequeNumber,
                    BankName = paymentReq.BankName,
                    CardLast4 = paymentReq.CardLast4,
                    UPITransactionId = paymentReq.UPITransactionId,
                    OldGoldWeight = paymentReq.OldGoldWeight,
                    OldGoldPurity = paymentReq.OldGoldPurity,
                    OldGoldRate = paymentReq.OldGoldRate,
                    Notes = paymentReq.Notes
                };
                invoice.Payments.Add(payment);
            }
        }

        var totalPaid = invoice.Payments.Sum(p => p.Amount) + invoice.OldGoldAmount;
        invoice.PaidAmount = totalPaid;
        invoice.BalanceAmount = invoice.TotalAmount - totalPaid;
        invoice.Status = invoice.BalanceAmount <= 0 ? InvoiceStatus.Paid
            : totalPaid > 0 ? InvoiceStatus.PartiallyPaid
            : InvoiceStatus.Confirmed;

        await db.Invoices.AddAsync(invoice, ct);

        // Update stock for sales
        if (request.InvoiceType == InvoiceType.Sale)
        {
            foreach (var lineItem in invoice.Items)
            {
                var item = await db.JewelleryItems.FindAsync([lineItem.JewelleryItemId], cancellationToken: ct);
                if (item != null)
                {
                    var before = item.QuantityInStock;
                    item.QuantityInStock -= lineItem.Quantity;
                    item.LastSoldDate = DateTime.UtcNow;
                    if (item.QuantityInStock <= 0)
                    {
                        item.IsSold = true;
                        item.SoldAt = DateTime.UtcNow;
                    }

                    await db.StockMovements.AddAsync(new StockMovement
                    {
                        JewelleryItemId = item.Id,
                        MovementType = StockMovementType.Sale,
                        QuantityBefore = before,
                        QuantityChange = -lineItem.Quantity,
                        QuantityAfter = item.QuantityInStock,
                        ReferenceType = "Invoice",
                        ReferenceId = invoice.Id,
                        Notes = $"Sale - Invoice {invoiceNumber}",
                        MovedBy = "system"
                    }, ct);
                }
            }

            // Update customer stats
            if (request.CustomerId.HasValue)
            {
                var customer = await db.Customers.FindAsync([request.CustomerId.Value], cancellationToken: ct);
                if (customer != null)
                {
                    customer.TotalPurchaseAmount += invoice.TotalAmount;
                    customer.TotalPurchaseCount++;
                    customer.LastPurchaseDate = DateTime.UtcNow;
                    customer.LoyaltyPoints += Math.Floor(invoice.TotalAmount / 1000);
                }
            }
        }

        await db.SaveChangesAsync(ct);
        return CreatedResult(MapToDto(invoice), "Invoice created successfully.");
    }

    /// <summary>Add payment to an existing invoice</summary>
    [HttpPost("{id:guid}/payments")]
    public async Task<IActionResult> AddPayment(Guid id, [FromBody] CreatePaymentRequest request, CancellationToken ct)
    {
        var db = await _contextAccessor.GetContextAsync(ct);
        var invoice = await db.Invoices
            .Include(i => i.Payments)
            .Include(i => i.Customer)
            .Include(i => i.Items).ThenInclude(item => item.JewelleryItem)
            .FirstOrDefaultAsync(i => i.Id == id, ct);
        if (invoice is null) return NotFoundResult($"Invoice {id} not found.");
        if (invoice.Status == InvoiceStatus.Cancelled)
            return BadRequestResult("Cannot add payment to a cancelled invoice.");
        if (request.Amount <= 0)
            return BadRequestResult("Payment amount must be greater than zero.");

        var payment = new Payment
        {
            InvoiceId = id,
            PaymentMethod = request.PaymentMethod,
            Amount = request.Amount,
            PaymentDate = request.PaymentDate?.ToUniversalTime() ?? DateTime.UtcNow,
            TransactionReference = request.TransactionReference,
            ChequeNumber = request.ChequeNumber,
            BankName = request.BankName,
            CardLast4 = request.CardLast4,
            UPITransactionId = request.UPITransactionId,
            OldGoldWeight = request.OldGoldWeight ?? 0,
            OldGoldPurity = request.OldGoldPurity ?? 0,
            OldGoldRate = request.OldGoldRate ?? 0,
            Notes = request.Notes
        };

        invoice.Payments.Add(payment);
        invoice.PaidAmount += request.Amount;
        invoice.BalanceAmount = invoice.TotalAmount - invoice.PaidAmount;
        if (invoice.BalanceAmount < 0) invoice.BalanceAmount = 0;

        if (request.StatusOverride.HasValue &&
            request.StatusOverride is InvoiceStatus.Paid or InvoiceStatus.PartiallyPaid or InvoiceStatus.Confirmed)
        {
            invoice.Status = request.StatusOverride.Value;
            if (request.StatusOverride == InvoiceStatus.Paid)
            {
                invoice.PaidAmount = invoice.TotalAmount;
                invoice.BalanceAmount = 0;
            }
        }
        else
        {
            invoice.Status = invoice.BalanceAmount <= 0
                ? InvoiceStatus.Paid
                : invoice.PaidAmount > 0 ? InvoiceStatus.PartiallyPaid : InvoiceStatus.Confirmed;
        }

        await db.SaveChangesAsync(ct);
        return OkResult(MapToDto(invoice), "Payment recorded.");
    }

    /// <summary>Manually update invoice payment status (e.g. mark as Paid after cash settlement).</summary>
    [HttpPatch("{id:guid}/status")]
    public async Task<IActionResult> UpdateStatus(Guid id, [FromBody] UpdateInvoiceStatusRequest request, CancellationToken ct)
    {
        var db = await _contextAccessor.GetContextAsync(ct);
        var invoice = await db.Invoices
            .Include(i => i.Payments)
            .Include(i => i.Customer)
            .Include(i => i.Items).ThenInclude(item => item.JewelleryItem)
            .FirstOrDefaultAsync(i => i.Id == id, ct);
        if (invoice is null) return NotFoundResult($"Invoice {id} not found.");

        var allowed = new[] { InvoiceStatus.Confirmed, InvoiceStatus.PartiallyPaid, InvoiceStatus.Paid, InvoiceStatus.Cancelled };
        if (!allowed.Contains(request.Status))
            return BadRequestResult("Status must be Confirmed, PartiallyPaid, Paid, or Cancelled.");

        invoice.Status = request.Status;
        if (request.Status == InvoiceStatus.Paid)
        {
            invoice.PaidAmount = invoice.TotalAmount;
            invoice.BalanceAmount = 0;
        }
        else if (request.Status == InvoiceStatus.Confirmed && invoice.PaidAmount <= 0)
        {
            invoice.BalanceAmount = invoice.TotalAmount;
        }
        else
        {
            invoice.BalanceAmount = Math.Max(0, invoice.TotalAmount - invoice.PaidAmount);
        }

        if (!string.IsNullOrWhiteSpace(request.Notes))
            invoice.Notes = string.IsNullOrWhiteSpace(invoice.Notes)
                ? request.Notes
                : $"{invoice.Notes}\n{request.Notes}";

        await db.SaveChangesAsync(ct);
        return OkResult(MapToDto(invoice), "Invoice status updated.");
    }

    /// <summary>Cancel an invoice</summary>
    [HttpPost("{id:guid}/cancel")]
    public async Task<IActionResult> Cancel(Guid id, CancellationToken ct)
    {
        var db = await _contextAccessor.GetContextAsync(ct);
        var invoice = await db.Invoices.Include(i => i.Items).FirstOrDefaultAsync(i => i.Id == id, ct);
        if (invoice is null) return NotFoundResult($"Invoice {id} not found.");
        if (invoice.Status == InvoiceStatus.Cancelled) return BadRequestResult("Invoice is already cancelled.");

        invoice.Status = InvoiceStatus.Cancelled;

        // Reverse stock for sales
        if (invoice.InvoiceType == InvoiceType.Sale)
        {
            foreach (var lineItem in invoice.Items)
            {
                var item = await db.JewelleryItems.FindAsync([lineItem.JewelleryItemId], cancellationToken: ct);
                if (item != null)
                {
                    var before = item.QuantityInStock;
                    item.QuantityInStock += lineItem.Quantity;
                    if (item.QuantityInStock > 0)
                    {
                        item.IsSold = false;
                        item.SoldAt = null;
                    }

                    await db.StockMovements.AddAsync(new StockMovement
                    {
                        JewelleryItemId = item.Id,
                        MovementType = StockMovementType.Return,
                        QuantityBefore = before,
                        QuantityChange = lineItem.Quantity,
                        QuantityAfter = item.QuantityInStock,
                        ReferenceType = "Invoice",
                        ReferenceId = invoice.Id,
                        Notes = $"Invoice Cancellation - {invoice.InvoiceNumber}",
                        MovedBy = "system"
                    }, ct);
                }
            }
        }

        await db.SaveChangesAsync(ct);
        return OkResult(MapToDto(invoice), "Invoice cancelled.");
    }

    /// <summary>Export the filtered invoice list as an .xlsx workbook</summary>
    [HttpGet("export")]
    public async Task<IActionResult> Export([FromQuery] InvoiceFilterRequest filter, CancellationToken ct)
    {
        var db = await _contextAccessor.GetContextAsync(ct);
        var query = db.Invoices.Include(i => i.Customer).Include(i => i.Supplier).AsNoTracking();

        if (!string.IsNullOrWhiteSpace(filter.SearchTerm))
        {
            var term = filter.SearchTerm.ToLower();
            query = query.Where(i => i.InvoiceNumber.ToLower().Contains(term) ||
                (i.Customer != null && (i.Customer.FirstName + " " + i.Customer.LastName).ToLower().Contains(term)));
        }
        if (filter.InvoiceType.HasValue) query = query.Where(i => i.InvoiceType == filter.InvoiceType);
        if (filter.Status.HasValue) query = query.Where(i => i.Status == filter.Status);
        if (filter.CustomerId.HasValue) query = query.Where(i => i.CustomerId == filter.CustomerId);
        if (filter.FromDate.HasValue) query = query.Where(i => i.InvoiceDate >= filter.FromDate);
        if (filter.ToDate.HasValue) query = query.Where(i => i.InvoiceDate <= filter.ToDate);

        var invoices = await query.OrderByDescending(i => i.InvoiceDate).Take(10000).ToListAsync(ct);

        var headers = new[] { "Invoice #", "Type", "Date", "Customer", "Phone", "SubTotal", "Discount", "Tax", "Total", "Paid", "Balance", "Status" };
        var rows = invoices.Select(i => (IReadOnlyList<object?>)new object?[]
        {
            i.InvoiceNumber, i.InvoiceType.ToString(), i.InvoiceDate,
            i.Customer != null ? $"{i.Customer.FirstName} {i.Customer.LastName}".Trim() : "Walk-in", i.Customer?.Phone,
            i.SubTotal, i.TotalDiscount, i.TotalTax, i.TotalAmount, i.PaidAmount, i.BalanceAmount, i.Status.ToString()
        });

        var bytes = _excelExport.Export("Invoices", headers, rows);
        return File(bytes, XlsxContentType, $"Invoices_{DateTime.UtcNow:yyyyMMdd}.xlsx");
    }

    /// <summary>Generate and download the Indian GST tax invoice PDF; marks the invoice as printed.</summary>
    [HttpGet("{id:guid}/pdf")]
    public async Task<IActionResult> DownloadPdf(Guid id, CancellationToken ct)
    {
        var db = await _contextAccessor.GetContextAsync(ct);
        var invoice = await db.Invoices
            .Include(i => i.Customer)
            .Include(i => i.Supplier)
            .Include(i => i.Items).ThenInclude(item => item.JewelleryItem)
            .FirstOrDefaultAsync(i => i.Id == id, ct);
        if (invoice is null) return NotFoundResult($"Invoice {id} not found.");

        var settings = await db.InvoiceSettings.AsNoTracking().FirstOrDefaultAsync(ct);
        byte[]? logoBytes = null;
        if (settings?.ShowLogo == true && !string.IsNullOrWhiteSpace(settings.LogoPath))
        {
            var physical = _mediaStorage.GetPhysicalPath(settings.LogoPath);
            if (physical != null && System.IO.File.Exists(physical))
                logoBytes = await System.IO.File.ReadAllBytesAsync(physical, ct);
        }

        var pdfBytes = _pdfService.GenerateInvoicePdf(invoice, settings, logoBytes);

        invoice.IsPrinted = true;
        invoice.PrintedAt = DateTime.UtcNow;
        await db.SaveChangesAsync(ct);

        return File(pdfBytes, "application/pdf", $"Invoice_{invoice.InvoiceNumber}.pdf");
    }

    private static async Task<string> GenerateInvoiceNumberAsync(TenantDbContext db, InvoiceType type, CancellationToken ct)
    {
        var prefix = type switch
        {
            InvoiceType.Sale => "INV",
            InvoiceType.Purchase => "PUR",
            InvoiceType.Return => "RET",
            InvoiceType.Repair => "REP",
            InvoiceType.Consignment => "CON",
            _ => "DOC"
        };
        var count = await db.Invoices.IgnoreQueryFilters().CountAsync(i => i.InvoiceType == type, ct);
        var year = DateTime.UtcNow.Year.ToString()[2..];
        return $"{prefix}{year}-{(count + 1):D5}";
    }

    private static InvoiceDto MapToDto(Invoice i) => new()
    {
        Id = i.Id,
        InvoiceNumber = i.InvoiceNumber,
        InvoiceType = i.InvoiceType,
        Status = i.Status,
        InvoiceDate = i.InvoiceDate,
        DueDate = i.DueDate,
        CustomerId = i.CustomerId,
        CustomerName = i.Customer != null ? $"{i.Customer.FirstName} {i.Customer.LastName}" : null,
        CustomerPhone = i.Customer?.Phone,
        SupplierId = i.SupplierId,
        SupplierName = i.Supplier?.Name,
        SubTotal = i.SubTotal,
        TotalDiscount = i.TotalDiscount,
        TotalTax = i.TotalTax,
        TotalAmount = i.TotalAmount,
        PaidAmount = i.PaidAmount,
        BalanceAmount = i.BalanceAmount,
        OldGoldAmount = i.OldGoldAmount,
        CGST = i.CGST,
        SGST = i.SGST,
        IGST = i.IGST,
        Notes = i.Notes,
        Items = i.Items.Select(item => new InvoiceItemDto
        {
            Id = item.Id,
            JewelleryItemId = item.JewelleryItemId,
            SKU = item.JewelleryItem?.SKU ?? "",
            ItemName = item.JewelleryItem?.Name ?? "",
            TagValue = item.TagValue,
            Quantity = item.Quantity,
            GrossWeight = item.GrossWeight,
            NetWeight = item.NetWeight,
            MetalRate = item.MetalRate,
            MetalValue = item.MetalValue,
            MakingCharges = item.MakingCharges,
            StoneCharges = item.StoneCharges,
            Discount = item.Discount,
            TaxPercent = item.TaxPercent,
            TaxAmount = item.TaxAmount,
            UnitPrice = item.UnitPrice,
            TotalPrice = item.TotalPrice
        }),
        Payments = i.Payments.Select(p => new PaymentDto
        {
            Id = p.Id,
            PaymentMethod = p.PaymentMethod,
            Amount = p.Amount,
            PaymentDate = p.PaymentDate,
            TransactionReference = p.TransactionReference,
            ChequeNumber = p.ChequeNumber,
            BankName = p.BankName,
            CardLast4 = p.CardLast4,
            UPITransactionId = p.UPITransactionId,
            Notes = p.Notes,
            IsRefunded = p.IsRefunded
        }),
        CreatedAt = i.CreatedAt
    };
}
