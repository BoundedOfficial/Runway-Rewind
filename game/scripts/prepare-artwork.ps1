param([Parameter(Mandatory)][string]$Project)

$ErrorActionPreference = 'Stop'
$source = Join-Path $Project 'artwork/level-1/assets'
$generated = Join-Path $Project 'assets/generated'
New-Item -ItemType Directory -Force -Path $generated | Out-Null
$recipes = Get-ChildItem -LiteralPath (Join-Path $Project 'assets/recipes') -Filter '*.json' |
    Sort-Object Name | ForEach-Object { Get-Content -LiteralPath $_.FullName -Raw | ConvertFrom-Json -AsHashtable }
$regionPatterns = @($recipes | ForEach-Object { $_.regions })
$tools = [ordered]@{}
foreach ($recipe in $recipes) {
    foreach ($tool in $recipe.tools.GetEnumerator()) { $tools[$tool.Key] = $tool.Value }
}

$layerSource = Join-Path $source 'layers'
$layers = Get-Content -LiteralPath (Join-Path $layerSource 'manifest.json') -Raw | ConvertFrom-Json
$layers = @($layers | Where-Object {
    $id = $_.id
    $regionPatterns.Where({ $id -like $_ }, 'First').Count -gt 0
})
$atlas = [Collections.Generic.List[string]]::new()
$atlas.Add('images { image: "/assets/dirty.png" }')
foreach ($layer in $layers) {
    Copy-Item -LiteralPath (Join-Path $layerSource "$($layer.id).png") -Destination $generated
    $atlas.Add("images { image: `"/assets/generated/$($layer.id).png`" }")
}
$atlas.Add('extrude_borders: 2')
Set-Content -LiteralPath (Join-Path $generated 'portraits.atlas') -Value $atlas -Encoding utf8NoBOM
$layers | ConvertTo-Json -Depth 20 -Compress |
    Set-Content -LiteralPath (Join-Path $generated 'regions.json') -Encoding utf8NoBOM

Add-Type -AssemblyName System.Drawing
$sheet = [Drawing.Bitmap]::new((Join-Path $source 'tools.png'))
$toolAtlas = [Collections.Generic.List[string]]::new()
try {
    foreach ($tool in $tools.GetEnumerator()) {
        $destination = Join-Path $generated "$($tool.Key).png"
        if ($tool.Value -is [string]) {
            $original = [Drawing.Bitmap]::new((Join-Path $source $tool.Value))
            try {
                $icon = [Drawing.Bitmap]::new($original, [int]($sheet.Width / 4), [int]($sheet.Height / 4))
                try { $icon.Save($destination, [Drawing.Imaging.ImageFormat]::Png) }
                finally { $icon.Dispose() }
            } finally { $original.Dispose() }
        } else {
            $cellWidth = $sheet.Width / 4
            $cellHeight = $sheet.Height / 4
            $col = $tool.Value % 4
            $row = [Math]::Floor($tool.Value / 4)
            $bounds = [Drawing.Rectangle]::FromLTRB(
                [Math]::Floor($col * $cellWidth), [Math]::Floor($row * $cellHeight),
                [Math]::Floor(($col + 1) * $cellWidth), [Math]::Floor(($row + 1) * $cellHeight))
            $icon = $sheet.Clone($bounds, [Drawing.Imaging.PixelFormat]::Format32bppArgb)
            try { $icon.Save($destination, [Drawing.Imaging.ImageFormat]::Png) }
            finally { $icon.Dispose() }
        }
        $toolAtlas.Add("images { image: `"/assets/generated/$($tool.Key).png`" }")
    }
} finally { $sheet.Dispose() }
$toolAtlas.Add('extrude_borders: 2')
Set-Content -LiteralPath (Join-Path $generated 'tools.atlas') -Value $toolAtlas -Encoding utf8NoBOM
