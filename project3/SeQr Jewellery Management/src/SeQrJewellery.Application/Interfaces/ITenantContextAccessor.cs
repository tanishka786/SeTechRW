namespace SeQrJewellery.Application.Interfaces;

public interface ITenantContextAccessor
{
    Guid TenantId { get; }
    string TenantIdentifier { get; }
    string UserId { get; }
    string UserName { get; }
}
