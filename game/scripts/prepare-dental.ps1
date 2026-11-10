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
$dimensions = @{}
function Save-Sprite($bitmap, $name) {
    $dimensions[$name] = @{width=$bitmap.Width;height=$bitmap.Height}
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
    if($name -eq 'dirty') {
        $crop=$plate.Clone([Drawing.Rectangle]::new(0,200,640,640),[Drawing.Imaging.PixelFormat]::Format32bppArgb)
        $thumb=Resize-Image $crop 220 220; Save-Sprite $thumb 'thumbnail-2'; $thumb.Dispose(); $crop.Dispose()
    }
    $plate.Dispose(); $original.Dispose()
}

# Enamel is the registered difference between stained and ivory plates. Partition
# that authored mask around the actual tooth centers, never a rectangular grid.
$yellow=[Drawing.Bitmap]::new((Join-Path $output 'dental-descaled.png'))
$ivory=[Drawing.Bitmap]::new((Join-Path $output 'dental-clean.png'))
$centers=@(@(80,381),@(128,380),@(193,388),@(275,390),@(378,390),@(459,384),@(521,377),@(563,380),@(93,482),@(156,507),@(225,521),@(293,526),@(359,526),@(424,520),@(484,506),@(539,480))
$owners=[int[]]::new(640*960)
$regions=@($centers | ForEach-Object { @{x=640;y=960;right=0;bottom=0} })
for($y=300;$y -lt 580;$y++) { for($x=40;$x -lt 600;$x++) {
    $cleanPixel=$ivory.GetPixel($x,$y); $yellowPixel=$yellow.GetPixel($x,$y)
    if(($cleanPixel.B-$yellowPixel.B) -le 18 -or ($cleanPixel.G-$yellowPixel.G) -le 5) { continue }
    $nearest=0; $best=[double]::MaxValue
    for($i=0;$i -lt 16;$i++) { $dx=$x-$centers[$i][0]; $dy=$y-$centers[$i][1]; $distance=$dx*$dx+$dy*$dy; if($distance -lt $best) { $best=$distance; $nearest=$i } }
    $owners[$y*640+$x]=$nearest+1
    $r=$regions[$nearest]; $r.x=[Math]::Min($r.x,$x); $r.y=[Math]::Min($r.y,$y); $r.right=[Math]::Max($r.right,$x); $r.bottom=[Math]::Max($r.bottom,$y)
}}
$yellow.Dispose(); $ivory.Dispose()
foreach($r in $regions) { $r.width=$r.right-$r.x+1; $r.height=$r.bottom-$r.y+1; $r.Remove('right'); $r.Remove('bottom') }
foreach($name in @('descaled','clean','polished')) {
    $plate=[Drawing.Bitmap]::new((Join-Path $output "dental-$name.png"))
    for($i=0;$i -lt 16;$i++) {
        $r=$regions[$i]; $tile=$plate.Clone([Drawing.Rectangle]::new($r.x,$r.y,$r.width,$r.height),[Drawing.Imaging.PixelFormat]::Format32bppArgb)
        for($y=0;$y -lt $r.height;$y++) { for($x=0;$x -lt $r.width;$x++) {
            $index=($r.y+$y)*640+$r.x+$x
            $opacity=0
            if($owners[$index] -eq $i+1) {
                $opacity=255
                if($owners[$index-1] -ne $i+1 -or $owners[$index+1] -ne $i+1 -or $owners[$index-640] -ne $i+1 -or $owners[$index+640] -ne $i+1) { $opacity=180 }
            }
            $color=$tile.GetPixel($x,$y); $tile.SetPixel($x,$y,[Drawing.Color]::FromArgb($opacity,$color.R,$color.G,$color.B))
        }}
        Save-Sprite $tile "$name-$($i+1)"; $tile.Dispose()
    }
    $plate.Dispose()
}
$regions | ConvertTo-Json -Compress | Set-Content (Join-Path $output 'regions.json') -Encoding utf8NoBOM
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
$sprite=Resize-Image $trim 450 ([Math]::Round(450*$trim.Height/$trim.Width)); Save-Sprite $sprite 'petri'; $sprite.Dispose(); $trim.Dispose(); $original.Dispose()
# Interface gesture cursor: a white hand with a dark outline, never gameplay artwork.
$hand=[Drawing.Bitmap]::new(64,80); $g=[Drawing.Graphics]::FromImage($hand)
$g.SmoothingMode=[Drawing.Drawing2D.SmoothingMode]::AntiAlias
$shape=[Drawing.Drawing2D.GraphicsPath]::new()
$points=[Drawing.PointF[]]@([Drawing.PointF]::new(22,73),[Drawing.PointF]::new(8,48),[Drawing.PointF]::new(8,40),[Drawing.PointF]::new(14,38),[Drawing.PointF]::new(23,47),[Drawing.PointF]::new(23,9),[Drawing.PointF]::new(27,4),[Drawing.PointF]::new(32,4),[Drawing.PointF]::new(36,9),[Drawing.PointF]::new(36,31),[Drawing.PointF]::new(43,29),[Drawing.PointF]::new(49,33),[Drawing.PointF]::new(56,34),[Drawing.PointF]::new(60,41),[Drawing.PointF]::new(58,59),[Drawing.PointF]::new(49,73))
$shape.AddPolygon($points); $g.FillPath([Drawing.Brushes]::White,$shape)
$pen=[Drawing.Pen]::new([Drawing.Color]::FromArgb(255,55,63,70),3); $g.DrawPath($pen,$shape)
$pen.Dispose(); $shape.Dispose(); $g.Dispose(); Save-Sprite $hand 'gesture-hand'; $hand.Dispose()
# A rounded UI surface, reused for cards and buttons; gameplay imagery stays authored raster art.
$surface=[Drawing.Bitmap]::new(128,128); $g=[Drawing.Graphics]::FromImage($surface)
$g.SmoothingMode=[Drawing.Drawing2D.SmoothingMode]::AntiAlias
$shape=[Drawing.Drawing2D.GraphicsPath]::new()
$shape.AddArc(0,0,32,32,180,90); $shape.AddArc(95,0,32,32,270,90)
$shape.AddArc(95,95,32,32,0,90); $shape.AddArc(0,95,32,32,90,90); $shape.CloseFigure()
$g.FillPath([Drawing.Brushes]::White,$shape); $shape.Dispose(); $g.Dispose(); Save-Sprite $surface 'rounded'; $surface.Dispose()
$atlas.Add('extrude_borders: 2')
$dimensions | ConvertTo-Json -Compress | Set-Content (Join-Path $output 'dimensions.json') -Encoding utf8NoBOM
Set-Content (Join-Path $output 'dental.atlas') $atlas -Encoding utf8NoBOM
