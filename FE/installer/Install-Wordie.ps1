$ErrorActionPreference = "Stop"

$manifestSource = Join-Path $PSScriptRoot "wordie-office-addin.production.xml"
if (-not (Test-Path -LiteralPath $manifestSource)) {
    throw "Khong tim thay wordie-office-addin.production.xml trong bo cai."
}

[xml]$manifest = Get-Content -LiteralPath $manifestSource -Raw
$namespace = New-Object System.Xml.XmlNamespaceManager($manifest.NameTable)
$namespace.AddNamespace("office", "http://schemas.microsoft.com/office/appforoffice/1.1")

$addinId = $manifest.SelectSingleNode("/office:OfficeApp/office:Id", $namespace).InnerText
$sourceLocation = $manifest.SelectSingleNode(
    "/office:OfficeApp/office:DefaultSettings/office:SourceLocation",
    $namespace
).DefaultValue

if ([string]::IsNullOrWhiteSpace($addinId) -or [string]::IsNullOrWhiteSpace($sourceLocation)) {
    throw "Manifest production khong hop le."
}

if ($sourceLocation -match "localhost|127\.0\.0\.1") {
    throw "Manifest van dang tro toi localhost. Hay tao lai manifest production."
}

$installDirectory = Join-Path $env:LOCALAPPDATA "WordieMOS\OfficeAddin"
$manifestTarget = Join-Path $installDirectory "wordie-office-addin.production.xml"
$developerRegistryPath = "HKCU:\SOFTWARE\Microsoft\Office\16.0\Wef\Developer"
$addinSettingsPath = Join-Path $developerRegistryPath $addinId

New-Item -ItemType Directory -Path $installDirectory -Force | Out-Null
Copy-Item -LiteralPath $manifestSource -Destination $manifestTarget -Force

New-Item -Path $developerRegistryPath -Force | Out-Null
New-ItemProperty -Path $developerRegistryPath -Name $addinId -Value $manifestTarget -PropertyType String -Force | Out-Null

New-Item -Path $addinSettingsPath -Force | Out-Null
New-ItemProperty -Path $addinSettingsPath -Name "UseDirectDebugger" -Value 0 -PropertyType DWord -Force | Out-Null
New-ItemProperty -Path $addinSettingsPath -Name "UseWebDebugger" -Value 0 -PropertyType DWord -Force | Out-Null
New-ItemProperty -Path $addinSettingsPath -Name "UseLiveReload" -Value 0 -PropertyType DWord -Force | Out-Null

Write-Host ""
Write-Host "Wordie MOS Add-in da duoc cai dat." -ForegroundColor Green
Write-Host "Website: $sourceLocation"
Write-Host "Manifest: $manifestTarget"
Write-Host ""

if (Get-Process -Name "WINWORD" -ErrorAction SilentlyContinue) {
    Write-Host "Hay luu tai lieu, dong toan bo Microsoft Word, sau do mo lai Word." -ForegroundColor Yellow
} else {
    Write-Host "Ban co the mo Microsoft Word va bat dau lam bai." -ForegroundColor Green
}
