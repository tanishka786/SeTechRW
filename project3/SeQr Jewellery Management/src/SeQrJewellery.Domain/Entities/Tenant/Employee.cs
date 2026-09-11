using SeQrJewellery.Domain.Common;

namespace SeQrJewellery.Domain.Entities.Tenant;

public class Employee : BaseEntity
{
    public string EmployeeCode { get; set; } = string.Empty;
    public string FirstName { get; set; } = string.Empty;
    public string LastName { get; set; } = string.Empty;
    public string FullName => $"{FirstName} {LastName}".Trim();
    public string? Email { get; set; }
    public string? Phone { get; set; }
    public string Position { get; set; } = string.Empty;
    public string? Department { get; set; }
    public DateTime JoinDate { get; set; }
    public DateTime? ResignDate { get; set; }
    public string? Address { get; set; }
    public string? EmergencyContact { get; set; }
    public string? EmergencyPhone { get; set; }
    public decimal? Salary { get; set; }
    public string? Notes { get; set; }
    public string? UserId { get; set; } // Linked TenantUser ID
}
