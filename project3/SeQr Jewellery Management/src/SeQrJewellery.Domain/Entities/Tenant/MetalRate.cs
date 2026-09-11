using SeQrJewellery.Domain.Common;

namespace SeQrJewellery.Domain.Entities.Tenant;

public class MetalRate : BaseEntity
{
    public Guid MetalId { get; set; }
    public Guid PurityId { get; set; }
    public decimal RatePerGram { get; set; }
    public decimal RatePerTola { get; set; } // 1 tola = 11.664 grams
    public decimal RatePerOz { get; set; } // Troy oz = 31.1 grams
    public DateTime RateDate { get; set; } = DateTime.UtcNow;
    public string? Source { get; set; } // "Manual", "MCX", "IBJA"
    public string? Notes { get; set; }
    /// <summary>Rate per gram before this change (for audit/history).</summary>
    public decimal? PreviousRate { get; set; }
    public Guid? UpdatedByUserId { get; set; }
    public string? UpdatedByUserName { get; set; }
    /// <summary>How many unsold inventory items were repriced with this rate change.</summary>
    public int ItemsRepriced { get; set; }

    public Metal Metal { get; set; } = null!;
    public Purity Purity { get; set; } = null!;
}
