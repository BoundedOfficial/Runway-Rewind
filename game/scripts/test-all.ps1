param([string]$Toolchain = (Join-Path $PSScriptRoot '../../.cache/toolchain'))
$ErrorActionPreference = 'Stop'
$repository = (Resolve-Path (Join-Path $PSScriptRoot '../..')).Path
Set-Location $repository
if (!(Test-Path (Join-Path $PSScriptRoot '../tests/node_modules/playwright-core'))) {
    throw 'Install test dependencies first: npm ci --prefix game/tests'
}
$results = [Collections.Generic.List[object]]::new()
$output = Join-Path $repository 'game/dist/test-results'
New-Item -ItemType Directory -Force $output | Out-Null
$env:STAGE_EVIDENCE_DIR = Join-Path $output 'evidence'
New-Item -ItemType Directory -Force $env:STAGE_EVIDENCE_DIR | Out-Null
function Check-Game($name, $testArguments) {
    Write-Output "RUN $name"
    & node @testArguments *> (Join-Path $output "$name.log")
    $passed = $LASTEXITCODE -eq 0
    $results.Add(@{name=$name;passed=$passed})
    Get-Content (Join-Path $output "$name.log") | Select-Object -Last 12
    Write-Output "$name passed=$passed"
}
& "$PSScriptRoot/build-html5.ps1" -Toolchain $Toolchain | Out-Null
& "$PSScriptRoot/build-html5.ps1" -Toolchain $Toolchain -Fixture makeup -BundleOutput "$output/makeup" | Out-Null
& "$PSScriptRoot/build-html5.ps1" -Toolchain $Toolchain -Fixture finish -BundleOutput "$output/finish" | Out-Null
$bundle = 'game/dist/html5/Runway Rewind'
foreach($name in @('navigation','dental','dental-remaining','dental-blending','dental-pickup','dental-motion','dental-forgiving','dental-tutorial','launch','extraction','lifecycle','persistence','presentation')) {
    Check-Game $name @("game/tests/$name.cjs",$bundle)
}
Check-Game 'makeup' @('game/tests/makeup.cjs',"$output/makeup/Runway Rewind")
Check-Game 'finish' @('game/tests/finish.cjs',"$output/finish/Runway Rewind")
& "$PSScriptRoot/package-html5.ps1" -Toolchain $Toolchain -ReleaseOutput "$output/release" | Out-Null
Expand-Archive -LiteralPath "$output/release/runway-rewind-playgama.zip" -DestinationPath "$output/release/distribution" -Force
Check-Game 'packages' @('game/tests/packages.cjs',"$output/release/distribution")
Check-Game 'acceptance' @('game/tests/acceptance.cjs',"$output/release")
$results | ConvertTo-Json | Set-Content "$output/results.json"
if($results | Where-Object { !$_.passed }) { throw "Some checks failed; see $output/results.json and individual logs." }
Write-Output 'PASS: all browser and packaged-build checks'
