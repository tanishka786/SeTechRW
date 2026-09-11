using SeQrJewellery.Application.DTOs.PrintQueue;
using SeQrJewellery.Domain.Enums;

namespace SeQrJewellery.Application.Interfaces;

public interface IPrintQueueService
{
    Task<IEnumerable<PrintQueueDto>> GetPendingJobsAsync(CancellationToken ct = default);
    Task<IEnumerable<PrintQueueDto>> GetAllJobsAsync(PrintStatus? status = null, CancellationToken ct = default);
    Task<PrintQueueDto?> GetJobByIdAsync(Guid id, CancellationToken ct = default);
    Task<PrintQueueDto> EnqueuePrintJobAsync(CreatePrintJobRequest request, CancellationToken ct = default);
    Task<IEnumerable<PrintQueueDto>> EnqueueBatchPrintJobsAsync(BatchPrintJobRequest request, CancellationToken ct = default);
    Task<bool> UpdateJobStatusAsync(Guid id, PrintStatus status, string? errorMessage = null, CancellationToken ct = default);
    Task<bool> CancelJobAsync(Guid id, CancellationToken ct = default);
    Task<bool> RequeueFailedJobAsync(Guid id, CancellationToken ct = default);
    Task<int> ClearCompletedJobsAsync(DateTime olderThan, CancellationToken ct = default);
    Task<PrintQueueDto?> GetNextPendingJobAsync(string? printerName = null, CancellationToken ct = default);
}
