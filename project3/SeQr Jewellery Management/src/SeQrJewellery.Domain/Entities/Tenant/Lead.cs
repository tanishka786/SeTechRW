using SeQrJewellery.Domain.Common;
using SeQrJewellery.Domain.Enums;

namespace SeQrJewellery.Domain.Entities.Tenant;

public class Lead : BaseEntity
{
    public string LeadCode { get; set; } = string.Empty;
    public string FirstName { get; set; } = string.Empty;
    public string LastName { get; set; } = string.Empty;
    public string? Phone { get; set; }
    public string? Email { get; set; }
    public LeadSource Source { get; set; } = LeadSource.WalkIn;
    public LeadStatus Status { get; set; } = LeadStatus.New;
    public string? InterestedIn { get; set; }
    public string? Occasion { get; set; }
    public decimal? Budget { get; set; }
    /// <summary>Legacy free-text notes; prefer <see cref="LeadNotes"/> for ongoing notes.</summary>
    public string? Notes { get; set; }

    /// <summary>TenantUser.Id of the sales user who owns this lead.</summary>
    public Guid? AssignedToUserId { get; set; }
    public string? AssignedToUserName { get; set; }
    /// <summary>Legacy string assignee — kept for backward compatibility.</summary>
    public string? AssignedToEmployeeId { get; set; }

    public DateTime? NextFollowUpDate { get; set; }
    public Guid? ConvertedCustomerId { get; set; }
    public DateTime? ConvertedAt { get; set; }

    public Customer? ConvertedCustomer { get; set; }
    public ICollection<LeadFollowUp> FollowUps { get; set; } = new List<LeadFollowUp>();
    public ICollection<LeadNote> LeadNotes { get; set; } = new List<LeadNote>();
    public ICollection<LeadActivity> Activities { get; set; } = new List<LeadActivity>();
}
