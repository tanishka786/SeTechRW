using Microsoft.EntityFrameworkCore;
using SeQrJewellery.Application.DTOs.PrintQueue;
using SeQrJewellery.Application.Interfaces;
using SeQrJewellery.Domain.Entities.Tenant;
using SeQrJewellery.Domain.Enums;
using SeQrJewellery.Infrastructure.Data;

namespace SeQrJewellery.Infrastructure.Services;

public class PrintQueueService : IPrintQueueService
{
    private readonly TenantDbContextAccessor _contextAccessor;
    private readonly ITenantContextAccessor _tenantContext;

    public PrintQueueService(TenantDbContextAccessor contextAccessor, ITenantContextAccessor tenantContext)
    {
        _contextAccessor = contextAccessor;
        _tenantContext = tenantContext;
    }

    public async Task<IEnumerable<PrintQueueDto>> GetPendingJobsAsync(CancellationToken ct = default)
    {
        var db = await _contextAccessor.GetContextAsync(ct);
        var jobs = await db.PrintQueues
            .Include(p => p.JewelleryItem)
            .Where(p => p.Status == PrintStatus.Pending)
            .OrderBy(p => p.Priority)
            .ThenBy(p => p.CreatedAt)
            .AsNoTracking()
            .ToListAsync(ct);
        return jobs.Select(MapToDto);
    }

    public async Task<IEnumerable<PrintQueueDto>> GetAllJobsAsync(PrintStatus? status = null, CancellationToken ct = default)
    {
        var db = await _contextAccessor.GetContextAsync(ct);
        var query = db.PrintQueues.Include(p => p.JewelleryItem).AsNoTracking();
        if (status.HasValue)
            query = query.Where(p => p.Status == status.Value);
        var jobs = await query.OrderByDescending(p => p.CreatedAt).ToListAsync(ct);
        return jobs.Select(MapToDto);
    }

    public async Task<PrintQueueDto?> GetJobByIdAsync(Guid id, CancellationToken ct = default)
    {
        var db = await _contextAccessor.GetContextAsync(ct);
        var job = await db.PrintQueues.Include(p => p.JewelleryItem).AsNoTracking()
            .FirstOrDefaultAsync(p => p.Id == id, ct);
        return job is null ? null : MapToDto(job);
    }

    public async Task<PrintQueueDto> EnqueuePrintJobAsync(CreatePrintJobRequest request, CancellationToken ct = default)
    {
        var db = await _contextAccessor.GetContextAsync(ct);

        var item = await db.JewelleryItems
            .Include(i => i.Tags.Where(t => t.IsPrimary && t.IsActive))
            .FirstOrDefaultAsync(i => i.Id == request.JewelleryItemId, ct)
            ?? throw new KeyNotFoundException($"Jewellery item {request.JewelleryItemId} not found.");

        var primaryTag = item.Tags.FirstOrDefault();
        var printData = BuildBartenderData(item, primaryTag);

        var job = new PrintQueue
        {
            JewelleryItemId = request.JewelleryItemId,
            TagValue = primaryTag?.BarcodeValue,
            TagType = request.TagType,
            Status = PrintStatus.Pending,
            LabelTemplate = request.LabelTemplate,
            LabelSize = request.LabelSize,
            Copies = request.Copies,
            PrinterName = request.PrinterName,
            BartenderFormat = request.BartenderFormat,
            BartenderPrinterName = request.PrinterName,
            Priority = request.Priority,
            PrintData = System.Text.Json.JsonSerializer.Serialize(printData),
            RequestedBy = _tenantContext.UserName
        };

        await db.PrintQueues.AddAsync(job, ct);
        await db.SaveChangesAsync(ct);

        job.JewelleryItem = item;
        return MapToDto(job);
    }

    public async Task<IEnumerable<PrintQueueDto>> EnqueueBatchPrintJobsAsync(BatchPrintJobRequest request, CancellationToken ct = default)
    {
        var jobs = new List<PrintQueueDto>();
        foreach (var itemId in request.JewelleryItemIds)
        {
            var singleRequest = new CreatePrintJobRequest
            {
                JewelleryItemId = itemId,
                TagType = request.TagType,
                LabelTemplate = request.LabelTemplate,
                LabelSize = request.LabelSize,
                Copies = request.CopiesPerItem,
                PrinterName = request.PrinterName,
                BartenderFormat = request.BartenderFormat,
                Priority = request.Priority
            };
            jobs.Add(await EnqueuePrintJobAsync(singleRequest, ct));
        }
        return jobs;
    }

    public async Task<bool> UpdateJobStatusAsync(Guid id, PrintStatus status, string? errorMessage = null, CancellationToken ct = default)
    {
        var db = await _contextAccessor.GetContextAsync(ct);
        var job = await db.PrintQueues.FindAsync([id], cancellationToken: ct);
        if (job is null) return false;

        job.Status = status;
        if (status == PrintStatus.Printing) job.PrintStartedAt = DateTime.UtcNow;
        if (status == PrintStatus.Completed) { job.PrintCompletedAt = DateTime.UtcNow; job.PrintedCopies = job.Copies; }
        if (status == PrintStatus.Failed) { job.ErrorMessage = errorMessage; job.RetryCount++; }

        await db.SaveChangesAsync(ct);
        return true;
    }

    public async Task<bool> CancelJobAsync(Guid id, CancellationToken ct = default)
        => await UpdateJobStatusAsync(id, PrintStatus.Cancelled, ct: ct);

    public async Task<bool> RequeueFailedJobAsync(Guid id, CancellationToken ct = default)
    {
        var db = await _contextAccessor.GetContextAsync(ct);
        var job = await db.PrintQueues.FindAsync([id], cancellationToken: ct);
        if (job is null || job.Status != PrintStatus.Failed) return false;
        job.Status = PrintStatus.Pending;
        job.ErrorMessage = null;
        await db.SaveChangesAsync(ct);
        return true;
    }

    public async Task<int> ClearCompletedJobsAsync(DateTime olderThan, CancellationToken ct = default)
    {
        var db = await _contextAccessor.GetContextAsync(ct);
        var jobs = await db.PrintQueues
            .Where(p => p.Status == PrintStatus.Completed && p.PrintCompletedAt < olderThan)
            .ToListAsync(ct);
        db.PrintQueues.RemoveRange(jobs);
        await db.SaveChangesAsync(ct);
        return jobs.Count;
    }

    public async Task<PrintQueueDto?> GetNextPendingJobAsync(string? printerName = null, CancellationToken ct = default)
    {
        var db = await _contextAccessor.GetContextAsync(ct);
        var query = db.PrintQueues.Include(p => p.JewelleryItem)
            .Where(p => p.Status == PrintStatus.Pending);
        if (printerName != null)
            query = query.Where(p => p.PrinterName == printerName || p.PrinterName == null);
        var job = await query.OrderBy(p => p.Priority).ThenBy(p => p.CreatedAt).FirstOrDefaultAsync(ct);
        return job is null ? null : MapToDto(job);
    }

    private static string BuildBartenderData(JewelleryItem item, JewelleryTag? tag)
    {
        return System.Text.Json.JsonSerializer.Serialize(new
        {
            SKU = item.SKU,
            Name = item.Name,
            TagValue = tag?.BarcodeValue ?? item.SKU,
            GrossWeight = item.GrossWeight.ToString("F3"),
            NetWeight = item.NetWeight.ToString("F3"),
            SellingPrice = item.SellingPrice.ToString("F2"),
            HallmarkNumber = item.HallmarkNumber ?? "",
            CertificateNumber = item.CertificateNumber ?? "",
            PrintDate = DateTime.Now.ToString("dd/MM/yyyy")
        });
    }

    private static PrintQueueDto MapToDto(PrintQueue p) => new()
    {
        Id = p.Id,
        JewelleryItemId = p.JewelleryItemId,
        ItemSKU = p.JewelleryItem?.SKU,
        ItemName = p.JewelleryItem?.Name,
        TagValue = p.TagValue,
        TagType = p.TagType,
        Status = p.Status,
        LabelTemplate = p.LabelTemplate,
        LabelSize = p.LabelSize,
        Copies = p.Copies,
        PrintedCopies = p.PrintedCopies,
        PrinterName = p.PrinterName,
        BartenderFormat = p.BartenderFormat,
        PrintStartedAt = p.PrintStartedAt,
        PrintCompletedAt = p.PrintCompletedAt,
        ErrorMessage = p.ErrorMessage,
        RetryCount = p.RetryCount,
        Priority = p.Priority,
        RequestedBy = p.RequestedBy,
        CreatedAt = p.CreatedAt
    };
}
