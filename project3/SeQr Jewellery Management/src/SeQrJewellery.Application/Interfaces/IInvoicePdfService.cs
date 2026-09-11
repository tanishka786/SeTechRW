using SeQrJewellery.Domain.Entities.Tenant;

namespace SeQrJewellery.Application.Interfaces;

public interface IInvoicePdfService
{
    byte[] GenerateInvoicePdf(Invoice invoice, InvoiceSettings? settings, byte[]? logoBytes = null);
}
