<#
.SYNOPSIS
    Builds and packages the SeQr Jewellery Management System for deployment.

.DESCRIPTION
    1. Builds the React UI (npm run build)
    2. Copies the React dist/ into the API's wwwroot/
    3. Publishes the .NET API as a self-contained Windows x64 app
    4. Outputs a ready-to-deploy folder at ./publish/

.USAGE
    .\deploy.ps1
    .\deploy.ps1 -OutputPath "C:\Deployments\SeQrJewellery"
#>

param(
    [string]$OutputPath = "$PSScriptRoot\publish",
    [string]$NodePath = "C:\nodejs\node-v22.12.0-win-x64"
)

$ErrorActionPreference = "Stop"
$RepoRoot = $PSScriptRoot
$WebProject = "$RepoRoot\src\SeQrJewellery.Web"
$ApiProject = "$RepoRoot\src\SeQrJewellery.API"
$WwwRoot = "$ApiProject\wwwroot"

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  SeQr Jewellery - Deployment Build     " -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# ── 1. Add Node to PATH ───────────────────────────────────────────────
if (Test-Path $NodePath) {
    $env:PATH = "$NodePath;" + $env:PATH
    Write-Host "[1/4] Node $(node --version) detected." -ForegroundColor Green
} else {
    Write-Error "Node.js not found at $NodePath. Install Node.js first."
}

# ── 2. Build React UI ─────────────────────────────────────────────────
Write-Host ""
Write-Host "[2/4] Building React UI..." -ForegroundColor Yellow
Set-Location $WebProject

# Vite writes warnings to stderr; with ErrorActionPreference=Stop, PowerShell
# treats those as terminating errors even when the build succeeds.
$prevEap = $ErrorActionPreference
$ErrorActionPreference = "Continue"
npm install --silent 2>&1 | Out-Host
if ($LASTEXITCODE -ne 0) {
    $ErrorActionPreference = $prevEap
    Write-Error "npm install failed."
}
npm run build 2>&1 | Out-Host
$buildExit = $LASTEXITCODE
$ErrorActionPreference = $prevEap
if ($buildExit -ne 0) { Write-Error "React build failed." }
if (-not (Test-Path "$WebProject\dist\index.html")) { Write-Error "React build output missing (dist/index.html)." }
Write-Host "      React build complete -> dist/" -ForegroundColor Green

# ── 3. Copy dist/ into API wwwroot/ ──────────────────────────────────
Write-Host ""
Write-Host "[3/4] Copying React dist/ to API wwwroot/..." -ForegroundColor Yellow
if (Test-Path $WwwRoot) { Remove-Item $WwwRoot -Recurse -Force }
New-Item -ItemType Directory -Path $WwwRoot | Out-Null
Copy-Item "$WebProject\dist\*" -Destination $WwwRoot -Recurse
Write-Host "      Copied to $WwwRoot" -ForegroundColor Green

# ── 4. Publish .NET API ───────────────────────────────────────────────
Write-Host ""
Write-Host "[4/4] Publishing .NET API (self-contained, win-x64)..." -ForegroundColor Yellow
Set-Location $RepoRoot
if (Test-Path $OutputPath) { Remove-Item $OutputPath -Recurse -Force }

dotnet publish "$ApiProject\SeQrJewellery.API.csproj" `
    --configuration Release `
    --runtime win-x64 `
    --self-contained true `
    --output $OutputPath `
    -p:PublishSingleFile=false `
    -p:PublishReadyToRun=true

if ($LASTEXITCODE -ne 0) { Write-Error ".NET publish failed." }

# ── Done ──────────────────────────────────────────────────────────────
Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "  Build Complete!                        " -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "  Publish folder : $OutputPath" -ForegroundColor White
Write-Host ""
Write-Host "  NEXT STEPS ON THE AWS VM:" -ForegroundColor Cyan
Write-Host "  1. Copy the '$OutputPath' folder to the VM" -ForegroundColor White
Write-Host "  2. Edit appsettings.Production.json (connection string, JWT secret)" -ForegroundColor White
Write-Host "  3. Run the IIS setup script: .\setup-iis.ps1" -ForegroundColor White
Write-Host ""
