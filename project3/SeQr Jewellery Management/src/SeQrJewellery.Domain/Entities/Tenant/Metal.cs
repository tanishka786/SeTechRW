using SeQrJewellery.Domain.Common;
using SeQrJewellery.Domain.Enums;

namespace SeQrJewellery.Domain.Entities.Tenant;

public class Metal : BaseEntity
{
    public string Name { get; set; } = string.Empty;
    public MetalType MetalType { get; set; }
    public string Symbol { get; set; } = string.Empty; // Au, Ag, Pt
    public string? Description { get; set; }
    public decimal CurrentMarketRate { get; set; } = 0;
    public string RateUnit { get; set; } = "per gram";
    public DateTime? LastRateUpdate { get; set; }

    public ICollection<Purity> Purities { get; set; } = new List<Purity>();
    public ICollection<JewelleryItem> JewelleryItems { get; set; } = new List<JewelleryItem>();
}
