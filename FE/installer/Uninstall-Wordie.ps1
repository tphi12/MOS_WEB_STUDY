$ErrorActionPreference = "Stop"

$addinId = "7192b75f-6ce0-4d93-a38d-91731c0a1c4f"
$installDirectory = Join-Path $env:LOCALAPPDATA "WordieMOS\OfficeAddin"
$developerRegistryPath = "HKCU:\SOFTWARE\Microsoft\Office\16.0\Wef\Developer"
$addinSettingsPath = Join-Path $developerRegistryPath $addinId

if (Test-Path -LiteralPath $developerRegistryPath) {
    Remove-ItemProperty -Path $developerRegistryPath -Name $addinId -ErrorAction SilentlyContinue
}

Remove-Item -LiteralPath $addinSettingsPath -Recurse -Force -ErrorAction SilentlyContinue
Remove-Item -LiteralPath $installDirectory -Recurse -Force -ErrorAction SilentlyContinue

Write-Host "Da go Wordie MOS Add-in." -ForegroundColor Green
Write-Host "Hay dong va mo lai Microsoft Word neu Word dang chay." -ForegroundColor Yellow
