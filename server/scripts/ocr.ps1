param(
  [Parameter(Mandatory = $true)][string]$ImagePath,
  [Parameter(Mandatory = $true)][string]$OutputPath
)

$ErrorActionPreference = 'Stop'
$json = $null

function Write-Result {
  param([hashtable]$Result)
  $text = $Result | ConvertTo-Json -Depth 6 -Compress
  $utf8 = New-Object System.Text.UTF8Encoding($false)
  [System.IO.File]::WriteAllText($OutputPath, $text, $utf8)
}

try {
  if (-not (Test-Path -LiteralPath $ImagePath)) {
    throw "Image not found: $ImagePath"
  }

  Add-Type -AssemblyName System.Runtime.WindowsRuntime
  Add-Type -AssemblyName System.Drawing
  $null = [Windows.Graphics.Imaging.SoftwareBitmap, Windows.Graphics.Imaging, ContentType = WindowsRuntime]
  $null = [Windows.Media.Ocr.OcrEngine, Windows.Foundation, ContentType = WindowsRuntime]
  $null = [Windows.Globalization.Language, Windows.Globalization, ContentType = WindowsRuntime]

  $asTaskGeneric = ([System.WindowsRuntimeSystemExtensions].GetMethods() | Where-Object {
    $_.Name -eq 'AsTask' -and $_.GetParameters().Count -eq 1 -and $_.GetParameters()[0].ParameterType.Name -eq 'IAsyncOperation`1'
  })[0]

  function Await($WinRtTask, $ResultType) {
    $asTask = $asTaskGeneric.MakeGenericMethod($ResultType)
    $netTask = $asTask.Invoke($null, @($WinRtTask))
    try {
      $netTask.Wait(-1) | Out-Null
    } catch {
      throw $netTask.Exception.InnerException
    }
    return $netTask.Result
  }

  $source = New-Object System.Drawing.Bitmap($ImagePath)
  $maxSide = 2600.0
  $ratio = [Math]::Min(1.0, [Math]::Min($maxSide / $source.Width, $maxSide / $source.Height))
  $width = [Math]::Max(1, [int]($source.Width * $ratio))
  $height = [Math]::Max(1, [int]($source.Height * $ratio))

  $bitmap = New-Object System.Drawing.Bitmap($width, $height, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
  $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
  $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
  $graphics.DrawImage($source, 0, 0, $width, $height)
  $graphics.Dispose()
  $source.Dispose()

  $rect = New-Object System.Drawing.Rectangle(0, 0, $width, $height)
  $data = $bitmap.LockBits($rect, [System.Drawing.Imaging.ImageLockMode]::ReadOnly, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
  $length = $data.Stride * $height
  $bytes = New-Object byte[] $length
  [System.Runtime.InteropServices.Marshal]::Copy($data.Scan0, $bytes, 0, $length)
  $bitmap.UnlockBits($data)
  $bitmap.Dispose()

  $buffer = [System.Runtime.InteropServices.WindowsRuntime.WindowsRuntimeBufferExtensions]::AsBuffer($bytes)
  $softwareBitmap = [Windows.Graphics.Imaging.SoftwareBitmap]::CreateCopyFromBuffer(
    $buffer,
    [Windows.Graphics.Imaging.BitmapPixelFormat]::Bgra8,
    $width,
    $height,
    [Windows.Graphics.Imaging.BitmapAlphaMode]::Ignore
  )

  $language = [Windows.Globalization.Language]::new('zh-Hans-CN')
  $engine = [Windows.Media.Ocr.OcrEngine]::TryCreateFromLanguage($language)
  if ($null -eq $engine) {
    $engine = [Windows.Media.Ocr.OcrEngine]::TryCreateFromUserProfileLanguages()
  }
  if ($null -eq $engine) {
    throw 'No OCR language pack is available on this device.'
  }

  $result = Await ($engine.RecognizeAsync($softwareBitmap)) ([Windows.Media.Ocr.OcrResult])
  $lines = @()
  foreach ($line in $result.Lines) {
    if ($line.Text -and $line.Text.Trim().Length -gt 0) {
      $lines += $line.Text.Trim()
    }
  }

  Write-Result @{
    ok      = $true
    lines   = $lines
    language = $engine.RecognizerLanguage.LanguageTag
    width   = $width
    height  = $height
  }
  exit 0
} catch {
  Write-Result @{
    ok    = $false
    error = $_.Exception.Message
  }
  exit 1
}
