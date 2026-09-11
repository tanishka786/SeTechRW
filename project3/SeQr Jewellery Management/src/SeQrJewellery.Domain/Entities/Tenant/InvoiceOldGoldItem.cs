using SeQrJewellery.Domain.Common;

namespace SeQrJewellery.Domain.Entities.Tenant;

/// <summary>One old-gold / exchange piece attached to an invoice (purchase ledger line).</summary>
public class InvoiceOldGoldItem : BaseEntity
{
    public Guid InvoiceId { get; set; }
    public string Description { get; set; } = string.Empty;
    public decimal GrossWeight { get; set; }
    /// <summary>Karat purity % (e.g. 91.6 for 22K) or XRF reading when provided.</summary>
    public decimal PurityPercent { get; set; }
    public decimal? XrfPurityPercent { get; set; }
    public decimal MeltingLossPercent { get; set; } = 1;
    public decimal BuyingRatePerGram { get; set; }
    public decimal FineWeight { get; set; }
    public decimal PayableWeight { get; set; }
    public decimal CreditAmount { get; set; }

    public Invoice Invoice { get; set; } = null!;
}
