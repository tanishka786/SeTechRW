namespace SeQrJewellery.Domain.Helpers;

public static class OldGoldExchangeHelper
{
    /// <summary>
    /// Fine = gross × purity%. Payable = fine after melting loss. Credit = payable × buying rate.
    /// </summary>
    public static (decimal FineWeight, decimal PayableWeight, decimal CreditAmount) Calculate(
        decimal grossWeight,
        decimal purityPercent,
        decimal meltingLossPercent,
        decimal buyingRatePerGram)
    {
        if (grossWeight <= 0 || buyingRatePerGram <= 0)
            return (0, 0, 0);

        var purity = Math.Clamp(purityPercent, 0, 100);
        var loss = Math.Clamp(meltingLossPercent, 0, 100);
        var fine = Math.Round(grossWeight * purity / 100m, 3, MidpointRounding.AwayFromZero);
        var payable = Math.Round(fine * (1 - loss / 100m), 3, MidpointRounding.AwayFromZero);
        var credit = Math.Round(payable * buyingRatePerGram, 2, MidpointRounding.AwayFromZero);
        return (fine, payable, credit);
    }
}
