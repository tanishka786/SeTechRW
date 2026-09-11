# Downloads the CLIP ViT-B/32 image encoder (ONNX) used by inventory search-by-image.
# Target: src/SeQrJewellery.API/Models/clip-image-vit-b32.onnx (~350 MB, one-time download).
# Re-run safe: skips the download when the file already exists.

$ErrorActionPreference = 'Stop'

$modelUrl = 'https://huggingface.co/Qdrant/clip-ViT-B-32-vision/resolve/main/model.onnx'
$targetDir = Join-Path $PSScriptRoot '..\src\SeQrJewellery.API\Models'
$targetFile = Join-Path $targetDir 'clip-image-vit-b32.onnx'

if (Test-Path $targetFile) {
    Write-Host "Model already present: $targetFile"
    exit 0
}

New-Item -ItemType Directory -Force -Path $targetDir | Out-Null

Write-Host "Downloading CLIP ViT-B/32 image encoder (~350 MB)..."
Write-Host "  From: $modelUrl"
Write-Host "  To:   $targetFile"

# BITS is faster/resumable when available; fall back to Invoke-WebRequest
try {
    Start-BitsTransfer -Source $modelUrl -Destination $targetFile
}
catch {
    Invoke-WebRequest -Uri $modelUrl -OutFile $targetFile
}

Write-Host "Done. Restart the API to enable search-by-image."
