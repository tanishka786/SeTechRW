namespace SeQrJewellery.API.Services;

public interface IMediaFileStorage
{
    /// <summary>Saves the stream and returns the relative URL (e.g. /uploads/tenant/items/{itemId}/{mediaId}.jpg).</summary>
    Task<string> SaveAsync(string tenantIdentifier, Guid itemId, Guid mediaId, string originalFileName, Stream content, CancellationToken ct);
    /// <summary>Saves a one-off file (e.g. invoice logo) under /uploads/{tenant}/{category}/{fileName} and returns the relative URL.</summary>
    Task<string> SaveGenericAsync(string tenantIdentifier, string category, string originalFileName, Stream content, CancellationToken ct);
    void Delete(string relativeUrl);
    string? GetPhysicalPath(string relativeUrl);
}

/// <summary>Stores media on the server disk under the configured upload root, served at /uploads.</summary>
public class MediaFileStorage : IMediaFileStorage
{
    public const string RequestPath = "/uploads";

    private readonly string _root;

    public MediaFileStorage(IConfiguration config, IWebHostEnvironment env)
    {
        var configured = config["Media:StorageRoot"];
        _root = string.IsNullOrWhiteSpace(configured)
            ? Path.Combine(env.WebRootPath ?? Path.Combine(env.ContentRootPath, "wwwroot"), "uploads")
            : Path.GetFullPath(configured, env.ContentRootPath);
        Directory.CreateDirectory(_root);
    }

    public string Root => _root;

    public async Task<string> SaveAsync(string tenantIdentifier, Guid itemId, Guid mediaId, string originalFileName, Stream content, CancellationToken ct)
    {
        var safeTenant = Sanitize(tenantIdentifier);
        var ext = Path.GetExtension(originalFileName).ToLowerInvariant();
        var dir = Path.Combine(_root, safeTenant, "items", itemId.ToString());
        Directory.CreateDirectory(dir);

        var fileName = $"{mediaId}{ext}";
        var fullPath = Path.Combine(dir, fileName);
        await using var fs = new FileStream(fullPath, FileMode.Create, FileAccess.Write);
        await content.CopyToAsync(fs, ct);

        return $"{RequestPath}/{safeTenant}/items/{itemId}/{fileName}";
    }

    public async Task<string> SaveGenericAsync(string tenantIdentifier, string category, string originalFileName, Stream content, CancellationToken ct)
    {
        var safeTenant = Sanitize(tenantIdentifier);
        var safeCategory = Sanitize(category);
        var ext = Path.GetExtension(originalFileName).ToLowerInvariant();
        var dir = Path.Combine(_root, safeTenant, safeCategory);
        Directory.CreateDirectory(dir);

        var fileName = $"{Guid.NewGuid()}{ext}";
        var fullPath = Path.Combine(dir, fileName);
        await using var fs = new FileStream(fullPath, FileMode.Create, FileAccess.Write);
        await content.CopyToAsync(fs, ct);

        return $"{RequestPath}/{safeTenant}/{safeCategory}/{fileName}";
    }

    public void Delete(string relativeUrl)
    {
        var path = GetPhysicalPath(relativeUrl);
        if (path is not null && File.Exists(path))
            File.Delete(path);
    }

    public string? GetPhysicalPath(string relativeUrl)
    {
        if (!relativeUrl.StartsWith(RequestPath + "/", StringComparison.OrdinalIgnoreCase)) return null;
        var relative = relativeUrl[(RequestPath.Length + 1)..].Replace('/', Path.DirectorySeparatorChar);
        var full = Path.GetFullPath(Path.Combine(_root, relative));
        // Guard against path traversal
        return full.StartsWith(_root, StringComparison.OrdinalIgnoreCase) ? full : null;
    }

    private static string Sanitize(string value)
    {
        var invalid = Path.GetInvalidFileNameChars();
        return new string(value.Where(c => !invalid.Contains(c)).ToArray());
    }
}
