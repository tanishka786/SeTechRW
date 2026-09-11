using System.Runtime.InteropServices;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Microsoft.ML.OnnxRuntime;
using Microsoft.ML.OnnxRuntime.Tensors;
using SeQrJewellery.Application.Interfaces;
using SixLabors.ImageSharp;
using SixLabors.ImageSharp.PixelFormats;
using SixLabors.ImageSharp.Processing;

namespace SeQrJewellery.Infrastructure.Services;

/// <summary>
/// Computes CLIP (ViT-B/32) image embeddings with ONNX Runtime for search-by-image.
/// The model file location comes from config key "Clip:ModelPath" (default: Models/clip-image-vit-b32.onnx
/// under the app content root / base directory).
/// </summary>
public sealed class ClipImageEmbeddingService : IImageEmbeddingService, IDisposable
{
    private const int ImageSize = 224;
    private static readonly float[] Mean = [0.48145466f, 0.4578275f, 0.40821073f];
    private static readonly float[] Std = [0.26862954f, 0.26130258f, 0.27577711f];

    private readonly string _modelPath;
    private readonly ILogger<ClipImageEmbeddingService> _logger;
    private readonly Lazy<(InferenceSession? Session, string? Error)> _session;
    private readonly SemaphoreSlim _inferenceLock = new(1, 1);

    public ClipImageEmbeddingService(
        IConfiguration configuration,
        IHostEnvironment hostEnvironment,
        ILogger<ClipImageEmbeddingService> logger)
    {
        _logger = logger;
        _modelPath = ResolveModelPath(configuration, hostEnvironment);
        _logger.LogInformation("CLIP model path resolved to '{Path}' (exists={Exists}).",
            _modelPath, File.Exists(_modelPath));
        _session = new Lazy<(InferenceSession?, string?)>(CreateSession, LazyThreadSafetyMode.ExecutionAndPublication);
    }

    public string ModelPath => _modelPath;

    public bool IsAvailable
    {
        get
        {
            var (session, _) = _session.Value;
            return session is not null;
        }
    }

    public string? UnavailableReason
    {
        get
        {
            var (session, error) = _session.Value;
            return session is null ? error : null;
        }
    }

    public async Task<byte[]?> EmbedImageFileAsync(string filePath, CancellationToken ct = default)
    {
        if (!File.Exists(filePath)) return null;
        var bytes = await File.ReadAllBytesAsync(filePath, ct);
        return await EmbedImageAsync(bytes, ct);
    }

    public async Task<byte[]?> EmbedImageAsync(byte[] imageBytes, CancellationToken ct = default)
    {
        var (session, _) = _session.Value;
        if (session is null) return null;

        var input = await PreprocessAsync(imageBytes, ct);

        await _inferenceLock.WaitAsync(ct);
        try
        {
            var inputName = session.InputMetadata.Keys.First();
            using var results = session.Run([NamedOnnxValue.CreateFromTensor(inputName, input)]);
            var output = results.First().AsEnumerable<float>().ToArray();
            Normalize(output);
            return MemoryMarshal.AsBytes<float>(output).ToArray();
        }
        finally
        {
            _inferenceLock.Release();
        }
    }

    /// <summary>Converts embedding bytes back to a float vector.</summary>
    public static float[] ToFloats(byte[] embedding)
    {
        var floats = new float[embedding.Length / sizeof(float)];
        Buffer.BlockCopy(embedding, 0, floats, 0, embedding.Length);
        return floats;
    }

    /// <summary>Cosine similarity of two unit-normalized embeddings.</summary>
    public static float CosineSimilarity(float[] a, float[] b)
    {
        if (a.Length != b.Length) return 0f;
        var dot = 0f;
        for (var i = 0; i < a.Length; i++) dot += a[i] * b[i];
        return dot;
    }

    private static string ResolveModelPath(IConfiguration configuration, IHostEnvironment hostEnvironment)
    {
        var configured = configuration["Clip:ModelPath"];
        if (!string.IsNullOrWhiteSpace(configured))
            return Path.GetFullPath(configured, hostEnvironment.ContentRootPath);

        // Prefer content root (IIS site folder), then AppContext.BaseDirectory as fallback.
        var candidates = new[]
        {
            Path.Combine(hostEnvironment.ContentRootPath, "Models", "clip-image-vit-b32.onnx"),
            Path.Combine(AppContext.BaseDirectory, "Models", "clip-image-vit-b32.onnx"),
        };

        foreach (var candidate in candidates)
        {
            if (File.Exists(candidate))
                return Path.GetFullPath(candidate);
        }

        return Path.GetFullPath(candidates[0]);
    }

    private (InferenceSession? Session, string? Error) CreateSession()
    {
        if (!File.Exists(_modelPath))
        {
            var msg =
                $"CLIP model file not found at '{_modelPath}'. " +
                "Place clip-image-vit-b32.onnx in the site Models folder, or set Clip:ModelPath in appsettings.";
            _logger.LogWarning("{Message}", msg);
            return (null, msg);
        }

        try
        {
            var session = new InferenceSession(_modelPath);
            _logger.LogInformation("CLIP model loaded successfully from '{Path}'.", _modelPath);
            return (session, null);
        }
        catch (Exception ex)
        {
            var msg =
                $"CLIP model file exists at '{_modelPath}' but failed to load: {ex.Message}. " +
                "Check that onnxruntime native binaries are present next to the app and the model file is complete (~350 MB).";
            _logger.LogError(ex, "Failed to load CLIP model from '{Path}'.", _modelPath);
            return (null, msg);
        }
    }

    private static async Task<DenseTensor<float>> PreprocessAsync(byte[] imageBytes, CancellationToken ct)
    {
        using var image = Image.Load<Rgb24>(imageBytes);
        image.Mutate(x => x.Resize(new ResizeOptions
        {
            Size = new Size(ImageSize, ImageSize),
            Mode = ResizeMode.Crop,
        }));

        var tensor = new DenseTensor<float>([1, 3, ImageSize, ImageSize]);
        image.ProcessPixelRows(accessor =>
        {
            for (var y = 0; y < accessor.Height; y++)
            {
                var row = accessor.GetRowSpan(y);
                for (var x = 0; x < row.Length; x++)
                {
                    var p = row[x];
                    tensor[0, 0, y, x] = (p.R / 255f - Mean[0]) / Std[0];
                    tensor[0, 1, y, x] = (p.G / 255f - Mean[1]) / Std[1];
                    tensor[0, 2, y, x] = (p.B / 255f - Mean[2]) / Std[2];
                }
            }
        });

        await Task.CompletedTask;
        return tensor;
    }

    private static void Normalize(float[] vector)
    {
        var norm = MathF.Sqrt(vector.Sum(v => v * v));
        if (norm <= 0f) return;
        for (var i = 0; i < vector.Length; i++) vector[i] /= norm;
    }

    public void Dispose()
    {
        if (_session.IsValueCreated) _session.Value.Session?.Dispose();
        _inferenceLock.Dispose();
    }
}
