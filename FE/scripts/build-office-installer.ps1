$ErrorActionPreference = "Stop"

$frontendDirectory = Split-Path -Parent $PSScriptRoot
$manifestSource = Join-Path $frontendDirectory "wordie-office-addin.production.xml"
$installerSource = Join-Path $frontendDirectory "installer"
$outputDirectory = Join-Path $frontendDirectory "release"
$stagingDirectory = Join-Path $outputDirectory "Wordie-MOS-Installer"
$zipPath = Join-Path $outputDirectory "Wordie-MOS-Installer-Windows.zip"

if (-not (Test-Path -LiteralPath $manifestSource)) {
    throw "Khong tim thay wordie-office-addin.production.xml. Hay chay npm run office:manifest:production truoc."
}

[xml]$manifest = Get-Content -LiteralPath $manifestSource -Raw
$namespace = New-Object System.Xml.XmlNamespaceManager($manifest.NameTable)
$namespace.AddNamespace("office", "http://schemas.microsoft.com/office/appforoffice/1.1")
$sourceLocation = $manifest.SelectSingleNode(
    "/office:OfficeApp/office:DefaultSettings/office:SourceLocation",
    $namespace
).DefaultValue

if ($sourceLocation -match "localhost|127\.0\.0\.1") {
    throw "Manifest production van dang tro toi localhost."
}

New-Item -ItemType Directory -Path $outputDirectory -Force | Out-Null
Remove-Item -LiteralPath $stagingDirectory -Recurse -Force -ErrorAction SilentlyContinue
Remove-Item -LiteralPath $zipPath -Force -ErrorAction SilentlyContinue
New-Item -ItemType Directory -Path $stagingDirectory -Force | Out-Null

Copy-Item -LiteralPath (Join-Path $installerSource "Cai-Wordie.cmd") -Destination $stagingDirectory
Copy-Item -LiteralPath (Join-Path $installerSource "Go-Wordie.cmd") -Destination $stagingDirectory
Copy-Item -LiteralPath (Join-Path $installerSource "Install-Wordie.ps1") -Destination $stagingDirectory
Copy-Item -LiteralPath (Join-Path $installerSource "Uninstall-Wordie.ps1") -Destination $stagingDirectory
Copy-Item -LiteralPath $manifestSource -Destination $stagingDirectory

Compress-Archive -Path (Join-Path $stagingDirectory "*") -DestinationPath $zipPath -CompressionLevel Optimal

Write-Host "Da tao bo cai: $zipPath" -ForegroundColor Green
