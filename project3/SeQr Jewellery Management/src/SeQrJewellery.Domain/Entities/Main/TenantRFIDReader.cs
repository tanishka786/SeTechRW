using SeQrJewellery.Domain.Common;

namespace SeQrJewellery.Domain.Entities.Main;

public class TenantRFIDReader : BaseEntity
{
    public Guid TenantId { get; set; }
    public Guid RFIDReaderProfileId { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? Location { get; set; }
    public string? IPAddress { get; set; }
    public int? Port { get; set; }
    public string? SerialPort { get; set; }
    public int? BaudRate { get; set; }
    public string? MACAddress { get; set; }
    public string? OverrideParameters { get; set; }
    public DateTime? LastSeenAt { get; set; }
    public bool IsOnline { get; set; } = false;

    public Tenant Tenant { get; set; } = null!;
    public RFIDReaderProfile RFIDReaderProfile { get; set; } = null!;
}
