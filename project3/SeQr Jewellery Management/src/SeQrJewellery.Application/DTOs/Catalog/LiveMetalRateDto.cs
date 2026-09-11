namespace SeQrJewellery.Application.DTOs.Catalog;

public class LiveMetalRateDto
{
    public Guid MetalId { get; set; }
    public string MetalName { get; set; } = string.Empty;
    public string Symbol { get; set; } = string.Empty;
    public Guid? PurityId { get; set; }
    public string PurityName { get; set; } = string.Empty;
    public decimal RatePerGram { get; set; }
    public decimal? PreviousRatePerGram { get; set; }
    public decimal? ChangeAmount { get; set; }
    public DateTime? LastUpdated { get; set; }
    public string? Source { get; set; }
}
