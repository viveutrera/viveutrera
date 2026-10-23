param(
  [Parameter(Mandatory = $true)]
  [string]$SourcePath
)

$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing

$source = [System.Drawing.Bitmap]::new((Resolve-Path -LiteralPath $SourcePath).Path)
try {
  if ($source.Width -ne $source.Height) {
    throw 'La imagen de origen debe ser cuadrada.'
  }

  $outputDirectory = Join-Path (Split-Path -Parent $PSScriptRoot) 'public/brand'
  $background = $source.GetPixel(0, 0)

  foreach ($size in @(180, 192, 512)) {
    $bitmap = [System.Drawing.Bitmap]::new($size, $size, [System.Drawing.Imaging.PixelFormat]::Format24bppRgb)
    $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
    $attributes = [System.Drawing.Imaging.ImageAttributes]::new()
    try {
      $graphics.Clear($background)
      $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
      $graphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
      $graphics.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality
      $attributes.SetWrapMode([System.Drawing.Drawing2D.WrapMode]::TileFlipXY)

      # Keep this artwork inside the circular safe area used by Android launchers.
      $drawSize = [int][Math]::Round($size * 0.88)
      $offset = [int][Math]::Floor(($size - $drawSize) / 2)
      $destination = [System.Drawing.Rectangle]::new($offset, $offset, $drawSize, $drawSize)
      $graphics.DrawImage($source, $destination, 0, 0, $source.Width, $source.Height, [System.Drawing.GraphicsUnit]::Pixel, $attributes)

      $outputPath = Join-Path $outputDirectory "pwa-icon-$size.png"
      $bitmap.Save($outputPath, [System.Drawing.Imaging.ImageFormat]::Png)
      Write-Output "Generado: $outputPath ($size x $size)"
    } finally {
      $attributes.Dispose()
      $graphics.Dispose()
      $bitmap.Dispose()
    }
  }
} finally {
  $source.Dispose()
}
