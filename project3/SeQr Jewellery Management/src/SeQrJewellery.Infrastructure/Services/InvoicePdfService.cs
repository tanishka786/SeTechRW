using QuestPDF.Fluent;
using QuestPDF.Helpers;
using QuestPDF.Infrastructure;
using SeQrJewellery.Application.Interfaces;
using SeQrJewellery.Domain.Entities.Tenant;
using SeQrJewellery.Domain.Enums;
using SeQrJewellery.Domain.Helpers;

namespace SeQrJewellery.Infrastructure.Services;

/// <summary>Renders an Indian GST-compliant tax invoice as a PDF using QuestPDF.</summary>
public class InvoicePdfService : IInvoicePdfService
{
    public byte[] GenerateInvoicePdf(Invoice invoice, InvoiceSettings? settings, byte[]? logoBytes = null)
    {
        settings ??= new InvoiceSettings { ShopName = "Jewellery Store" };
        var primary = ParseColor(settings.PrimaryColorHex, Colors.Amber.Darken2);
        var accent = ParseColor(settings.AccentColorHex, Colors.Amber.Lighten4);
        var pageSize = ResolvePageSize(settings.PaperSize);
        var margin = Math.Clamp(settings.MarginMm, 5, 40);
        var fontSize = settings.FontSizePt > 0 ? settings.FontSizePt : 9f;
        var logoHeight = Math.Clamp(settings.LogoHeightMm, 8, 40);

        var document = Document.Create(container =>
        {
            container.Page(page =>
            {
                page.Size(pageSize);
                page.Margin(margin, Unit.Millimetre);
                page.DefaultTextStyle(x => x.FontSize(fontSize).FontFamily(Fonts.Calibri));

                page.Header().Element(c => ComposeHeader(c, invoice, settings, primary, logoBytes, logoHeight));
                page.Content().Element(c => ComposeContent(c, invoice, settings, primary, accent));
                page.Footer().Element(c => ComposeFooter(c, settings));
            });
        });

        return document.GeneratePdf();
    }

    private static void ComposeHeader(
        IContainer container, Invoice invoice, InvoiceSettings s, string primary, byte[]? logoBytes, int logoHeightMm)
    {
        container.Column(col =>
        {
            col.Item().Row(row =>
            {
                if (s.ShowLogo && logoBytes is { Length: > 0 })
                {
                    row.ConstantItem(logoHeightMm * 3.2f).Height(logoHeightMm, Unit.Millimetre)
                        .Image(logoBytes).FitArea();
                    row.ConstantItem(8);
                }

                row.RelativeItem().Column(c =>
                {
                    c.Item().Text(s.ShopName).FontSize(18).Bold().FontColor(primary);
                    if (s.ShowTagline && !string.IsNullOrWhiteSpace(s.Tagline))
                        c.Item().Text(s.Tagline).FontSize(8).Italic().FontColor(Colors.Grey.Darken1);
                    if (!string.IsNullOrWhiteSpace(s.AddressLine1)) c.Item().Text(s.AddressLine1).FontSize(8);
                    if (!string.IsNullOrWhiteSpace(s.AddressLine2)) c.Item().Text(s.AddressLine2).FontSize(8);
                    var cityLine = string.Join(", ", new[] { s.City, s.State, s.PostalCode }.Where(x => !string.IsNullOrWhiteSpace(x)));
                    if (!string.IsNullOrWhiteSpace(cityLine)) c.Item().Text(cityLine).FontSize(8);
                    if (!string.IsNullOrWhiteSpace(s.Phone)) c.Item().Text($"Phone: {s.Phone}").FontSize(8);
                    if (!string.IsNullOrWhiteSpace(s.Email)) c.Item().Text($"Email: {s.Email}").FontSize(8);
                    if (!string.IsNullOrWhiteSpace(s.GSTIN)) c.Item().Text($"GSTIN: {s.GSTIN}").FontSize(8).Bold();
                    if (!string.IsNullOrWhiteSpace(s.PAN)) c.Item().Text($"PAN: {s.PAN}").FontSize(8);
                    if (!string.IsNullOrWhiteSpace(s.StateCode)) c.Item().Text($"State Code: {s.StateCode}").FontSize(8);
                });

                row.ConstantItem(160).Column(c =>
                {
                    c.Item().AlignRight().Text("TAX INVOICE").FontSize(14).Bold().FontColor(primary);
                    c.Item().AlignRight().Text(invoice.InvoiceType.ToString()).FontSize(8).FontColor(Colors.Grey.Darken1);
                    c.Item().PaddingTop(4).AlignRight().Text($"No: {invoice.InvoiceNumber}").FontSize(9).Bold();
                    c.Item().AlignRight().Text($"Date: {invoice.InvoiceDate:dd/MM/yyyy}").FontSize(8);
                    if (invoice.DueDate.HasValue)
                        c.Item().AlignRight().Text($"Due: {invoice.DueDate:dd/MM/yyyy}").FontSize(8);
                    if (!string.IsNullOrWhiteSpace(s.Jurisdiction))
                        c.Item().AlignRight().Text($"Jurisdiction: {s.Jurisdiction}").FontSize(7).FontColor(Colors.Grey.Darken1);
                });
            });

            col.Item().PaddingTop(8).LineHorizontal(1.5f).LineColor(primary);

            col.Item().PaddingTop(6).Row(row =>
            {
                row.RelativeItem().Border(1).BorderColor(Colors.Grey.Lighten2).Padding(6).Column(c =>
                {
                    c.Item().Text("Bill To").FontSize(8).Bold().FontColor(Colors.Grey.Darken2);
                    c.Item().Text(invoice.Customer != null ? $"{invoice.Customer.FirstName} {invoice.Customer.LastName}".Trim() : "Walk-in Customer").Bold();
                    if (invoice.Customer != null)
                    {
                        if (!string.IsNullOrWhiteSpace(invoice.Customer.Phone)) c.Item().Text(invoice.Customer.Phone);
                        if (!string.IsNullOrWhiteSpace(invoice.Customer.Address)) c.Item().Text(invoice.Customer.Address);
                        var cust = string.Join(", ", new[] { invoice.Customer.City, invoice.Customer.State }.Where(x => !string.IsNullOrWhiteSpace(x)));
                        if (!string.IsNullOrWhiteSpace(cust)) c.Item().Text(cust);
                        if (!string.IsNullOrWhiteSpace(invoice.Customer.GST)) c.Item().Text($"GSTIN: {invoice.Customer.GST}");
                        if (!string.IsNullOrWhiteSpace(invoice.Customer.PAN)) c.Item().Text($"PAN: {invoice.Customer.PAN}");
                    }
                });

                row.ConstantItem(10);

                row.ConstantItem(180).Border(1).BorderColor(Colors.Grey.Lighten2).Padding(6).Column(c =>
                {
                    c.Item().Text("Payment Status").FontSize(8).Bold().FontColor(Colors.Grey.Darken2);
                    c.Item().Text(invoice.Status.ToString()).Bold().FontColor(primary);
                    c.Item().PaddingTop(3).Text($"Tax Type: {(invoice.IsIGST || s.ShowIGST ? "IGST (Interstate)" : "CGST + SGST")}").FontSize(8);
                    c.Item().Text($"Paid: ₹{invoice.PaidAmount:N2}").FontSize(8);
                    if (invoice.BalanceAmount > 0)
                        c.Item().Text($"Balance: ₹{invoice.BalanceAmount:N2}").FontSize(8).FontColor(Colors.Red.Darken2);
                });
            });
        });
    }

    private static void ComposeContent(
        IContainer container, Invoice invoice, InvoiceSettings s, string primary, string accent)
    {
        container.PaddingTop(10).Column(col =>
        {
            col.Item().Table(table =>
            {
                table.ColumnsDefinition(cols =>
                {
                    cols.ConstantColumn(20);
                    cols.RelativeColumn(3);
                    cols.RelativeColumn(1.1f);
                    cols.RelativeColumn(1.2f);
                    cols.RelativeColumn(1.2f);
                    cols.RelativeColumn(1.3f);
                    cols.RelativeColumn(1.3f);
                    cols.RelativeColumn(1);
                    cols.RelativeColumn(1.4f);
                });

                table.Header(header =>
                {
                    IContainer HeaderCell(IContainer c) => c.DefaultTextStyle(x => x.SemiBold().FontColor(Colors.White).FontSize(7.5f))
                        .Background(primary).PaddingVertical(5).PaddingHorizontal(2).AlignCenter();

                    header.Cell().Element(HeaderCell).Text("#");
                    header.Cell().Element(HeaderCell).AlignLeft().Text("Item / SKU");
                    header.Cell().Element(HeaderCell).Text("HSN");
                    header.Cell().Element(HeaderCell).Text("Gross(g)");
                    header.Cell().Element(HeaderCell).Text("Net(g)");
                    header.Cell().Element(HeaderCell).Text("Metal Val.");
                    header.Cell().Element(HeaderCell).Text("Making");
                    header.Cell().Element(HeaderCell).Text("Tax%");
                    header.Cell().Element(HeaderCell).AlignRight().Text("Amount");
                });

                var i = 1;
                foreach (var item in invoice.Items)
                {
                    static IContainer BodyCell(IContainer c) => c.BorderBottom(0.5f).BorderColor(Colors.Grey.Lighten2)
                        .PaddingVertical(4).PaddingHorizontal(2).AlignCenter();

                    table.Cell().Element(BodyCell).Text(i.ToString());
                    table.Cell().Element(BodyCell).AlignLeft().Column(c =>
                    {
                        c.Item().Text(item.JewelleryItem?.Name ?? "Item").FontSize(8);
                        c.Item().Text(item.JewelleryItem?.SKU ?? "").FontSize(6.5f).FontColor(Colors.Grey.Darken1);
                        if (item.JewelleryItem?.IsBISCertified == true && s.ShowHallmark)
                            c.Item().Text($"Hallmark: {item.JewelleryItem.HallmarkNumber ?? "BIS"}").FontSize(6.5f).FontColor(Colors.Grey.Darken1);
                        var stone = StoneSpecHelper.Format(
                            item.JewelleryItem?.StoneCarat, item.JewelleryItem?.StoneCut, item.JewelleryItem?.StoneClarity,
                            item.JewelleryItem?.StoneColor, item.JewelleryItem?.CertificateLab, item.JewelleryItem?.CertificateNumber);
                        if (!string.IsNullOrEmpty(stone))
                            c.Item().Text(stone).FontSize(6.5f).FontColor(Colors.Grey.Darken1);
                    });
                    table.Cell().Element(BodyCell).Text(s.DefaultHSNCode ?? "7113");
                    table.Cell().Element(BodyCell).Text(item.GrossWeight.ToString("0.000"));
                    table.Cell().Element(BodyCell).Text(item.NetWeight.ToString("0.000"));
                    table.Cell().Element(BodyCell).Text(item.MetalValue.ToString("N2"));
                    table.Cell().Element(BodyCell).Text(item.MakingCharges.ToString("N2"));
                    table.Cell().Element(BodyCell).Text(item.TaxPercent.ToString("0.##"));
                    table.Cell().Element(BodyCell).AlignRight().Text(item.TotalPrice.ToString("N2"));
                    i++;
                }
            });

            col.Item().PaddingTop(10).Row(row =>
            {
                row.RelativeItem().Column(c =>
                {
                    if (s.ShowOldGoldSection && invoice.OldGoldAmount > 0)
                    {
                        c.Item().Background(Colors.Grey.Lighten4).Padding(6).Column(og =>
                        {
                            og.Item().Text("Old Gold Exchange Voucher").Bold().FontSize(8);
                            if (invoice.OldGoldItems?.Count > 0)
                            {
                                foreach (var piece in invoice.OldGoldItems)
                                {
                                    var purity = piece.XrfPurityPercent ?? piece.PurityPercent;
                                    og.Item().Text(
                                        $"{piece.Description}: {piece.GrossWeight:0.000}g × {purity:0.##}% − {piece.MeltingLossPercent:0.##}% melt @ ₹{piece.BuyingRatePerGram:N2}/g = ₹{piece.CreditAmount:N2}"
                                    ).FontSize(7);
                                }
                            }
                            og.Item().Text($"Total weight: {invoice.OldGoldWeight:0.000}g").FontSize(7.5f);
                            og.Item().Text($"Credited amount: ₹{invoice.OldGoldAmount:N2}").FontSize(7.5f).SemiBold();
                        });
                    }

                    if (s.ShowPaymentHistory && invoice.Payments.Count > 0)
                    {
                        c.Item().PaddingTop(8).Text("Payments Received").Bold().FontSize(8);
                        foreach (var p in invoice.Payments.OrderBy(x => x.PaymentDate))
                        {
                            var detail = p.PaymentMethod switch
                            {
                                PaymentMethod.Cheque => $"Cheque {p.ChequeNumber}" + (string.IsNullOrWhiteSpace(p.BankName) ? "" : $" ({p.BankName})"),
                                PaymentMethod.Cash => "Cash",
                                PaymentMethod.UPI => $"UPI {p.UPITransactionId ?? p.TransactionReference}",
                                PaymentMethod.Card => $"Card ****{p.CardLast4}",
                                PaymentMethod.BankTransfer => $"Bank {p.BankName ?? p.TransactionReference}",
                                _ => p.PaymentMethod.ToString()
                            };
                            c.Item().Text($"{p.PaymentDate:dd/MM/yyyy} · {detail} · ₹{p.Amount:N2}").FontSize(7.5f);
                        }
                    }

                    if (!string.IsNullOrWhiteSpace(s.Declaration))
                    {
                        c.Item().PaddingTop(8).Text("Declaration").Bold().FontSize(8);
                        c.Item().Text(s.Declaration).FontSize(7.5f).FontColor(Colors.Grey.Darken2);
                    }

                    if (!string.IsNullOrWhiteSpace(s.TermsAndConditions))
                    {
                        c.Item().PaddingTop(8).Text("Terms & Conditions").Bold().FontSize(8);
                        c.Item().Text(s.TermsAndConditions).FontSize(7.5f).FontColor(Colors.Grey.Darken2);
                    }

                    if (!string.IsNullOrWhiteSpace(invoice.Notes))
                    {
                        c.Item().PaddingTop(8).Text("Notes").Bold().FontSize(8);
                        c.Item().Text(invoice.Notes).FontSize(7.5f);
                    }
                });

                row.ConstantItem(14);

                row.ConstantItem(220).Column(c =>
                {
                    void Line(string label, decimal value, bool bold = false, bool negative = false)
                    {
                        c.Item().Row(r =>
                        {
                            var labelText = r.RelativeItem().Text(label).FontSize(bold ? 9.5f : 8.5f);
                            var valueText = r.ConstantItem(90).AlignRight().Text($"{(negative ? "-" : "")}₹{value:N2}").FontSize(bold ? 9.5f : 8.5f);
                            if (bold) { labelText.SemiBold(); valueText.SemiBold(); }
                        });
                    }

                    Line("Subtotal", invoice.SubTotal);
                    if (invoice.TotalDiscount > 0) Line("Discount", invoice.TotalDiscount, negative: true);
                    if (s.ShowIGST || invoice.IsIGST)
                        Line("IGST", invoice.IGST);
                    else
                    {
                        Line("CGST", invoice.CGST);
                        Line("SGST", invoice.SGST);
                    }
                    if (invoice.OldGoldAmount > 0) Line("Old Gold Credit", invoice.OldGoldAmount, negative: true);

                    c.Item().PaddingTop(4).LineHorizontal(1).LineColor(Colors.Grey.Darken1);
                    c.Item().PaddingTop(4).Background(accent).Padding(4).Row(r =>
                    {
                        r.RelativeItem().Text("Grand Total").Bold().FontSize(11).FontColor(primary);
                        r.ConstantItem(90).AlignRight().Text($"₹{invoice.TotalAmount:N2}").Bold().FontSize(11).FontColor(primary);
                    });

                    Line("Paid", invoice.PaidAmount);
                    if (invoice.BalanceAmount > 0)
                    {
                        c.Item().Row(r =>
                        {
                            r.RelativeItem().Text("Balance Due").Bold().FontColor(Colors.Red.Darken2).FontSize(9);
                            r.ConstantItem(90).AlignRight().Text($"₹{invoice.BalanceAmount:N2}").Bold().FontColor(Colors.Red.Darken2).FontSize(9);
                        });
                    }
                });
            });

            if (s.ShowBankDetails && (!string.IsNullOrWhiteSpace(s.BankAccountNumber) || !string.IsNullOrWhiteSpace(s.UPIId)))
            {
                col.Item().PaddingTop(14).Row(row =>
                {
                    row.RelativeItem().Border(1).BorderColor(Colors.Grey.Lighten2).Padding(6).Column(c =>
                    {
                        c.Item().Text("Bank Details").Bold().FontSize(8).FontColor(primary);
                        if (!string.IsNullOrWhiteSpace(s.BankName)) c.Item().Text($"Bank: {s.BankName}").FontSize(7.5f);
                        if (!string.IsNullOrWhiteSpace(s.BankAccountName)) c.Item().Text($"A/C Name: {s.BankAccountName}").FontSize(7.5f);
                        if (!string.IsNullOrWhiteSpace(s.BankAccountNumber)) c.Item().Text($"A/C No: {s.BankAccountNumber}").FontSize(7.5f);
                        if (!string.IsNullOrWhiteSpace(s.BankIFSC)) c.Item().Text($"IFSC: {s.BankIFSC}").FontSize(7.5f);
                        if (!string.IsNullOrWhiteSpace(s.BankBranch)) c.Item().Text($"Branch: {s.BankBranch}").FontSize(7.5f);
                        if (!string.IsNullOrWhiteSpace(s.UPIId)) c.Item().Text($"UPI: {s.UPIId}").FontSize(7.5f).Bold();
                    });

                    row.ConstantItem(10);

                    row.ConstantItem(160).AlignRight().Column(c =>
                    {
                        c.Item().PaddingTop(30).AlignCenter().Text("Authorised Signatory").FontSize(8);
                        if (!string.IsNullOrWhiteSpace(s.SignatoryName))
                            c.Item().AlignCenter().Text(s.SignatoryName).Bold().FontSize(8);
                        if (!string.IsNullOrWhiteSpace(s.SignatoryDesignation))
                            c.Item().AlignCenter().Text(s.SignatoryDesignation).FontSize(7).FontColor(Colors.Grey.Darken1);
                        c.Item().AlignCenter().Text($"For {s.ShopName}").FontSize(7).FontColor(Colors.Grey.Darken1);
                    });
                });
            }
        });
    }

    private static void ComposeFooter(IContainer container, InvoiceSettings s)
    {
        container.AlignCenter().Text(text =>
        {
            var note = string.IsNullOrWhiteSpace(s.FooterNote)
                ? "This is a computer generated invoice."
                : s.FooterNote;
            text.Span(note + " ").FontSize(7).FontColor(Colors.Grey.Darken1);
            text.Span("Page ").FontSize(7).FontColor(Colors.Grey.Darken1);
            text.CurrentPageNumber().FontSize(7).FontColor(Colors.Grey.Darken1);
            text.Span(" of ").FontSize(7).FontColor(Colors.Grey.Darken1);
            text.TotalPages().FontSize(7).FontColor(Colors.Grey.Darken1);
        });
    }

    private static PageSize ResolvePageSize(InvoicePaperSize size) => size switch
    {
        InvoicePaperSize.A5 => PageSizes.A5,
        InvoicePaperSize.Letter => PageSizes.Letter,
        _ => PageSizes.A4
    };

    private static string ParseColor(string? hex, string fallback)
    {
        if (string.IsNullOrWhiteSpace(hex)) return fallback;
        hex = hex.Trim();
        if (!hex.StartsWith('#')) hex = "#" + hex;
        if (hex.Length is not (4 or 7)) return fallback;
        try
        {
            _ = Color.FromHex(hex);
            return hex;
        }
        catch { return fallback; }
    }
}
