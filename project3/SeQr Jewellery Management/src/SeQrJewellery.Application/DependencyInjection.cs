using Microsoft.Extensions.DependencyInjection;

namespace SeQrJewellery.Application;

public static class DependencyInjection
{
    public static IServiceCollection AddApplication(this IServiceCollection services)
    {
        services.AddAutoMapper(cfg => { }, AppDomain.CurrentDomain.GetAssemblies());
        return services;
    }
}
