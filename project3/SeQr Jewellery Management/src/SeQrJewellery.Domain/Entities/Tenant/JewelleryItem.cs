using SeQrJewellery.Domain.Common;
using SeQrJewellery.Domain.Enums;

namespace SeQrJewellery.Domain.Entities.Tenant;

public class JewelleryItem : BaseEntity
{
    public string SKU { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public Guid CategoryId { get; set; }
    public Guid MetalId { get; set; }
    public Guid PurityId { get; set; }
    public Guid? SupplierId { get; set; }

    // Weight & Measurements
    public decimal GrossWeight { get; set; } // Total weight in grams
    public decimal NetWeight { get; set; } // Metal weight (excluding stones)
    public decimal StoneWeight { get; set; } = 0;
    /// <summary>Center / primary stone weight in carats (1 ct = 0.2 g).</summary>
    public decimal? StoneCarat { get; set; }
    /// <summary>Cut grade: Ideal, Excellent, Very Good, Good, Fair, Poor.</summary>
    public string? StoneCut { get; set; }
    /// <summary>Clarity: FL, IF, VVS1, VS1, SI1, etc.</summary>
    public string? StoneClarity { get; set; }
    /// <summary>Diamond color grade (D–Z or fancy). Separate from item metal Color.</summary>
    public string? StoneColor { get; set; }
    /// <summary>Certifying lab: GIA, IGI, HRD, SGL, etc.</summary>
    public string? CertificateLab { get; set; }
    public decimal WastagePercent { get; set; } = 0;
    public decimal WastageWeight { get; set; } = 0;

    // Pricing
    public decimal MetalRate { get; set; } // Rate per gram at time of pricing
    public decimal MetalValue { get; set; } // Calculated metal value
    public decimal MakingCharges { get; set; } = 0; // Computed ₹ amount applied to price
    public decimal MakingChargesPercent { get; set; } = 0; // Legacy: percentage of metal value
    /// <summary>How <see cref="MakingChargeValue"/> is interpreted.</summary>
    public MakingChargeType MakingChargeType { get; set; } = MakingChargeType.Lumpsum;
    /// <summary>Lumpsum ₹, % of metal value, or ₹ per gram depending on <see cref="MakingChargeType"/>.</summary>
    public decimal MakingChargeValue { get; set; } = 0;
    public decimal StoneCharges { get; set; } = 0;
    public decimal OtherCharges { get; set; } = 0;
    public decimal Discount { get; set; } = 0;
    public decimal TaxPercent { get; set; } = 3; // Default GST for gold
    public decimal TaxAmount { get; set; } = 0;
    public decimal SellingPrice { get; set; } = 0;
    public decimal CostPrice { get; set; } = 0;

    // Stock
    public int QuantityInStock { get; set; } = 0;
    public int ReorderLevel { get; set; } = 0;
    public string? Location { get; set; } // Physical location in store

    /// <summary>True when the piece is sold (typically qty hits 0 on a sale). Cleared when stock is restored.</summary>
    public bool IsSold { get; set; }
    public DateTime? SoldAt { get; set; }

    // Details
    public string? Design { get; set; }
    public string? Style { get; set; }
    public string? Size { get; set; }
    public string? Color { get; set; }
    public string? Occasion { get; set; }
    public string? Gender { get; set; }
    public string? Collection { get; set; }
    public string? CertificateNumber { get; set; } // GIA/IGI/BIS report ID
    public string? HallmarkNumber { get; set; }
    public bool IsBISCertified { get; set; } = false;
    public bool IsConsignment { get; set; } = false;
    public string? ImageUrls { get; set; } // JSON array of image URLs
    public string? Notes { get; set; }

    // Dates
    public DateTime? PurchaseDate { get; set; }
    public DateTime? LastSoldDate { get; set; }

    public Category Category { get; set; } = null!;
    public Metal Metal { get; set; } = null!;
    public Purity Purity { get; set; } = null!;
    public Supplier? Supplier { get; set; }

    public ICollection<JewelleryTag> Tags { get; set; } = new List<JewelleryTag>();
    public ICollection<ItemMedia> Media { get; set; } = new List<ItemMedia>();
    public ICollection<InvoiceItem> InvoiceItems { get; set; } = new List<InvoiceItem>();
    public ICollection<StockMovement> StockMovements { get; set; } = new List<StockMovement>();
    public ICollection<PrintQueue> PrintQueues { get; set; } = new List<PrintQueue>();
}
