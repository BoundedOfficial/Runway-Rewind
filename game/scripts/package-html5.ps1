param(
    [string]$Toolchain = (Join-Path $PSScriptRoot '../../.cache/toolchain'),
    [string]$ReleaseOutput = (Join-Path $PSScriptRoot '../dist/releases'),
    [switch]$CompatibilityTargets
)

$ErrorActionPreference = 'Stop'
$Toolchain = (Resolve-Path -LiteralPath $Toolchain).Path
$ReleaseOutput = [IO.Path]::GetFullPath($ReleaseOutput)
$repository = (Resolve-Path (Join-Path $PSScriptRoot '../..')).Path
$work = Join-Path $repository "game/dist/package-work/$([guid]::NewGuid())"
$null = New-Item -ItemType Directory -Path $work, $ReleaseOutput -Force
$bob = Join-Path $Toolchain 'bob-1.14.0.jar'
$bridge = Join-Path $Toolchain 'playgama-bridge-2.4.1.js'
$bobHash = (Get-FileHash -LiteralPath $bob).Hash
if ($bobHash -ne 'd8cbe667757ca1c5f4dfd251bc98660c35e7a65ac84bf0207ccef7607de6d1a1') {
    throw 'Release packages require the checked Defold Bob 1.14.0 download.'
}

$patchedBridge = Join-Path $work 'playgama-bridge.js'
node (Join-Path $PSScriptRoot 'patch-bridge.cjs') $bridge $patchedBridge
if ($LASTEXITCODE) { throw 'Bridge compatibility patch failed.' }

# Both targets copy the exact same release-mode engine and game archive.
$bundleOutput = Join-Path $work 'bundle'
& (Join-Path $PSScriptRoot 'build-html5.ps1') -Variant release -Toolchain $Toolchain -BundleOutput $bundleOutput | Out-Host
$bundle = Join-Path $bundleOutput 'Runway Rewind'

$report = [ordered]@{
    sourceHead = (git -C $repository rev-parse HEAD)
    sourceDirty = [bool](git -C $repository status --porcelain)
    host = [System.Runtime.InteropServices.RuntimeInformation]::OSDescription
    powershell = $PSVersionTable.PSVersion.ToString()
    node = (node --version)
    defold = '1.14.0'
    bobSha256 = $bobHash
    temurin = '25.0.2+10'
    upstreamBridge = '2.4.1'
    upstreamBridgeSha256 = (Get-FileHash -LiteralPath $bridge).Hash
    patchedBridgeSha256 = (Get-FileHash -LiteralPath $patchedBridge).Hash
    packages = [ordered]@{}
}

$targets = if ($CompatibilityTargets) { @('youtube', 'playgama') } else { @('distribution') }
foreach ($target in $targets) {
    $destination = Join-Path $work $target
    Copy-Item -LiteralPath $bundle -Destination $destination -Recurse
    Copy-Item -LiteralPath $patchedBridge -Destination (Join-Path $destination 'playgama-bridge.js') -Force
    Copy-Item -LiteralPath (Join-Path $PSScriptRoot 'patch-bridge.cjs') -Destination (Join-Path $destination 'licenses')
    $notice = Join-Path $destination 'licenses/Playgama-Bridge-NOTICE.txt'
    Add-Content -LiteralPath $notice -Value @'

This distribution applies the Runway Rewind compatibility edits dated
2026-11-09. See patch-bridge.cjs in this directory for the modification source
and regeneration instructions. The links above identify the upstream bundle
and corresponding source at the original release.
'@

    $configuration = [ordered]@{
        sendAnalyticsEvents = $false
        debug = $false
        loadingScreenType = 'none'
    }
    if ($CompatibilityTargets) { $configuration.forciblySetPlatformId = $target }
    $configuration | ConvertTo-Json | Set-Content -LiteralPath (Join-Path $destination 'playgama-bridge-config.json')

    $index = Join-Path $destination 'index.html'
    $html = Get-Content -LiteralPath $index -Raw
    $devTag = '  <script src="runway-development.js"></script>'
    $bridgeTag = '  <script src="playgama-bridge.js"></script>'
    if (!$html.Contains($devTag) -or !$html.Contains($bridgeTag)) {
        throw 'Expected release packaging anchors are missing from index.html.'
    }
    $html = $html.Replace("$devTag`n", '').Replace("$devTag`r`n", '')
    if ($target -eq 'youtube') {
        $youtubeTag = '  <script src="https://www.youtube.com/game_api/v1"></script>'
        $html = $html.Replace($bridgeTag, "$youtubeTag`n$bridgeTag")
    }
    Set-Content -LiteralPath $index -Value $html -NoNewline
    $modifiedNotice = (Get-Content -LiteralPath $notice -Raw).Replace('Unmodified upstream JavaScript:', 'Original upstream JavaScript:')
    Set-Content -LiteralPath $notice -Value $modifiedNotice -NoNewline

    $files = @(Get-ChildItem -LiteralPath $destination -Recurse -File | Where-Object {
        $_.Name -notin @('.gitattributes', 'runway-development.js')
    } | Sort-Object FullName)
    $total = ($files | Measure-Object Length -Sum).Sum
    $largest = ($files | Measure-Object Length -Maximum).Maximum
    if ($target -eq 'youtube' -and ($files.Count -gt 8000 -or $largest -ge 30MB -or $total -ge 250MB)) {
        throw 'The YouTube package exceeds a file count, per-file, or total size limit.'
    }
    if ($target -ne 'youtube' -and $total -gt 300000000) {
        throw 'The Playgama package exceeds the 300 MB game-file budget.'
    }

    $archiveName = if ($target -eq "distribution") { "runway-rewind-playgama.zip" } else { "runway-rewind-$target.zip" }
    $zip = Join-Path $work $archiveName
    $archive = [IO.Compression.ZipFile]::Open($zip, [IO.Compression.ZipArchiveMode]::Create)
    try {
        $inventory = foreach ($file in $files) {
            $relative = [IO.Path]::GetRelativePath($destination, $file.FullName).Replace('\', '/')
            if ($relative -notmatch '^[A-Za-z0-9_.-]+(/[A-Za-z0-9_.-]+)*$') {
                throw "Invalid release resource filename: $relative"
            }
            $entry = $archive.CreateEntry($relative)
            $entry.LastWriteTime = [DateTimeOffset]::Parse('2000-01-01T00:00:00+00:00')
            $input = [IO.File]::OpenRead($file.FullName)
            try {
                $output = $entry.Open()
                try { $input.CopyTo($output) } finally { $output.Dispose() }
            } finally {
                $input.Dispose()
            }
            [ordered]@{
                path = $relative
                bytes = $file.Length
                sha256 = (Get-FileHash -LiteralPath $file.FullName).Hash
            }
        }
    } finally {
        $archive.Dispose()
    }
    $report.packages[$target] = [ordered]@{
        file = $archiveName
        sha256 = (Get-FileHash -LiteralPath $zip).Hash
        compressedBytes = (Get-Item -LiteralPath $zip).Length
        totalFileBytes = $total
        largestFileBytes = $largest
        fileCount = $files.Count
        files = @($inventory)
    }
}

foreach ($package in $report.packages.Values) {
    Copy-Item -LiteralPath (Join-Path $work $package.file) -Destination $ReleaseOutput -Force
}
$report | ConvertTo-Json -Depth 8 | Set-Content -LiteralPath (Join-Path $ReleaseOutput 'package-manifest.json')
# The distribution and manifest are the handoff; staging files are disposable.
$workPath=[IO.Path]::GetFullPath($work)
$workRoot=[IO.Path]::GetFullPath((Join-Path $repository 'game/dist/package-work'))+[IO.Path]::DirectorySeparatorChar
if (!$workPath.StartsWith($workRoot,[StringComparison]::OrdinalIgnoreCase)) { throw "Unexpected package staging path: $workPath" }
Remove-Item -LiteralPath $workPath -Recurse -Force
Write-Output $ReleaseOutput
