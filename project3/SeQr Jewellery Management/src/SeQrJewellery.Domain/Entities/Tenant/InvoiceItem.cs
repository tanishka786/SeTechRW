using SeQrJewellery.Domain.Common;

namespace SeQrJewellery.Domain.Entities.Tenant;

public class InvoiceItem : BaseEntity
{
    public Guid InvoiceId { get; set; }
    public Guid JewelleryItemId { get; set; }
    public string? TagValue { get; set; } // Scanned tag value
    public int Quantity { get; set; } = 1;

    // Weight snapshot at sale time
    public decimal GrossWeight { get; set; }
    public decimal NetWeight { get; set; }
    public decimal StoneWeight { get; set; }

    // Pricing snapshot
    public decimal MetalRate { get; set; }
    public decimal MetalValue { get; set; }
    public decimal MakingCharges { get; set; }
    public decimal StoneCharges { get; set; }
    public decimal OtherCharges { get; set; }
    public decimal Discount { get; set; }
    public decimal TaxPercent { get; set; }
    public decimal TaxAmount { get; set; }
    public decimal UnitPrice { get; set; }
    public decimal TotalPrice { get; set; }

    public Invoice Invoice { get; set; } = null!;
    public JewelleryItem JewelleryItem { get; set; } = null!;
}
