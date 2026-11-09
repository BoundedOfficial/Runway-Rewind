param(
    [ValidateSet('debug', 'release')]
    [string]$Variant = 'debug',
    [string]$Toolchain = (Join-Path $PSScriptRoot '../../.scratch/toolchain'),
    [string]$BundleOutput = (Join-Path $PSScriptRoot '../../.scratch/html5'),
    [ValidateSet('makeup', 'finish')]
    [string]$Fixture
)

$ErrorActionPreference = 'Stop'
$project = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$projectFile = Join-Path $project 'game.project'
$Toolchain = (Resolve-Path -LiteralPath $Toolchain).Path
$BundleOutput = [IO.Path]::GetFullPath($BundleOutput)
if ($Fixture -and $Variant -ne 'debug') {
    throw 'Focused fixtures require a debug build.'
}

# A stock-engine build must never reach a remote build server.
if (Select-String -Path $projectFile -Pattern '^\s*dependencies\s*=\s*\S' -Quiet) {
    throw 'Audit all Defold libraries before enabling them in the host-only build.'
}
$nativeManifests = Get-ChildItem -LiteralPath $project -Recurse -Force -File |
    Where-Object { $_.Name -eq 'ext.manifest' -or $_.Extension -eq '.appmanifest' }
if ($nativeManifests) {
    throw 'Audit the native manifests before building. The HTML5 bundle uses the stock engine.'
}

$java = Join-Path $Toolchain 'jdk-25.0.2+10/bin/java.exe'
$bob = Join-Path $Toolchain 'bob-1.14.0.jar'
$sdk = Join-Path $Toolchain 'playgama-bridge-2.4.1.js'
foreach ($file in @($java, $bob, $sdk)) {
    if (!(Test-Path -LiteralPath $file -PathType Leaf)) {
        throw "Toolchain file is missing at $file. Run setup-toolchain.ps1."
    }
}

$plate = Join-Path $project 'artwork/level-1/assets/plates/00-dirty.png'
Copy-Item -LiteralPath $plate -Destination (Join-Path $project 'assets/dirty.png')
& (Join-Path $PSScriptRoot 'prepare-artwork.ps1') -Project $project
Copy-Item -LiteralPath $sdk -Destination (Join-Path $project 'web/wasm-web/playgama-bridge.js')

$buildArgs = @(
    '--root', $project, '--platform', 'wasm-web', '--architectures', 'wasm-web', '--variant', $Variant,
    '--build-server', 'http://127.0.0.1:1', '--archive', '--bundle-output', $BundleOutput
)
if ($Fixture) {
    $buildArgs += '--settings', (Join-Path $project "fixtures/$Fixture.settings")
}
$buildArgs += 'build', 'bundle'
& $java -jar $bob @buildArgs
if ($LASTEXITCODE) { throw "Defold Bob failed with exit code $LASTEXITCODE" }
Write-Output (Join-Path $BundleOutput 'Runway Rewind')
