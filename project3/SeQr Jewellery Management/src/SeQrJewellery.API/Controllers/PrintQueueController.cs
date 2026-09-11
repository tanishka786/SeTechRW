using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SeQrJewellery.Application.DTOs.PrintQueue;
using SeQrJewellery.Application.Interfaces;
using SeQrJewellery.Domain.Enums;

namespace SeQrJewellery.API.Controllers;

/// <summary>Print queue management for Bartender label printing</summary>
[Authorize]
public class PrintQueueController : BaseController
{
    private readonly IPrintQueueService _printQueueService;

    public PrintQueueController(IPrintQueueService printQueueService)
    {
        _printQueueService = printQueueService;
    }

    /// <summary>Get all print jobs (optionally filtered by status)</summary>
    [HttpGet]
    public async Task<IActionResult> GetAll([FromQuery] PrintStatus? status, CancellationToken ct)
    {
        var jobs = await _printQueueService.GetAllJobsAsync(status, ct);
        return OkResult(jobs);
    }

    /// <summary>Get only pending print jobs (used by Bartender polling service)</summary>
    [HttpGet("pending")]
    [AllowAnonymous] // Allow Bartender service to poll without authentication
    public async Task<IActionResult> GetPending(CancellationToken ct)
    {
        var jobs = await _printQueueService.GetPendingJobsAsync(ct);
        return OkResult(jobs);
    }

    /// <summary>Get the next pending job for a specific printer (used by Bartender service)</summary>
    [HttpGet("next")]
    [AllowAnonymous]
    public async Task<IActionResult> GetNextJob([FromQuery] string? printerName, CancellationToken ct)
    {
        var job = await _printQueueService.GetNextPendingJobAsync(printerName, ct);
        return job is null ? NotFoundResult("No pending print jobs.") : OkResult(job);
    }

    /// <summary>Get print job by ID</summary>
    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetById(Guid id, CancellationToken ct)
    {
        var job = await _printQueueService.GetJobByIdAsync(id, ct);
        return job is null ? NotFoundResult($"Print job {id} not found.") : OkResult(job);
    }

    /// <summary>Enqueue a label print job for a jewellery item</summary>
    [HttpPost]
    public async Task<IActionResult> Enqueue([FromBody] CreatePrintJobRequest request, CancellationToken ct)
    {
        try
        {
            var job = await _printQueueService.EnqueuePrintJobAsync(request, ct);
            return CreatedResult(job, "Print job queued successfully.");
        }
        catch (KeyNotFoundException ex)
        {
            return NotFoundResult(ex.Message);
        }
    }

    /// <summary>Enqueue batch print jobs for multiple items</summary>
    [HttpPost("batch")]
    public async Task<IActionResult> EnqueueBatch([FromBody] BatchPrintJobRequest request, CancellationToken ct)
    {
        var jobs = await _printQueueService.EnqueueBatchPrintJobsAsync(request, ct);
        return OkResult(jobs, $"{jobs.Count()} print jobs queued.");
    }

    /// <summary>Update print job status (used by Bartender service)</summary>
    [HttpPatch("{id:guid}/status")]
    [AllowAnonymous]
    public async Task<IActionResult> UpdateStatus(Guid id, [FromQuery] PrintStatus status, [FromQuery] string? errorMessage, CancellationToken ct)
    {
        var result = await _printQueueService.UpdateJobStatusAsync(id, status, errorMessage, ct);
        return result ? OkResult(true) : NotFoundResult($"Print job {id} not found.");
    }

    /// <summary>Cancel a pending print job</summary>
    [HttpPost("{id:guid}/cancel")]
    public async Task<IActionResult> Cancel(Guid id, CancellationToken ct)
    {
        var result = await _printQueueService.CancelJobAsync(id, ct);
        return result ? OkResult(true, "Print job cancelled.") : NotFoundResult($"Print job {id} not found.");
    }

    /// <summary>Requeue a failed print job</summary>
    [HttpPost("{id:guid}/requeue")]
    public async Task<IActionResult> Requeue(Guid id, CancellationToken ct)
    {
        var result = await _printQueueService.RequeueFailedJobAsync(id, ct);
        return result ? OkResult(true, "Print job requeued.") : BadRequestResult($"Cannot requeue job {id}.");
    }

    /// <summary>Clear completed jobs older than specified date</summary>
    [HttpDelete("clear-completed")]
    public async Task<IActionResult> ClearCompleted([FromQuery] DateTime? olderThan, CancellationToken ct)
    {
        var cutoff = olderThan ?? DateTime.UtcNow.AddDays(-7);
        var count = await _printQueueService.ClearCompletedJobsAsync(cutoff, ct);
        return OkResult(new { clearedCount = count }, $"Cleared {count} completed jobs.");
    }
}
