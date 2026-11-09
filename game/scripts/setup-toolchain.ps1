param(
    [string]$Toolchain = (Join-Path $PSScriptRoot '../../.scratch/toolchain')
)

$ErrorActionPreference = 'Stop'
$Toolchain = [IO.Path]::GetFullPath($Toolchain)
New-Item -ItemType Directory -Force -Path $Toolchain | Out-Null

function Install-VerifiedDownload([string]$Url, [string]$FileName, [string]$ExpectedHash) {
    $target = Join-Path $Toolchain $FileName
    if (!(Test-Path -LiteralPath $target)) {
        curl.exe --fail --location --silent --show-error --output $target $Url
        if ($LASTEXITCODE) { throw "Download failed for $Url" }
    }
    if ((Get-FileHash -LiteralPath $target -Algorithm SHA256).Hash -ne $ExpectedHash) {
        throw "SHA-256 mismatch for $target. Remove the invalid file before retrying."
    }
}

Install-VerifiedDownload 'https://github.com/defold/defold/releases/download/1.14.0/bob.jar' 'bob-1.14.0.jar' 'd8cbe667757ca1c5f4dfd251bc98660c35e7a65ac84bf0207ccef7607de6d1a1'
Install-VerifiedDownload 'https://github.com/adoptium/temurin25-binaries/releases/download/jdk-25.0.2%2B10/OpenJDK25U-jdk_x64_windows_hotspot_25.0.2_10.zip' 'temurin25.zip' '06ac5f5444a1269dd11d11cbb7ab6ebaecedc60dc1caca82cdb56f29100b7b8c'
Install-VerifiedDownload 'https://github.com/Playgama/bridge/releases/download/v2.4.1/playgama-bridge.js' 'playgama-bridge-2.4.1.js' 'ddf7d8274a86ab2a861ceab89e1b5cbe5afc29b6ea4dceda57a576ac6a8c3822'

$java = Join-Path $Toolchain 'jdk-25.0.2+10/bin/java.exe'
if (!(Test-Path -LiteralPath $java)) {
    tar.exe -xf (Join-Path $Toolchain 'temurin25.zip') -C $Toolchain
    if ($LASTEXITCODE) { throw 'Temurin extraction failed' }
}
& $java -jar (Join-Path $Toolchain 'bob-1.14.0.jar') --version
if ($LASTEXITCODE) { throw 'Defold Bob could not start' }
