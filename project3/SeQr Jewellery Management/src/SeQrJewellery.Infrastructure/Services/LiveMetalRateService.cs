using Microsoft.EntityFrameworkCore;
using SeQrJewellery.Application.DTOs.Catalog;
using SeQrJewellery.Domain.Entities.Tenant;
using SeQrJewellery.Domain.Helpers;
using SeQrJewellery.Infrastructure.Data;

namespace SeQrJewellery.Infrastructure.Services;

public readonly record struct ResolvedLiveRate(
    decimal RatePerGram,
    decimal? PreviousRate,
    DateTime? LastUpdated,
    string? Source);

/// <summary>Current metal rates from the latest rate history, used by the ticker and live billing.</summary>
public static class LiveMetalRateService
{
    private static readonly (string Metal, string[] PurityHints)[] TickerSpecs =
    [
        ("Gold", ["24K", "22K", "18K"]),
        ("Silver", ["925"]),
        ("Platinum", ["950"]),
    ];

    public static async Task<ResolvedLiveRate> ResolveAsync(
        TenantDbContext db, Guid metalId, Guid purityId, CancellationToken ct)
    {
        var latest = await db.MetalRates.AsNoTracking()
            .Where(r => r.MetalId == metalId && r.PurityId == purityId && !r.IsDeleted)
            .OrderByDescending(r => r.RateDate)
            .ThenByDescending(r => r.CreatedAt)
            .Select(r => new { r.RatePerGram, r.PreviousRate, r.RateDate, r.Source })
            .FirstOrDefaultAsync(ct);

        if (latest is not null && latest.RatePerGram > 0)
            return new ResolvedLiveRate(latest.RatePerGram, latest.PreviousRate, latest.RateDate, latest.Source);

        var metalRate = await db.Metals.AsNoTracking()
            .Where(m => m.Id == metalId)
            .Select(m => m.CurrentMarketRate)
            .FirstOrDefaultAsync(ct);
        var pct = await db.Purities.AsNoTracking()
            .Where(p => p.Id == purityId)
            .Select(p => p.PurityPercentage)
            .FirstOrDefaultAsync(ct);

        var computed = pct > 0 ? Math.Round(metalRate * pct / 100m, 2) : metalRate;
        return new ResolvedLiveRate(computed, null, null, "Market");
    }

    public static (decimal MetalValue, decimal MakingCharges, decimal TaxAmount, decimal SellingPrice)
        PriceItem(JewelleryItem item, decimal liveRate) =>
        PricingHelper.Calculate(
            item.NetWeight, liveRate, item.WastagePercent,
            item.MakingChargeType, item.MakingChargeValue,
            item.StoneCharges, item.OtherCharges, item.Discount, item.TaxPercent,
            item.MakingCharges, item.MakingChargesPercent);

    public static async Task<List<LiveMetalRateDto>> GetTickerRatesAsync(TenantDbContext db, CancellationToken ct)
    {
        var metals = await db.Metals.AsNoTracking()
            .Include(m => m.Purities)
            .Where(m => !m.IsDeleted && m.IsActive)
            .ToListAsync(ct);

        var result = new List<LiveMetalRateDto>();
        foreach (var (metalName, hints) in TickerSpecs)
        {
            var metal = metals.FirstOrDefault(m =>
                m.Name.Equals(metalName, StringComparison.OrdinalIgnoreCase));
            if (metal is null) continue;

            foreach (var hint in hints)
            {
                var purity = metal.Purities?
                    .Where(p => !p.IsDeleted)
                    .FirstOrDefault(p => p.Name.Contains(hint, StringComparison.OrdinalIgnoreCase));
                if (purity is null) continue;

                var resolved = await ResolveAsync(db, metal.Id, purity.Id, ct);
                result.Add(new LiveMetalRateDto
                {
                    MetalId = metal.Id,
                    MetalName = metal.Name,
                    Symbol = metal.Symbol,
                    PurityId = purity.Id,
                    PurityName = purity.Name,
                    RatePerGram = resolved.RatePerGram,
                    PreviousRatePerGram = resolved.PreviousRate,
                    ChangeAmount = resolved.PreviousRate.HasValue
                        ? resolved.RatePerGram - resolved.PreviousRate.Value
                        : null,
                    LastUpdated = resolved.LastUpdated,
                    Source = resolved.Source
                });
            }
        }

        return result;
    }
}
