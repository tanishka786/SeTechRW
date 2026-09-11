using SeQrJewellery.Domain.Common;
using SeQrJewellery.Domain.Enums;

namespace SeQrJewellery.Domain.Entities.Main;

public class RFIDReaderProfile : BaseEntity
{
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public RFIDReaderManufacturer Manufacturer { get; set; }
    public string ModelNumber { get; set; } = string.Empty;
    public RFIDConnectionType ConnectionType { get; set; }

    // Connection Parameters (stored as JSON)
    public string ConnectionParameters { get; set; } = "{}";

    // RFID Settings
    public int ReadPowerDbm { get; set; } = 27;
    public int WritePowerDbm { get; set; } = 27;
    public string Protocol { get; set; } = "EPC_GEN2";
    public int AntennaCount { get; set; } = 1;
    public bool EnableGPIO { get; set; } = false;
    public string? DriverClassName { get; set; }
    public string? FirmwareVersion { get; set; }

    public ICollection<TenantRFIDReader> TenantReaders { get; set; } = new List<TenantRFIDReader>();
}
