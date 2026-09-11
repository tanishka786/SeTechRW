namespace SeQrJewellery.Application.Interfaces;

/// <summary>Computes visual similarity embeddings for images (CLIP). Used by search-by-image.</summary>
public interface IImageEmbeddingService
{
    /// <summary>False when the ONNX model is not present or failed to load; embedding calls return null in that case.</summary>
    bool IsAvailable { get; }

    /// <summary>Resolved model file path the service is using.</summary>
    string ModelPath { get; }

    /// <summary>Human-readable reason when <see cref="IsAvailable"/> is false; null when available.</summary>
    string? UnavailableReason { get; }

    /// <summary>Embeds an image file. Returns the embedding as float32 bytes, or null when unavailable.</summary>
    Task<byte[]?> EmbedImageFileAsync(string filePath, CancellationToken ct = default);

    /// <summary>Embeds image bytes. Returns the embedding as float32 bytes, or null when unavailable.</summary>
    Task<byte[]?> EmbedImageAsync(byte[] imageBytes, CancellationToken ct = default);
}
