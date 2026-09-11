using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SeQrJewellery.Application.DTOs.Common;
using SeQrJewellery.Application.DTOs.Crm;
using SeQrJewellery.Application.Interfaces;
using SeQrJewellery.Domain.Entities.Tenant;
using SeQrJewellery.Domain.Enums;
using SeQrJewellery.Infrastructure.Data;
using SeQrJewellery.Infrastructure.Services;

namespace SeQrJewellery.API.Controllers;

/// <summary>CRM: leads, follow-ups, notes, activity — with user-based ownership scoping</summary>
[Authorize]
public class LeadsController : BaseController
{
    private readonly TenantDbContextAccessor _contextAccessor;
    private readonly IMainDbContext _mainDb;
    private readonly IPermissionService _permissionService;

    public LeadsController(
        TenantDbContextAccessor contextAccessor,
        IMainDbContext mainDb,
        IPermissionService permissionService)
    {
        _contextAccessor = contextAccessor;
        _mainDb = mainDb;
        _permissionService = permissionService;
    }

    [HttpGet]
    public async Task<IActionResult> GetAll([FromQuery] LeadFilterRequest filter, CancellationToken ct)
    {
        var db = await _contextAccessor.GetContextAsync(ct);
        var (userId, _, canViewAll) = await GetCrmAccessAsync(ct);

        var query = db.Leads.Include(l => l.FollowUps).Include(l => l.LeadNotes).AsNoTracking();
        query = ApplyOwnershipFilter(query, userId, canViewAll, filter.AssignedToUserId);

        if (filter.Status.HasValue) query = query.Where(l => l.Status == filter.Status);
        if (filter.Source.HasValue) query = query.Where(l => l.Source == filter.Source);
        if (filter.HasOpenFollowUp == true)
            query = query.Where(l => l.FollowUps.Any(f => !f.IsCompleted));
        if (!string.IsNullOrWhiteSpace(filter.SearchTerm))
        {
            var term = filter.SearchTerm.ToLower();
            query = query.Where(l => l.FirstName.ToLower().Contains(term) || l.LastName.ToLower().Contains(term) ||
                l.LeadCode.ToLower().Contains(term) ||
                (l.Phone != null && l.Phone.Contains(filter.SearchTerm)) ||
                (l.Email != null && l.Email.ToLower().Contains(term)) ||
                (l.AssignedToUserName != null && l.AssignedToUserName.ToLower().Contains(term)));
        }

        var total = await query.CountAsync(ct);
        var leads = await query.OrderByDescending(l => l.CreatedAt)
            .Skip((filter.PageNumber - 1) * filter.PageSize).Take(filter.PageSize).ToListAsync(ct);

        return OkResult(new PagedResult<LeadDto>
        {
            Items = leads.Select(MapToDto),
            TotalCount = total,
            PageNumber = filter.PageNumber,
            PageSize = filter.PageSize
        });
    }

    [HttpGet("pipeline")]
    public async Task<IActionResult> GetPipeline(CancellationToken ct)
    {
        var db = await _contextAccessor.GetContextAsync(ct);
        var (userId, _, canViewAll) = await GetCrmAccessAsync(ct);

        var query = db.Leads.AsNoTracking();
        query = ApplyOwnershipFilter(query, userId, canViewAll, null);
        var leads = await query.ToListAsync(ct);

        var summary = leads.GroupBy(l => l.Status)
            .Select(g => new CrmPipelineSummaryDto { Status = g.Key, Count = g.Count(), TotalBudget = g.Sum(l => l.Budget ?? 0) })
            .ToList();

        foreach (var status in Enum.GetValues<LeadStatus>())
        {
            if (!summary.Any(s => s.Status == status))
                summary.Add(new CrmPipelineSummaryDto { Status = status, Count = 0, TotalBudget = 0 });
        }

        return OkResult(summary.OrderBy(s => (int)s.Status));
    }

    /// <summary>Follow-up stats for today / overdue / upcoming (ownership-scoped)</summary>
    [HttpGet("followups/stats")]
    public async Task<IActionResult> GetFollowUpStats(CancellationToken ct)
    {
        var db = await _contextAccessor.GetContextAsync(ct);
        var (userId, _, canViewAll) = await GetCrmAccessAsync(ct);
        var today = DateTime.UtcNow.Date;
        var tomorrow = today.AddDays(1);

        var query = db.LeadFollowUps.Include(f => f.Lead).AsNoTracking();
        query = ApplyFollowUpOwnership(query, userId, canViewAll, null);

        var open = await query.Where(f => !f.IsCompleted).ToListAsync(ct);
        var completedToday = await query.CountAsync(f => f.IsCompleted && f.CompletedAt >= today && f.CompletedAt < tomorrow, ct);

        return OkResult(new FollowUpStatsDto
        {
            DueToday = open.Count(f => f.ScheduledAt >= today && f.ScheduledAt < tomorrow),
            Overdue = open.Count(f => f.ScheduledAt < today),
            Upcoming = open.Count(f => f.ScheduledAt >= tomorrow),
            CompletedToday = completedToday
        });
    }

    /// <summary>Paged follow-ups list for the dedicated Follow-ups page</summary>
    [HttpGet("followups")]
    public async Task<IActionResult> GetFollowUps([FromQuery] FollowUpFilterRequest filter, CancellationToken ct)
    {
        var db = await _contextAccessor.GetContextAsync(ct);
        var (userId, _, canViewAll) = await GetCrmAccessAsync(ct);
        var today = DateTime.UtcNow.Date;
        var tomorrow = today.AddDays(1);
        var scope = (filter.Scope ?? "today").ToLowerInvariant();

        var query = db.LeadFollowUps.Include(f => f.Lead).AsNoTracking();
        query = ApplyFollowUpOwnership(query, userId, canViewAll, filter.AssignedToUserId);

        if (filter.Type.HasValue) query = query.Where(f => f.Type == filter.Type);

        query = scope switch
        {
            "overdue" => query.Where(f => !f.IsCompleted && f.ScheduledAt < today),
            "upcoming" => query.Where(f => !f.IsCompleted && f.ScheduledAt >= tomorrow),
            "completed" => query.Where(f => f.IsCompleted),
            "all" => query,
            "open" => query.Where(f => !f.IsCompleted),
            _ => query.Where(f => !f.IsCompleted && f.ScheduledAt >= today && f.ScheduledAt < tomorrow) // today
        };

        if (!string.IsNullOrWhiteSpace(filter.SearchTerm))
        {
            var term = filter.SearchTerm.ToLower();
            query = query.Where(f =>
                f.Lead.FirstName.ToLower().Contains(term) ||
                f.Lead.LastName.ToLower().Contains(term) ||
                f.Lead.LeadCode.ToLower().Contains(term) ||
                (f.Lead.Phone != null && f.Lead.Phone.Contains(filter.SearchTerm)));
        }

        var total = await query.CountAsync(ct);
        var ordered = scope == "completed"
            ? query.OrderByDescending(f => f.CompletedAt)
            : query.OrderBy(f => f.ScheduledAt);

        var items = await ordered
            .Skip((filter.PageNumber - 1) * filter.PageSize)
            .Take(filter.PageSize)
            .ToListAsync(ct);

        return OkResult(new PagedResult<LeadFollowUpDto>
        {
            Items = items.Select(f => MapFollowUpToDto(f, null, today)),
            TotalCount = total,
            PageNumber = filter.PageNumber,
            PageSize = filter.PageSize
        });
    }

    [HttpGet("due-followups")]
    public async Task<IActionResult> GetDueFollowUps(CancellationToken ct)
    {
        var db = await _contextAccessor.GetContextAsync(ct);
        var (userId, _, canViewAll) = await GetCrmAccessAsync(ct);
        var endOfToday = DateTime.UtcNow.Date.AddDays(1);
        var today = DateTime.UtcNow.Date;

        var query = db.LeadFollowUps.Include(f => f.Lead)
            .Where(f => !f.IsCompleted && f.ScheduledAt < endOfToday)
            .AsNoTracking();
        query = ApplyFollowUpOwnership(query, userId, canViewAll, null);

        var followUps = await query.OrderBy(f => f.ScheduledAt).Take(50).ToListAsync(ct);
        return OkResult(followUps.Select(f => MapFollowUpToDto(f, null, today)));
    }

    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetById(Guid id, CancellationToken ct)
    {
        var db = await _contextAccessor.GetContextAsync(ct);
        var (userId, _, canViewAll) = await GetCrmAccessAsync(ct);

        var lead = await db.Leads
            .Include(l => l.FollowUps.OrderByDescending(f => f.ScheduledAt))
            .Include(l => l.LeadNotes.OrderByDescending(n => n.IsPinned).ThenByDescending(n => n.CreatedAt))
            .Include(l => l.Activities.OrderByDescending(a => a.OccurredAt))
            .AsNoTracking()
            .FirstOrDefaultAsync(l => l.Id == id, ct);

        if (lead is null) return NotFoundResult($"Lead {id} not found.");
        if (!CanAccessLead(lead, userId, canViewAll)) return BadRequestResult("You do not have access to this lead.");

        var today = DateTime.UtcNow.Date;
        var detail = MapToDetailDto(lead, today);
        return OkResult(detail);
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateLeadRequest request, CancellationToken ct)
    {
        var db = await _contextAccessor.GetContextAsync(ct);
        var (userId, userName, canViewAll) = await GetCrmAccessAsync(ct);

        Guid? assigneeId = request.AssignedToUserId;
        string? assigneeName = null;

        if (canViewAll && assigneeId.HasValue)
        {
            assigneeName = await ResolveUserNameAsync(assigneeId.Value, ct);
        }
        else
        {
            // Sales users always own the leads they create
            assigneeId = userId;
            assigneeName = userName;
        }

        if (assigneeId.HasValue && string.IsNullOrEmpty(assigneeName))
            assigneeName = await ResolveUserNameAsync(assigneeId.Value, ct) ?? userName;

        var lead = new Lead
        {
            LeadCode = await GenerateLeadCodeAsync(db, ct),
            FirstName = request.FirstName,
            LastName = request.LastName ?? "",
            Phone = request.Phone,
            Email = request.Email,
            Source = request.Source,
            InterestedIn = request.InterestedIn,
            Occasion = request.Occasion,
            Budget = request.Budget,
            Notes = request.Notes,
            AssignedToUserId = assigneeId,
            AssignedToUserName = assigneeName,
            AssignedToEmployeeId = assigneeId?.ToString(),
            NextFollowUpDate = request.NextFollowUpDate,
            CreatedBy = userName,
        };

        await db.Leads.AddAsync(lead, ct);

        if (!string.IsNullOrWhiteSpace(request.Notes))
        {
            await db.LeadNotes.AddAsync(new LeadNote
            {
                LeadId = lead.Id,
                Content = request.Notes,
                CreatedByUserId = userId,
                CreatedByUserName = userName,
            }, ct);
        }

        if (request.NextFollowUpDate.HasValue)
        {
            await db.LeadFollowUps.AddAsync(new LeadFollowUp
            {
                LeadId = lead.Id,
                Type = FollowUpType.Call,
                ScheduledAt = request.NextFollowUpDate.Value,
                Notes = "Initial follow-up",
                CreatedByUserId = userId,
                CreatedByUserName = userName,
            }, ct);
        }

        await AddActivityAsync(db, lead.Id, LeadActivityType.Created,
            $"Lead created and assigned to {assigneeName ?? "unassigned"}",
            null, userId, userName, ct);

        await db.SaveChangesAsync(ct);
        return CreatedResult(MapToDto(lead), "Lead created.");
    }

    [HttpPut("{id:guid}")]
    public async Task<IActionResult> Update(Guid id, [FromBody] UpdateLeadRequest request, CancellationToken ct)
    {
        var db = await _contextAccessor.GetContextAsync(ct);
        var (userId, userName, canViewAll) = await GetCrmAccessAsync(ct);

        var lead = await db.Leads.FindAsync([id], cancellationToken: ct);
        if (lead is null) return NotFoundResult($"Lead {id} not found.");
        if (!CanAccessLead(lead, userId, canViewAll)) return BadRequestResult("You do not have access to this lead.");

        var changes = new List<string>();

        if (request.FirstName != null && request.FirstName != lead.FirstName) { lead.FirstName = request.FirstName; changes.Add("name"); }
        if (request.LastName != null) lead.LastName = request.LastName;
        if (request.Phone != null) lead.Phone = request.Phone;
        if (request.Email != null) lead.Email = request.Email;
        if (request.Source.HasValue) lead.Source = request.Source.Value;
        if (request.InterestedIn != null) lead.InterestedIn = request.InterestedIn;
        if (request.Occasion != null) lead.Occasion = request.Occasion;
        if (request.Budget.HasValue) lead.Budget = request.Budget;
        if (request.Notes != null) lead.Notes = request.Notes;
        if (request.NextFollowUpDate.HasValue) lead.NextFollowUpDate = request.NextFollowUpDate;

        if (request.Status.HasValue && request.Status.Value != lead.Status)
        {
            var old = lead.Status;
            lead.Status = request.Status.Value;
            await AddActivityAsync(db, lead.Id, LeadActivityType.StatusChanged,
                $"Status changed from {old} to {lead.Status}", null, userId, userName, ct);
        }

        if (canViewAll)
        {
            if (request.ClearAssignee)
            {
                lead.AssignedToUserId = null;
                lead.AssignedToUserName = null;
                lead.AssignedToEmployeeId = null;
                await AddActivityAsync(db, lead.Id, LeadActivityType.Assigned, "Assignee cleared", null, userId, userName, ct);
            }
            else if (request.AssignedToUserId.HasValue && request.AssignedToUserId != lead.AssignedToUserId)
            {
                var name = await ResolveUserNameAsync(request.AssignedToUserId.Value, ct) ?? "user";
                lead.AssignedToUserId = request.AssignedToUserId;
                lead.AssignedToUserName = name;
                lead.AssignedToEmployeeId = request.AssignedToUserId.Value.ToString();
                await AddActivityAsync(db, lead.Id, LeadActivityType.Assigned,
                    $"Assigned to {name}", null, userId, userName, ct);
            }
        }

        if (changes.Count > 0)
            await AddActivityAsync(db, lead.Id, LeadActivityType.Updated, "Lead details updated", string.Join(", ", changes), userId, userName, ct);

        lead.UpdatedBy = userName;
        await db.SaveChangesAsync(ct);
        return OkResult(MapToDto(lead));
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id, CancellationToken ct)
    {
        var db = await _contextAccessor.GetContextAsync(ct);
        var (userId, userName, canViewAll) = await GetCrmAccessAsync(ct);
        var lead = await db.Leads.FindAsync([id], cancellationToken: ct);
        if (lead is null) return NotFoundResult($"Lead {id} not found.");
        if (!CanAccessLead(lead, userId, canViewAll)) return BadRequestResult("You do not have access to this lead.");

        lead.IsDeleted = true;
        lead.DeletedAt = DateTime.UtcNow;
        lead.DeletedBy = userName;
        await AddActivityAsync(db, lead.Id, LeadActivityType.Deleted, "Lead deleted", null, userId, userName, ct);
        await db.SaveChangesAsync(ct);
        return OkResult(true, "Lead deleted.");
    }

    // ---- Follow-ups ----

    [HttpPost("{id:guid}/followups")]
    public async Task<IActionResult> AddFollowUp(Guid id, [FromBody] CreateLeadFollowUpRequest request, CancellationToken ct)
    {
        var db = await _contextAccessor.GetContextAsync(ct);
        var (userId, userName, canViewAll) = await GetCrmAccessAsync(ct);
        var lead = await db.Leads.FindAsync([id], cancellationToken: ct);
        if (lead is null) return NotFoundResult($"Lead {id} not found.");
        if (!CanAccessLead(lead, userId, canViewAll)) return BadRequestResult("You do not have access to this lead.");

        var followUp = new LeadFollowUp
        {
            LeadId = id,
            Type = request.Type,
            ScheduledAt = request.ScheduledAt,
            Notes = request.Notes,
            CreatedByUserId = userId,
            CreatedByUserName = userName,
            CreatedByEmployeeId = userId?.ToString(),
        };
        await db.LeadFollowUps.AddAsync(followUp, ct);
        lead.NextFollowUpDate = request.ScheduledAt;
        if (lead.Status == LeadStatus.New) lead.Status = LeadStatus.Contacted;

        await AddActivityAsync(db, lead.Id, LeadActivityType.FollowUpScheduled,
            $"Follow-up scheduled ({request.Type}) for {request.ScheduledAt:g}",
            request.Notes, userId, userName, ct);

        await db.SaveChangesAsync(ct);
        return CreatedResult(MapFollowUpToDto(followUp, lead), "Follow-up scheduled.");
    }

    [HttpPatch("followups/{followUpId:guid}/complete")]
    public async Task<IActionResult> CompleteFollowUp(Guid followUpId, [FromBody] CompleteFollowUpRequest request, CancellationToken ct)
    {
        var db = await _contextAccessor.GetContextAsync(ct);
        var (userId, userName, canViewAll) = await GetCrmAccessAsync(ct);
        var followUp = await db.LeadFollowUps.Include(f => f.Lead).FirstOrDefaultAsync(f => f.Id == followUpId, ct);
        if (followUp is null) return NotFoundResult($"Follow-up {followUpId} not found.");
        if (!CanAccessLead(followUp.Lead, userId, canViewAll)) return BadRequestResult("You do not have access to this lead.");

        followUp.IsCompleted = true;
        followUp.CompletedAt = DateTime.UtcNow;
        followUp.Outcome = request.Outcome;
        if (request.NextFollowUpDate.HasValue)
            followUp.Lead.NextFollowUpDate = request.NextFollowUpDate;

        await AddActivityAsync(db, followUp.LeadId, LeadActivityType.FollowUpCompleted,
            $"Follow-up completed ({followUp.Type})",
            request.Outcome, userId, userName, ct);

        await db.SaveChangesAsync(ct);
        return OkResult(MapFollowUpToDto(followUp), "Follow-up completed.");
    }

    // ---- Notes ----

    [HttpGet("{id:guid}/notes")]
    public async Task<IActionResult> GetNotes(Guid id, CancellationToken ct)
    {
        var db = await _contextAccessor.GetContextAsync(ct);
        var (userId, _, canViewAll) = await GetCrmAccessAsync(ct);
        var lead = await db.Leads.AsNoTracking().FirstOrDefaultAsync(l => l.Id == id, ct);
        if (lead is null) return NotFoundResult($"Lead {id} not found.");
        if (!CanAccessLead(lead, userId, canViewAll)) return BadRequestResult("You do not have access to this lead.");

        var notes = await db.LeadNotes.AsNoTracking()
            .Where(n => n.LeadId == id)
            .OrderByDescending(n => n.IsPinned).ThenByDescending(n => n.CreatedAt)
            .ToListAsync(ct);
        return OkResult(notes.Select(MapNoteToDto));
    }

    [HttpPost("{id:guid}/notes")]
    public async Task<IActionResult> AddNote(Guid id, [FromBody] CreateLeadNoteRequest request, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(request.Content))
            return BadRequestResult("Note content is required.");

        var db = await _contextAccessor.GetContextAsync(ct);
        var (userId, userName, canViewAll) = await GetCrmAccessAsync(ct);
        var lead = await db.Leads.FindAsync([id], cancellationToken: ct);
        if (lead is null) return NotFoundResult($"Lead {id} not found.");
        if (!CanAccessLead(lead, userId, canViewAll)) return BadRequestResult("You do not have access to this lead.");

        var note = new LeadNote
        {
            LeadId = id,
            Content = request.Content.Trim(),
            IsPinned = request.IsPinned,
            CreatedByUserId = userId,
            CreatedByUserName = userName,
        };
        await db.LeadNotes.AddAsync(note, ct);
        await AddActivityAsync(db, id, LeadActivityType.NoteAdded, "Note added",
            request.Content.Length > 120 ? request.Content[..120] + "…" : request.Content,
            userId, userName, ct);

        await db.SaveChangesAsync(ct);
        return CreatedResult(MapNoteToDto(note), "Note added.");
    }

    [HttpDelete("{leadId:guid}/notes/{noteId:guid}")]
    public async Task<IActionResult> DeleteNote(Guid leadId, Guid noteId, CancellationToken ct)
    {
        var db = await _contextAccessor.GetContextAsync(ct);
        var (userId, _, canViewAll) = await GetCrmAccessAsync(ct);
        var lead = await db.Leads.AsNoTracking().FirstOrDefaultAsync(l => l.Id == leadId, ct);
        if (lead is null) return NotFoundResult($"Lead {leadId} not found.");
        if (!CanAccessLead(lead, userId, canViewAll)) return BadRequestResult("You do not have access to this lead.");

        var note = await db.LeadNotes.FirstOrDefaultAsync(n => n.Id == noteId && n.LeadId == leadId, ct);
        if (note is null) return NotFoundResult("Note not found.");

        // Users can delete own notes; sales admin can delete any
        if (!canViewAll && note.CreatedByUserId != userId)
            return BadRequestResult("You can only delete your own notes.");

        db.LeadNotes.Remove(note);
        await db.SaveChangesAsync(ct);
        return OkResult(true, "Note deleted.");
    }

    // ---- Activity ----

    [HttpGet("{id:guid}/activities")]
    public async Task<IActionResult> GetActivities(Guid id, CancellationToken ct)
    {
        var db = await _contextAccessor.GetContextAsync(ct);
        var (userId, _, canViewAll) = await GetCrmAccessAsync(ct);
        var lead = await db.Leads.AsNoTracking().FirstOrDefaultAsync(l => l.Id == id, ct);
        if (lead is null) return NotFoundResult($"Lead {id} not found.");
        if (!CanAccessLead(lead, userId, canViewAll)) return BadRequestResult("You do not have access to this lead.");

        var activities = await db.LeadActivities.AsNoTracking()
            .Where(a => a.LeadId == id)
            .OrderByDescending(a => a.OccurredAt)
            .Take(100)
            .ToListAsync(ct);
        return OkResult(activities.Select(MapActivityToDto));
    }

    // ---- Convert ----

    [HttpPost("{id:guid}/convert")]
    public async Task<IActionResult> ConvertToCustomer(Guid id, [FromBody] ConvertLeadRequest request, CancellationToken ct)
    {
        var db = await _contextAccessor.GetContextAsync(ct);
        var (userId, userName, canViewAll) = await GetCrmAccessAsync(ct);
        var lead = await db.Leads.FindAsync([id], cancellationToken: ct);
        if (lead is null) return NotFoundResult($"Lead {id} not found.");
        if (!CanAccessLead(lead, userId, canViewAll)) return BadRequestResult("You do not have access to this lead.");
        if (lead.ConvertedCustomerId.HasValue) return BadRequestResult("Lead has already been converted.");

        var count = await db.Customers.IgnoreQueryFilters().CountAsync(ct);
        var customer = new Customer
        {
            CustomerCode = $"CUS{(count + 1):D5}",
            FirstName = lead.FirstName,
            LastName = lead.LastName,
            Phone = lead.Phone,
            Email = request.Email ?? lead.Email,
            Address = request.Address,
            City = request.City,
            State = request.State,
            Notes = $"Converted from lead {lead.LeadCode}. {lead.Notes}".Trim(),
        };
        await db.Customers.AddAsync(customer, ct);

        lead.Status = LeadStatus.Won;
        lead.ConvertedCustomerId = customer.Id;
        lead.ConvertedAt = DateTime.UtcNow;

        await AddActivityAsync(db, lead.Id, LeadActivityType.Converted,
            $"Converted to customer {customer.CustomerCode}", null, userId, userName, ct);

        await db.SaveChangesAsync(ct);
        return OkResult(new { customerId = customer.Id, customerCode = customer.CustomerCode }, "Lead converted to customer.");
    }

    // ---- Helpers ----

    private async Task<(Guid? UserId, string UserName, bool CanViewAll)> GetCrmAccessAsync(CancellationToken ct)
    {
        var userIdStr = User.FindFirstValue(ClaimTypes.NameIdentifier);
        Guid? userId = Guid.TryParse(userIdStr, out var g) ? g : null;
        var userName = User.FindFirstValue(ClaimTypes.Name) ?? "user";

        var roleClaim = User.FindFirstValue(ClaimTypes.Role);
        Enum.TryParse<UserRole>(roleClaim, out var legacyRole);
        var tenantIdStr = User.FindFirstValue("TenantId");
        Guid.TryParse(tenantIdStr, out var tenantId);

        bool canViewAll = legacyRole is UserRole.SuperAdmin or UserRole.TenantAdmin or UserRole.Manager;

        if (userId.HasValue && tenantId != Guid.Empty)
        {
            var perms = await _permissionService.GetPermissionsAsync(userId.Value, tenantId, legacyRole, ct);
            canViewAll = perms.CanViewAllLeads || PermissionService.HasCrmManage(perms);

            var user = await _mainDb.TenantUsers.AsNoTracking().FirstOrDefaultAsync(u => u.Id == userId.Value, ct);
            if (user is not null)
                userName = $"{user.FirstName} {user.LastName}".Trim();
        }

        return (userId, userName, canViewAll);
    }

    private static IQueryable<Lead> ApplyOwnershipFilter(IQueryable<Lead> query, Guid? userId, bool canViewAll, Guid? filterAssignee)
    {
        if (canViewAll)
        {
            if (filterAssignee.HasValue)
                query = query.Where(l => l.AssignedToUserId == filterAssignee);
            return query;
        }

        // Sales users: only own leads (or unassigned created by them — but we always assign on create)
        if (userId.HasValue)
            return query.Where(l => l.AssignedToUserId == userId);
        return query.Where(_ => false);
    }

    private static IQueryable<LeadFollowUp> ApplyFollowUpOwnership(IQueryable<LeadFollowUp> query, Guid? userId, bool canViewAll, Guid? filterAssignee)
    {
        if (canViewAll)
        {
            if (filterAssignee.HasValue)
                query = query.Where(f => f.Lead.AssignedToUserId == filterAssignee);
            return query;
        }

        if (userId.HasValue)
            return query.Where(f => f.Lead.AssignedToUserId == userId);
        return query.Where(_ => false);
    }

    private static bool CanAccessLead(Lead lead, Guid? userId, bool canViewAll)
        => canViewAll || (userId.HasValue && lead.AssignedToUserId == userId);

    private async Task<string?> ResolveUserNameAsync(Guid userId, CancellationToken ct)
    {
        var user = await _mainDb.TenantUsers.AsNoTracking().FirstOrDefaultAsync(u => u.Id == userId, ct);
        return user is null ? null : $"{user.FirstName} {user.LastName}".Trim();
    }

    private static async Task AddActivityAsync(
        TenantDbContext db, Guid leadId, LeadActivityType type, string summary, string? details,
        Guid? userId, string userName, CancellationToken ct)
    {
        await db.LeadActivities.AddAsync(new LeadActivity
        {
            LeadId = leadId,
            ActivityType = type,
            Summary = summary,
            Details = details,
            PerformedByUserId = userId,
            PerformedByUserName = userName,
            OccurredAt = DateTime.UtcNow,
        }, ct);
    }

    private static async Task<string> GenerateLeadCodeAsync(TenantDbContext db, CancellationToken ct)
    {
        var count = await db.Leads.IgnoreQueryFilters().CountAsync(ct);
        var year = DateTime.UtcNow.Year.ToString()[2..];
        return $"LD{year}-{(count + 1):D5}";
    }

    private static LeadDto MapToDto(Lead l) => new()
    {
        Id = l.Id, LeadCode = l.LeadCode, FirstName = l.FirstName, LastName = l.LastName,
        Phone = l.Phone, Email = l.Email, Source = l.Source, Status = l.Status,
        InterestedIn = l.InterestedIn, Occasion = l.Occasion, Budget = l.Budget, Notes = l.Notes,
        AssignedToUserId = l.AssignedToUserId, AssignedToUserName = l.AssignedToUserName,
        AssignedToEmployeeId = l.AssignedToEmployeeId, NextFollowUpDate = l.NextFollowUpDate,
        ConvertedCustomerId = l.ConvertedCustomerId, ConvertedAt = l.ConvertedAt,
        FollowUpCount = l.FollowUps?.Count ?? 0,
        OpenFollowUpCount = l.FollowUps?.Count(f => !f.IsCompleted) ?? 0,
        NoteCount = l.LeadNotes?.Count ?? 0,
        CreatedAt = l.CreatedAt,
    };

    private static LeadDetailDto MapToDetailDto(Lead lead, DateTime today)
    {
        var dto = new LeadDetailDto
        {
            Id = lead.Id, LeadCode = lead.LeadCode, FirstName = lead.FirstName, LastName = lead.LastName,
            Phone = lead.Phone, Email = lead.Email, Source = lead.Source, Status = lead.Status,
            InterestedIn = lead.InterestedIn, Occasion = lead.Occasion, Budget = lead.Budget, Notes = lead.Notes,
            AssignedToUserId = lead.AssignedToUserId, AssignedToUserName = lead.AssignedToUserName,
            AssignedToEmployeeId = lead.AssignedToEmployeeId, NextFollowUpDate = lead.NextFollowUpDate,
            ConvertedCustomerId = lead.ConvertedCustomerId, ConvertedAt = lead.ConvertedAt,
            FollowUpCount = lead.FollowUps.Count,
            OpenFollowUpCount = lead.FollowUps.Count(f => !f.IsCompleted),
            NoteCount = lead.LeadNotes.Count,
            CreatedAt = lead.CreatedAt,
            FollowUps = lead.FollowUps.Select(f => MapFollowUpToDto(f, lead, today)).ToList(),
            LeadNotes = lead.LeadNotes.Select(MapNoteToDto).ToList(),
            Activities = lead.Activities.Select(MapActivityToDto).ToList(),
        };
        return dto;
    }

    private static LeadFollowUpDto MapFollowUpToDto(LeadFollowUp f, Lead? lead = null, DateTime? today = null)
    {
        var l = lead ?? f.Lead;
        var day = today ?? DateTime.UtcNow.Date;
        return new LeadFollowUpDto
        {
            Id = f.Id, LeadId = f.LeadId, Type = f.Type, ScheduledAt = f.ScheduledAt, CompletedAt = f.CompletedAt,
            Notes = f.Notes, Outcome = f.Outcome, IsCompleted = f.IsCompleted,
            LeadName = $"{l?.FirstName} {l?.LastName}".Trim(),
            LeadPhone = l?.Phone,
            LeadCode = l?.LeadCode,
            LeadStatus = l?.Status,
            AssignedToUserId = l?.AssignedToUserId,
            AssignedToUserName = l?.AssignedToUserName,
            CreatedByUserId = f.CreatedByUserId,
            CreatedByUserName = f.CreatedByUserName,
            IsOverdue = !f.IsCompleted && f.ScheduledAt.Date < day,
            IsDueToday = !f.IsCompleted && f.ScheduledAt.Date == day,
        };
    }

    private static LeadNoteDto MapNoteToDto(LeadNote n) => new()
    {
        Id = n.Id, LeadId = n.LeadId, Content = n.Content,
        CreatedByUserId = n.CreatedByUserId, CreatedByUserName = n.CreatedByUserName,
        IsPinned = n.IsPinned, CreatedAt = n.CreatedAt,
    };

    private static LeadActivityDto MapActivityToDto(LeadActivity a) => new()
    {
        Id = a.Id, LeadId = a.LeadId, ActivityType = a.ActivityType,
        Summary = a.Summary, Details = a.Details,
        PerformedByUserId = a.PerformedByUserId, PerformedByUserName = a.PerformedByUserName,
        OccurredAt = a.OccurredAt,
    };
}
