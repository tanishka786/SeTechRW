using SeQrJewellery.Domain.Enums;

namespace SeQrJewellery.Domain.Helpers;

public static class PricingHelper
{
    public static decimal ComputeMakingCharges(
        MakingChargeType type,
        decimal chargeValue,
        decimal metalValue,
        decimal netWeight,
        decimal legacyMakingCharges = 0,
        decimal legacyMakingChargesPercent = 0)
    {
        // Treat 0 / unknown as Lumpsum for legacy rows before migration backfill
        if (type == MakingChargeType.PercentOfMetalRate)
            return metalValue * chargeValue / 100m;
        if (type == MakingChargeType.PerGramAmount)
            return netWeight * chargeValue;
        if (legacyMakingChargesPercent > 0 && chargeValue <= 0 && type == 0)
            return metalValue * legacyMakingChargesPercent / 100m;
        return chargeValue > 0 ? chargeValue : legacyMakingCharges;
    }

    public static (decimal MetalValue, decimal MakingCharges, decimal TaxAmount, decimal SellingPrice) Calculate(
        decimal netWeight,
        decimal metalRate,
        decimal wastagePercent,
        MakingChargeType makingChargeType,
        decimal makingChargeValue,
        decimal stoneCharges,
        decimal otherCharges,
        decimal discount,
        decimal taxPercent,
        decimal legacyMakingCharges = 0,
        decimal legacyMakingChargesPercent = 0)
    {
        var metalValue = netWeight * metalRate * (1 + wastagePercent / 100m);
        var makingCharges = ComputeMakingCharges(
            makingChargeType, makingChargeValue, metalValue, netWeight,
            legacyMakingCharges, legacyMakingChargesPercent);
        var subTotal = metalValue + makingCharges + stoneCharges + otherCharges - discount;
        if (subTotal < 0) subTotal = 0;
        var taxAmount = subTotal * taxPercent / 100m;
        return (metalValue, makingCharges, taxAmount, subTotal + taxAmount);
    }
}
