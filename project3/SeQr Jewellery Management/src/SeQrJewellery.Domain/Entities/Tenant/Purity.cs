using SeQrJewellery.Domain.Common;

namespace SeQrJewellery.Domain.Entities.Tenant;

public class Purity : BaseEntity
{
    public Guid MetalId { get; set; }
    public string Name { get; set; } = string.Empty; // e.g. "22K", "18K", "925 Sterling"
    public decimal PurityPercentage { get; set; } // e.g. 91.6 for 22K
    public string? HallmarkCode { get; set; } // BIS hallmark code
    public string? Description { get; set; }
    public decimal? PremiumPercent { get; set; } // Making charges premium

    public Metal Metal { get; set; } = null!;
    public ICollection<JewelleryItem> JewelleryItems { get; set; } = new List<JewelleryItem>();
}
