param([Parameter(Mandatory)][string]$Project)
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing
$source = Join-Path $Project 'artwork/level-2/assets'
$output = Join-Path $Project 'assets/generated/dental'
New-Item -ItemType Directory -Force $output | Out-Null
$atlasPath=Join-Path $output 'dental.atlas'
$inputs=@(Get-ChildItem $source -File)+@(Get-Item $PSCommandPath)+@(Get-Item (Join-Path $Project 'artwork/level-1/assets/plates/00-dirty.png'))
if((Test-Path $atlasPath) -and !($inputs | Where-Object { $_.LastWriteTimeUtc -gt (Get-Item $atlasPath).LastWriteTimeUtc })) { return }

$atlas = [Collections.Generic.List[string]]::new()
function Save-Sprite($bitmap, $name) {
    $bitmap.Save((Join-Path $output "$name.png"), [Drawing.Imaging.ImageFormat]::Png)
    $atlas.Add("images { image: `"/assets/generated/dental/$name.png`" }")
}
function Resize-Image($bitmap, $width, $height) {
    $result = [Drawing.Bitmap]::new([int]$width, [int]$height)
    $g = [Drawing.Graphics]::FromImage($result)
    $g.InterpolationMode = [Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.DrawImage($bitmap, 0, 0, [int]$width, [int]$height)
    $g.Dispose()
    return $result
}
function Trim-Image($bitmap) {
    $x0=$bitmap.Width; $y0=$bitmap.Height; $x1=0; $y1=0
    for($y=0;$y -lt $bitmap.Height;$y++) { for($x=0;$x -lt $bitmap.Width;$x++) {
        if($bitmap.GetPixel($x,$y).A -gt 80) {
            $x0=[Math]::Min($x0,$x); $x1=[Math]::Max($x1,$x)
            $y0=[Math]::Min($y0,$y); $y1=[Math]::Max($y1,$y)
        }
    }}
    return $bitmap.Clone([Drawing.Rectangle]::new($x0,$y0,$x1-$x0+1,$y1-$y0+1),[Drawing.Imaging.PixelFormat]::Format32bppArgb)
}
foreach($name in @('dirty','descaled','clean','polished')) {
    $original=[Drawing.Bitmap]::new((Join-Path $source "$name.png"))
    $plate=Resize-Image $original 640 960
    Save-Sprite $plate "dental-$name"
    if($name -ne 'dirty') {
        for($i=0;$i -lt 16;$i++) {
            $x=40+($i%8)*70; $y=300+[Math]::Floor($i/8)*140
            $tile=$plate.Clone([Drawing.Rectangle]::new($x,$y,70,140),[Drawing.Imaging.PixelFormat]::Format32bppArgb)
            Save-Sprite $tile "$name-$($i+1)"; $tile.Dispose()
        }
    }
    if($name -eq 'dirty') {
        $crop=$plate.Clone([Drawing.Rectangle]::new(0,200,640,640),[Drawing.Imaging.PixelFormat]::Format32bppArgb)
        $thumb=Resize-Image $crop 220 220; Save-Sprite $thumb 'thumbnail-2'; $thumb.Dispose(); $crop.Dispose()
    }
    $plate.Dispose(); $original.Dispose()
}
$original=[Drawing.Bitmap]::new((Join-Path $Project 'artwork/level-1/assets/plates/00-dirty.png'))
$plate=Resize-Image $original 640 960
$crop=$plate.Clone([Drawing.Rectangle]::new(0,80,640,640),[Drawing.Imaging.PixelFormat]::Format32bppArgb)
$thumb=Resize-Image $crop 220 220; Save-Sprite $thumb 'thumbnail-1'; $thumb.Dispose(); $crop.Dispose(); $plate.Dispose(); $original.Dispose()
foreach($sheet in @(@('tools',3,3),@('food',2,2),@('worms',3,2),@('treatment-fx',3,2))) {
    $original=[Drawing.Bitmap]::new((Join-Path $source "$($sheet[0]).png"))
    $cw=[int][Math]::Floor($original.Width/$sheet[1]); $ch=[int][Math]::Floor($original.Height/$sheet[2])
    for($i=0;$i -lt $sheet[1]*$sheet[2];$i++) {
        $cell=$original.Clone([Drawing.Rectangle]::new(($i%$sheet[1])*$cw,[Math]::Floor($i/$sheet[1])*$ch,$cw,$ch),[Drawing.Imaging.PixelFormat]::Format32bppArgb)
        if($sheet[0] -eq 'worms') { $sprite=Resize-Image $cell 80 80 }
        else { $trim=Trim-Image $cell; $sprite=Resize-Image $trim ([Math]::Max(1,[Math]::Round(230*$trim.Width/$trim.Height))) 230; $trim.Dispose() }
        Save-Sprite $sprite "$($sheet[0])-$($i+1)"; $sprite.Dispose(); $cell.Dispose()
    }
    $original.Dispose()
}
$original=[Drawing.Bitmap]::new((Join-Path $source 'petri.png')); $trim=Trim-Image $original
$sprite=Resize-Image $trim 450 140; Save-Sprite $sprite 'petri'; $sprite.Dispose(); $trim.Dispose(); $original.Dispose()
# A rounded UI surface, reused for cards and buttons; gameplay imagery stays authored raster art.
$surface=[Drawing.Bitmap]::new(128,128); $g=[Drawing.Graphics]::FromImage($surface)
$g.SmoothingMode=[Drawing.Drawing2D.SmoothingMode]::AntiAlias
$shape=[Drawing.Drawing2D.GraphicsPath]::new()
$shape.AddArc(0,0,32,32,180,90); $shape.AddArc(95,0,32,32,270,90)
$shape.AddArc(95,95,32,32,0,90); $shape.AddArc(0,95,32,32,90,90); $shape.CloseFigure()
$g.FillPath([Drawing.Brushes]::White,$shape); $shape.Dispose(); $g.Dispose(); Save-Sprite $surface 'rounded'; $surface.Dispose()
$atlas.Add('extrude_borders: 2')
Set-Content (Join-Path $output 'dental.atlas') $atlas -Encoding utf8NoBOM
