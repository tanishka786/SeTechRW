using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SeQrJewellery.API.Services;
using SeQrJewellery.Application.DTOs.Settings;
using SeQrJewellery.Application.Interfaces;
using SeQrJewellery.Domain.Entities.Tenant;
using SeQrJewellery.Domain.Enums;
using SeQrJewellery.Infrastructure.Data;

namespace SeQrJewellery.API.Controllers;

/// <summary>Tenant-level settings: invoice template configuration and social media OAuth credentials</summary>
[Authorize]
public class SettingsController : BaseController
{
    private readonly TenantDbContextAccessor _contextAccessor;
    private readonly ITenantContextAccessor _tenantContext;
    private readonly IMediaFileStorage _mediaStorage;

    public SettingsController(TenantDbContextAccessor contextAccessor, ITenantContextAccessor tenantContext, IMediaFileStorage mediaStorage)
    {
        _contextAccessor = contextAccessor;
        _tenantContext = tenantContext;
        _mediaStorage = mediaStorage;
    }

    // ---- Invoice settings (Phase 4) ----

    [HttpGet("invoice")]
    public async Task<IActionResult> GetInvoiceSettings(CancellationToken ct)
    {
        var db = await _contextAccessor.GetContextAsync(ct);
        var settings = await db.InvoiceSettings.AsNoTracking().FirstOrDefaultAsync(ct);
        return OkResult(MapToDto(settings));
    }

    [HttpPut("invoice")]
    public async Task<IActionResult> UpdateInvoiceSettings([FromBody] UpdateInvoiceSettingsRequest request, CancellationToken ct)
    {
        var db = await _contextAccessor.GetContextAsync(ct);
        var settings = await db.InvoiceSettings.FirstOrDefaultAsync(ct);
        if (settings is null)
        {
            settings = new InvoiceSettings();
            await db.InvoiceSettings.AddAsync(settings, ct);
        }

        settings.ShopName = request.ShopName;
        settings.AddressLine1 = request.AddressLine1;
        settings.AddressLine2 = request.AddressLine2;
        settings.City = request.City;
        settings.State = request.State;
        settings.StateCode = request.StateCode;
        settings.PostalCode = request.PostalCode;
        settings.Phone = request.Phone;
        settings.Email = request.Email;
        settings.GSTIN = request.GSTIN;
        settings.PAN = request.PAN;
        settings.BankName = request.BankName;
        settings.BankAccountName = request.BankAccountName;
        settings.BankAccountNumber = request.BankAccountNumber;
        settings.BankIFSC = request.BankIFSC;
        settings.BankBranch = request.BankBranch;
        settings.UPIId = request.UPIId;
        settings.TermsAndConditions = request.TermsAndConditions;
        settings.Declaration = request.Declaration;
        settings.SignatoryName = request.SignatoryName;
        settings.SignatoryDesignation = request.SignatoryDesignation;
        settings.Jurisdiction = request.Jurisdiction;
        settings.DefaultHSNCode = request.DefaultHSNCode;
        settings.Tagline = request.Tagline;
        settings.FooterNote = request.FooterNote;
        settings.ShowIGST = request.ShowIGST;
        settings.ShowHallmark = request.ShowHallmark;
        settings.ShowOldGoldSection = request.ShowOldGoldSection;
        settings.ShowLogo = request.ShowLogo;
        settings.ShowBankDetails = request.ShowBankDetails;
        settings.ShowPaymentHistory = request.ShowPaymentHistory;
        settings.ShowTagline = request.ShowTagline;
        settings.PrimaryColorHex = NormalizeHex(request.PrimaryColorHex, "#B45309");
        settings.AccentColorHex = NormalizeHex(request.AccentColorHex, "#FEF3C7");
        settings.PaperSize = request.PaperSize;
        settings.MarginMm = Math.Clamp(request.MarginMm, 5, 40);
        settings.LogoHeightMm = Math.Clamp(request.LogoHeightMm, 8, 40);
        settings.FontSizePt = Math.Clamp(request.FontSizePt, 7f, 14f);
        settings.RazorpayEnabled = request.RazorpayEnabled;
        settings.RazorpayKeyId = request.RazorpayKeyId;
        if (!string.IsNullOrWhiteSpace(request.RazorpayKeySecret))
            settings.RazorpayKeySecret = request.RazorpayKeySecret;

        await db.SaveChangesAsync(ct);
        return OkResult(MapToDto(settings), "Invoice settings saved.");
    }

    [HttpPost("invoice/logo")]
    [RequestSizeLimit(5 * 1024 * 1024)]
    public async Task<IActionResult> UploadLogo(IFormFile file, CancellationToken ct)
    {
        if (file is null || file.Length == 0) return BadRequestResult("No file uploaded.");

        var db = await _contextAccessor.GetContextAsync(ct);
        var settings = await db.InvoiceSettings.FirstOrDefaultAsync(ct);
        if (settings is null)
        {
            settings = new InvoiceSettings { ShopName = "Jewellery Store" };
            await db.InvoiceSettings.AddAsync(settings, ct);
        }

        await using var stream = file.OpenReadStream();
        var url = await _mediaStorage.SaveGenericAsync(_tenantContext.TenantIdentifier, "invoice-logo", file.FileName, stream, ct);
        settings.LogoPath = url;

        await db.SaveChangesAsync(ct);
        return OkResult(new { logoPath = url }, "Logo uploaded.");
    }

    // ---- Social credentials (Phase 9) ----

    [HttpGet("social")]
    public async Task<IActionResult> GetSocialSettings(CancellationToken ct)
    {
        var db = await _contextAccessor.GetContextAsync(ct);
        var accounts = await db.SocialAccounts.AsNoTracking().ToListAsync(ct);
        var google = accounts.FirstOrDefault(a => a.Platform == SocialPlatform.Google);
        var instagram = accounts.FirstOrDefault(a => a.Platform == SocialPlatform.Instagram);

        return OkResult(new SocialSettingsDto
        {
            GoogleConnected = google?.IsConnected == true,
            GoogleAccountName = google?.AccountName,
            InstagramConnected = instagram?.IsConnected == true,
            InstagramAccountName = instagram?.AccountName,
        });
    }

    [HttpPut("social/google")]
    public async Task<IActionResult> UpdateGoogleSocialSettings([FromBody] UpdateGoogleSocialSettingsRequest request, CancellationToken ct)
    {
        var db = await _contextAccessor.GetContextAsync(ct);
        var account = await db.SocialAccounts.FirstOrDefaultAsync(a => a.Platform == SocialPlatform.Google, ct);
        if (account is null)
        {
            account = new SocialAccount { Platform = SocialPlatform.Google };
            await db.SocialAccounts.AddAsync(account, ct);
        }

        account.AccountName = request.AccountName;
        account.AccountExternalId = request.AccountExternalId;
        if (!string.IsNullOrWhiteSpace(request.AccessToken)) account.AccessToken = request.AccessToken;
        if (!string.IsNullOrWhiteSpace(request.RefreshToken)) account.RefreshToken = request.RefreshToken;
        if (!string.IsNullOrWhiteSpace(request.ClientId)) account.ClientId = request.ClientId;
        if (!string.IsNullOrWhiteSpace(request.ClientSecret)) account.ClientSecret = request.ClientSecret;
        account.IsConnected = !string.IsNullOrWhiteSpace(account.AccessToken) && !string.IsNullOrWhiteSpace(account.AccountExternalId);

        await db.SaveChangesAsync(ct);
        return OkResult(true, "Google Business Profile settings saved.");
    }

    [HttpPut("social/instagram")]
    public async Task<IActionResult> UpdateInstagramSocialSettings([FromBody] UpdateInstagramSocialSettingsRequest request, CancellationToken ct)
    {
        var db = await _contextAccessor.GetContextAsync(ct);
        var account = await db.SocialAccounts.FirstOrDefaultAsync(a => a.Platform == SocialPlatform.Instagram, ct);
        if (account is null)
        {
            account = new SocialAccount { Platform = SocialPlatform.Instagram };
            await db.SocialAccounts.AddAsync(account, ct);
        }

        account.AccountName = request.AccountName;
        account.AccountExternalId = request.AccountExternalId;
        if (!string.IsNullOrWhiteSpace(request.AccessToken)) account.AccessToken = request.AccessToken;
        account.IsConnected = !string.IsNullOrWhiteSpace(account.AccessToken) && !string.IsNullOrWhiteSpace(account.AccountExternalId);

        await db.SaveChangesAsync(ct);
        return OkResult(true, "Instagram settings saved.");
    }

    private static InvoiceSettingsDto MapToDto(InvoiceSettings? s)
    {
        s ??= new InvoiceSettings { ShopName = "" };
        return new InvoiceSettingsDto
        {
            Id = s.Id,
            ShopName = s.ShopName,
            AddressLine1 = s.AddressLine1,
            AddressLine2 = s.AddressLine2,
            City = s.City,
            State = s.State,
            StateCode = s.StateCode,
            PostalCode = s.PostalCode,
            Phone = s.Phone,
            Email = s.Email,
            GSTIN = s.GSTIN,
            PAN = s.PAN,
            LogoPath = s.LogoPath,
            BankName = s.BankName,
            BankAccountName = s.BankAccountName,
            BankAccountNumber = s.BankAccountNumber,
            BankIFSC = s.BankIFSC,
            BankBranch = s.BankBranch,
            UPIId = s.UPIId,
            UPIQrCodePath = s.UPIQrCodePath,
            TermsAndConditions = s.TermsAndConditions,
            Declaration = s.Declaration,
            SignatoryName = s.SignatoryName,
            SignatoryDesignation = s.SignatoryDesignation,
            Jurisdiction = s.Jurisdiction,
            DefaultHSNCode = s.DefaultHSNCode,
            Tagline = s.Tagline,
            FooterNote = s.FooterNote,
            ShowIGST = s.ShowIGST,
            ShowHallmark = s.ShowHallmark,
            ShowOldGoldSection = s.ShowOldGoldSection,
            ShowLogo = s.ShowLogo,
            ShowBankDetails = s.ShowBankDetails,
            ShowPaymentHistory = s.ShowPaymentHistory,
            ShowTagline = s.ShowTagline,
            PrimaryColorHex = s.PrimaryColorHex,
            AccentColorHex = s.AccentColorHex,
            PaperSize = s.PaperSize,
            MarginMm = s.MarginMm,
            LogoHeightMm = s.LogoHeightMm,
            FontSizePt = s.FontSizePt,
            RazorpayEnabled = s.RazorpayEnabled,
            RazorpayKeyId = s.RazorpayKeyId,
            RazorpayKeySecretConfigured = !string.IsNullOrWhiteSpace(s.RazorpayKeySecret),
        };
    }

    private static string NormalizeHex(string? hex, string fallback)
    {
        if (string.IsNullOrWhiteSpace(hex)) return fallback;
        hex = hex.Trim();
        if (!hex.StartsWith('#')) hex = "#" + hex;
        return hex.Length is 4 or 7 ? hex.ToUpperInvariant() : fallback;
    }
}
