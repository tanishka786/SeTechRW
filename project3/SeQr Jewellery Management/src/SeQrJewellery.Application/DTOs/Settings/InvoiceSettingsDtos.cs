using SeQrJewellery.Domain.Enums;

namespace SeQrJewellery.Application.DTOs.Settings;

public class InvoiceSettingsDto
{
    public Guid Id { get; set; }
    public string ShopName { get; set; } = string.Empty;
    public string? AddressLine1 { get; set; }
    public string? AddressLine2 { get; set; }
    public string? City { get; set; }
    public string? State { get; set; }
    public string? StateCode { get; set; }
    public string? PostalCode { get; set; }
    public string? Phone { get; set; }
    public string? Email { get; set; }
    public string? GSTIN { get; set; }
    public string? PAN { get; set; }
    public string? LogoPath { get; set; }
    public string? BankName { get; set; }
    public string? BankAccountName { get; set; }
    public string? BankAccountNumber { get; set; }
    public string? BankIFSC { get; set; }
    public string? BankBranch { get; set; }
    public string? UPIId { get; set; }
    public string? UPIQrCodePath { get; set; }
    public string? TermsAndConditions { get; set; }
    public string? Declaration { get; set; }
    public string? SignatoryName { get; set; }
    public string? SignatoryDesignation { get; set; }
    public string? Jurisdiction { get; set; }
    public string? DefaultHSNCode { get; set; }
    public string? Tagline { get; set; }
    public string? FooterNote { get; set; }
    public bool ShowIGST { get; set; }
    public bool ShowHallmark { get; set; }
    public bool ShowOldGoldSection { get; set; }
    public bool ShowLogo { get; set; }
    public bool ShowBankDetails { get; set; }
    public bool ShowPaymentHistory { get; set; }
    public bool ShowTagline { get; set; }
    public string PrimaryColorHex { get; set; } = "#B45309";
    public string AccentColorHex { get; set; } = "#FEF3C7";
    public InvoicePaperSize PaperSize { get; set; } = InvoicePaperSize.A4;
    public int MarginMm { get; set; } = 12;
    public int LogoHeightMm { get; set; } = 18;
    public float FontSizePt { get; set; } = 9;
    public bool RazorpayEnabled { get; set; }
    public string? RazorpayKeyId { get; set; }
    /// <summary>Never sent back to client with an actual value; true means a secret is configured.</summary>
    public bool RazorpayKeySecretConfigured { get; set; }
    /// <summary>Cash (₹) at or above which PAN / KYC is required. Default 200000.</summary>
    public decimal CashPanLimit { get; set; } = 200_000m;
}

public class UpdateInvoiceSettingsRequest
{
    public string ShopName { get; set; } = string.Empty;
    public string? AddressLine1 { get; set; }
    public string? AddressLine2 { get; set; }
    public string? City { get; set; }
    public string? State { get; set; }
    public string? StateCode { get; set; }
    public string? PostalCode { get; set; }
    public string? Phone { get; set; }
    public string? Email { get; set; }
    public string? GSTIN { get; set; }
    public string? PAN { get; set; }
    public string? BankName { get; set; }
    public string? BankAccountName { get; set; }
    public string? BankAccountNumber { get; set; }
    public string? BankIFSC { get; set; }
    public string? BankBranch { get; set; }
    public string? UPIId { get; set; }
    public string? TermsAndConditions { get; set; }
    public string? Declaration { get; set; }
    public string? SignatoryName { get; set; }
    public string? SignatoryDesignation { get; set; }
    public string? Jurisdiction { get; set; }
    public string? DefaultHSNCode { get; set; }
    public string? Tagline { get; set; }
    public string? FooterNote { get; set; }
    public bool ShowIGST { get; set; }
    public bool ShowHallmark { get; set; } = true;
    public bool ShowOldGoldSection { get; set; } = true;
    public bool ShowLogo { get; set; } = true;
    public bool ShowBankDetails { get; set; } = true;
    public bool ShowPaymentHistory { get; set; } = true;
    public bool ShowTagline { get; set; } = true;
    public string PrimaryColorHex { get; set; } = "#B45309";
    public string AccentColorHex { get; set; } = "#FEF3C7";
    public InvoicePaperSize PaperSize { get; set; } = InvoicePaperSize.A4;
    public int MarginMm { get; set; } = 12;
    public int LogoHeightMm { get; set; } = 18;
    public float FontSizePt { get; set; } = 9;
    public bool RazorpayEnabled { get; set; }
    public string? RazorpayKeyId { get; set; }
    /// <summary>Only overwrites the stored secret when non-null/non-empty.</summary>
    public string? RazorpayKeySecret { get; set; }
    public decimal CashPanLimit { get; set; } = 200_000m;
}

public class SocialSettingsDto
{
    public bool GoogleConnected { get; set; }
    public string? GoogleAccountName { get; set; }
    public bool InstagramConnected { get; set; }
    public string? InstagramAccountName { get; set; }
}

public class UpdateGoogleSocialSettingsRequest
{
    public string? AccountName { get; set; }
    public string? AccountExternalId { get; set; }
    public string? AccessToken { get; set; }
    public string? RefreshToken { get; set; }
    public string? ClientId { get; set; }
    public string? ClientSecret { get; set; }
}

public class UpdateInstagramSocialSettingsRequest
{
    public string? AccountName { get; set; }
    public string? AccountExternalId { get; set; }
    public string? AccessToken { get; set; }
}
