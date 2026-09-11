<#
.SYNOPSIS
    Sets up IIS on the AWS Windows VM to host the SeQr Jewellery app.

.DESCRIPTION
    Run this script ON THE AWS VM (as Administrator) after copying the publish folder.
    It installs the required Windows features, creates an IIS site, and configures the app.

.USAGE
    .\setup-iis.ps1
    .\setup-iis.ps1 -PublishPath "D:\Apps\SeQrJewellery" -Port 80
#>

param(
    [string]$PublishPath = "C:\inetpub\SeQrJewellery",
    [string]$SiteName    = "SeQrJewellery",
    [int]$Port           = 80,
    [string]$AppPoolName = "SeQrJewellery"
)

$ErrorActionPreference = "Stop"

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  SeQr Jewellery - IIS Setup            " -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

# Must be Administrator
if (-NOT ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]"Administrator")) {
    Write-Error "Run this script as Administrator."
}

# ── 1. Install IIS + ASP.NET Core Hosting Bundle prerequisite ─────────
Write-Host ""
Write-Host "[1/5] Installing IIS Windows features..." -ForegroundColor Yellow

$features = @(
    "IIS-WebServerRole", "IIS-WebServer", "IIS-CommonHttpFeatures",
    "IIS-StaticContent", "IIS-DefaultDocument", "IIS-HttpErrors",
    "IIS-ApplicationDevelopment", "IIS-ASPNET45",
    "IIS-HealthAndDiagnostics", "IIS-HttpLogging",
    "IIS-Security", "IIS-RequestFiltering",
    "IIS-Performance", "IIS-WebServerManagementTools",
    "IIS-ManagementConsole", "IIS-IIS6ManagementCompatibility",
    "IIS-Metabase", "NetFx4Extended-ASPNET45", "IIS-NetFxExtensibility45"
)

foreach ($f in $features) {
    $state = (Get-WindowsOptionalFeature -Online -FeatureName $f -ErrorAction SilentlyContinue).State
    if ($state -ne "Enabled") {
        Enable-WindowsOptionalFeature -Online -FeatureName $f -All -NoRestart | Out-Null
        Write-Host "      Enabled: $f" -ForegroundColor Gray
    }
}
Write-Host "      IIS features ready." -ForegroundColor Green

# ── 2. Download & install ASP.NET Core Hosting Bundle ────────────────
Write-Host ""
Write-Host "[2/5] Checking ASP.NET Core Hosting Bundle..." -ForegroundColor Yellow

$dotnetInstalled = Get-Command dotnet -ErrorAction SilentlyContinue
if (-not $dotnetInstalled) {
    Write-Host "      Downloading .NET 10 Hosting Bundle..." -ForegroundColor Gray
    $hostingBundleUrl = "https://dot.net/v1/dotnet-install.ps1"
    $installer = "$env:TEMP\dotnet-install.ps1"
    Invoke-WebRequest $hostingBundleUrl -OutFile $installer
    & $installer -Channel 10.0 -Runtime aspnetcore
    Write-Host "      .NET Hosting Bundle installed." -ForegroundColor Green
} else {
    Write-Host "      .NET $(dotnet --version) already installed." -ForegroundColor Green
}

# ── 3. Create publish directory and copy files ─────────────────────────
Write-Host ""
Write-Host "[3/5] Setting up publish directory..." -ForegroundColor Yellow

if (-not (Test-Path $PublishPath)) {
    New-Item -ItemType Directory -Path $PublishPath | Out-Null
}

# If running from the publish folder location, copy files there
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
if ($scriptDir -ne $PublishPath) {
    Write-Host "      Copying files from $scriptDir to $PublishPath..." -ForegroundColor Gray
    Copy-Item "$scriptDir\*" -Destination $PublishPath -Recurse -Force
}
Write-Host "      Files ready at $PublishPath" -ForegroundColor Green

# ── 4. Create IIS App Pool + Site ─────────────────────────────────────
Write-Host ""
Write-Host "[4/5] Configuring IIS..." -ForegroundColor Yellow

Import-Module WebAdministration

# App Pool (No Managed Code - required for ASP.NET Core)
if (-not (Test-Path "IIS:\AppPools\$AppPoolName")) {
    New-WebAppPool -Name $AppPoolName | Out-Null
}
Set-ItemProperty "IIS:\AppPools\$AppPoolName" -Name managedRuntimeVersion -Value ""
Set-ItemProperty "IIS:\AppPools\$AppPoolName" -Name startMode -Value "AlwaysRunning"
Set-ItemProperty "IIS:\AppPools\$AppPoolName" -Name processModel.idleTimeout -Value "00:00:00"
Write-Host "      App pool '$AppPoolName' configured." -ForegroundColor Gray

# Remove existing site if present
if (Get-Website -Name $SiteName -ErrorAction SilentlyContinue) {
    Remove-Website -Name $SiteName
}

# Create the site
New-Website -Name $SiteName `
            -PhysicalPath $PublishPath `
            -ApplicationPool $AppPoolName `
            -Port $Port `
            -Force | Out-Null

Write-Host "      IIS site '$SiteName' created on port $Port." -ForegroundColor Green

# ── 5. Set folder permissions for IIS_IUSRS ───────────────────────────
Write-Host ""
Write-Host "[5/5] Setting folder permissions..." -ForegroundColor Yellow

$acl = Get-Acl $PublishPath
$rule = New-Object System.Security.AccessControl.FileSystemAccessRule(
    "IIS_IUSRS", "ReadAndExecute", "ContainerInherit,ObjectInherit", "None", "Allow")
$acl.AddAccessRule($rule)

$ruleWrite = New-Object System.Security.AccessControl.FileSystemAccessRule(
    "IIS AppPool\$AppPoolName", "Modify", "ContainerInherit,ObjectInherit", "None", "Allow")
$acl.AddAccessRule($ruleWrite)
Set-Acl $PublishPath $acl
Write-Host "      Permissions set." -ForegroundColor Green

# ── Done ──────────────────────────────────────────────────────────────
Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "  IIS Setup Complete!                   " -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "  App URL  : http://YOUR-VM-IP:$Port" -ForegroundColor White
Write-Host "  API Docs : http://YOUR-VM-IP:$Port/scalar" -ForegroundColor White
Write-Host ""
Write-Host "  IMPORTANT - Before starting:" -ForegroundColor Yellow
Write-Host "  Edit: $PublishPath\appsettings.Production.json" -ForegroundColor White
Write-Host "    - Update ConnectionStrings.MainDatabase (SQL Server)" -ForegroundColor Gray
Write-Host "    - Set a strong JWT.Secret (32+ characters)" -ForegroundColor Gray
Write-Host ""
Write-Host "  Then restart the site:" -ForegroundColor Yellow
Write-Host "    iisreset  (or restart '$SiteName' in IIS Manager)" -ForegroundColor White
Write-Host ""
