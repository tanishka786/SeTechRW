using SeQrJewellery.Domain.Common;
using SeQrJewellery.Domain.Enums;

namespace SeQrJewellery.Domain.Entities.Tenant;

/// <summary>
/// Single-row (per tenant DB) configuration used to render Indian GST tax invoices as PDF.
/// </summary>
public class InvoiceSettings : BaseEntity
{
    public string ShopName { get; set; } = string.Empty;
    public string? AddressLine1 { get; set; }
    public string? AddressLine2 { get; set; }
    public string? City { get; set; }
    public string? State { get; set; }
    public string? StateCode { get; set; } // GST state code, e.g. "27"
    public string? PostalCode { get; set; }
    public string? Phone { get; set; }
    public string? Email { get; set; }
    public string? GSTIN { get; set; }
    public string? PAN { get; set; }
    public string? LogoPath { get; set; }

    // Bank / payment details
    public string? BankName { get; set; }
    public string? BankAccountName { get; set; }
    public string? BankAccountNumber { get; set; }
    public string? BankIFSC { get; set; }
    public string? BankBranch { get; set; }
    public string? UPIId { get; set; }
    public string? UPIQrCodePath { get; set; }

    // Invoice text
    public string? TermsAndConditions { get; set; }
    public string? Declaration { get; set; }
    public string? SignatoryName { get; set; }
    public string? SignatoryDesignation { get; set; }
    public string? Jurisdiction { get; set; }
    public string? DefaultHSNCode { get; set; }
    public string? Tagline { get; set; }
    public string? FooterNote { get; set; }

    // Display toggles
    public bool ShowIGST { get; set; } = false; // false => show CGST/SGST
    public bool ShowHallmark { get; set; } = true;
    public bool ShowOldGoldSection { get; set; } = true;
    public bool ShowLogo { get; set; } = true;
    public bool ShowBankDetails { get; set; } = true;
    public bool ShowPaymentHistory { get; set; } = true;
    public bool ShowTagline { get; set; } = true;

    // Theme & layout
    /// <summary>Primary brand color as #RRGGBB (headers, accents).</summary>
    public string PrimaryColorHex { get; set; } = "#B45309";
    /// <summary>Secondary/accent color as #RRGGBB (totals highlight).</summary>
    public string AccentColorHex { get; set; } = "#FEF3C7";
    public InvoicePaperSize PaperSize { get; set; } = InvoicePaperSize.A4;
    /// <summary>Page margin in millimetres.</summary>
    public int MarginMm { get; set; } = 12;
    /// <summary>Logo height in millimetres when shown.</summary>
    public int LogoHeightMm { get; set; } = 18;
    /// <summary>Base body font size in points.</summary>
    public float FontSizePt { get; set; } = 9;

    // Razorpay
    public string? RazorpayKeyId { get; set; }
    public string? RazorpayKeySecret { get; set; }
    public bool RazorpayEnabled { get; set; } = false;
}
