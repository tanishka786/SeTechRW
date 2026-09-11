using SeQrJewellery.Domain.Enums;

namespace SeQrJewellery.Application.DTOs.Crm;

public class LeadDto
{
    public Guid Id { get; set; }
    public string LeadCode { get; set; } = string.Empty;
    public string FirstName { get; set; } = string.Empty;
    public string LastName { get; set; } = string.Empty;
    public string FullName => $"{FirstName} {LastName}".Trim();
    public string? Phone { get; set; }
    public string? Email { get; set; }
    public LeadSource Source { get; set; }
    public LeadStatus Status { get; set; }
    public string? InterestedIn { get; set; }
    public string? Occasion { get; set; }
    public decimal? Budget { get; set; }
    public string? Notes { get; set; }
    public Guid? AssignedToUserId { get; set; }
    public string? AssignedToUserName { get; set; }
    public string? AssignedToEmployeeId { get; set; }
    public DateTime? NextFollowUpDate { get; set; }
    public Guid? ConvertedCustomerId { get; set; }
    public DateTime? ConvertedAt { get; set; }
    public int FollowUpCount { get; set; }
    public int OpenFollowUpCount { get; set; }
    public int NoteCount { get; set; }
    public DateTime CreatedAt { get; set; }
}

public class LeadDetailDto : LeadDto
{
    public List<LeadFollowUpDto> FollowUps { get; set; } = [];
    public List<LeadNoteDto> LeadNotes { get; set; } = [];
    public List<LeadActivityDto> Activities { get; set; } = [];
}

public class CreateLeadRequest
{
    public string FirstName { get; set; } = string.Empty;
    public string? LastName { get; set; }
    public string? Phone { get; set; }
    public string? Email { get; set; }
    public LeadSource Source { get; set; } = LeadSource.WalkIn;
    public string? InterestedIn { get; set; }
    public string? Occasion { get; set; }
    public decimal? Budget { get; set; }
    public string? Notes { get; set; }
    /// <summary>Optional; Sales Admin can assign. Sales users are auto-assigned to themselves.</summary>
    public Guid? AssignedToUserId { get; set; }
    public DateTime? NextFollowUpDate { get; set; }
}

public class UpdateLeadRequest
{
    public string? FirstName { get; set; }
    public string? LastName { get; set; }
    public string? Phone { get; set; }
    public string? Email { get; set; }
    public LeadSource? Source { get; set; }
    public LeadStatus? Status { get; set; }
    public string? InterestedIn { get; set; }
    public string? Occasion { get; set; }
    public decimal? Budget { get; set; }
    public string? Notes { get; set; }
    public Guid? AssignedToUserId { get; set; }
    public bool ClearAssignee { get; set; }
    public DateTime? NextFollowUpDate { get; set; }
}

public class LeadFollowUpDto
{
    public Guid Id { get; set; }
    public Guid LeadId { get; set; }
    public FollowUpType Type { get; set; }
    public DateTime ScheduledAt { get; set; }
    public DateTime? CompletedAt { get; set; }
    public string? Notes { get; set; }
    public string? Outcome { get; set; }
    public bool IsCompleted { get; set; }
    public string? LeadName { get; set; }
    public string? LeadPhone { get; set; }
    public string? LeadCode { get; set; }
    public LeadStatus? LeadStatus { get; set; }
    public Guid? AssignedToUserId { get; set; }
    public string? AssignedToUserName { get; set; }
    public Guid? CreatedByUserId { get; set; }
    public string? CreatedByUserName { get; set; }
    public bool IsOverdue { get; set; }
    public bool IsDueToday { get; set; }
}

public class CreateLeadFollowUpRequest
{
    public FollowUpType Type { get; set; } = FollowUpType.Call;
    public DateTime ScheduledAt { get; set; } = DateTime.UtcNow;
    public string? Notes { get; set; }
}

public class CompleteFollowUpRequest
{
    public string? Outcome { get; set; }
    public DateTime? NextFollowUpDate { get; set; }
}

public class ConvertLeadRequest
{
    public string? Email { get; set; }
    public string? Address { get; set; }
    public string? City { get; set; }
    public string? State { get; set; }
}

public class LeadFilterRequest
{
    public LeadStatus? Status { get; set; }
    public LeadSource? Source { get; set; }
    public string? SearchTerm { get; set; }
    public Guid? AssignedToUserId { get; set; }
    public bool? HasOpenFollowUp { get; set; }
    public int PageNumber { get; set; } = 1;
    public int PageSize { get; set; } = 20;
}

public class FollowUpFilterRequest
{
    /// <summary>today | overdue | upcoming | completed | all</summary>
    public string? Scope { get; set; } = "today";
    public Guid? AssignedToUserId { get; set; }
    public FollowUpType? Type { get; set; }
    public string? SearchTerm { get; set; }
    public int PageNumber { get; set; } = 1;
    public int PageSize { get; set; } = 50;
}

public class LeadNoteDto
{
    public Guid Id { get; set; }
    public Guid LeadId { get; set; }
    public string Content { get; set; } = string.Empty;
    public Guid? CreatedByUserId { get; set; }
    public string CreatedByUserName { get; set; } = string.Empty;
    public bool IsPinned { get; set; }
    public DateTime CreatedAt { get; set; }
}

public class CreateLeadNoteRequest
{
    public string Content { get; set; } = string.Empty;
    public bool IsPinned { get; set; }
}

public class LeadActivityDto
{
    public Guid Id { get; set; }
    public Guid LeadId { get; set; }
    public LeadActivityType ActivityType { get; set; }
    public string Summary { get; set; } = string.Empty;
    public string? Details { get; set; }
    public Guid? PerformedByUserId { get; set; }
    public string PerformedByUserName { get; set; } = string.Empty;
    public DateTime OccurredAt { get; set; }
}

public class CrmPipelineSummaryDto
{
    public LeadStatus Status { get; set; }
    public int Count { get; set; }
    public decimal TotalBudget { get; set; }
}

public class FollowUpStatsDto
{
    public int DueToday { get; set; }
    public int Overdue { get; set; }
    public int Upcoming { get; set; }
    public int CompletedToday { get; set; }
}
