param(
  [int]$Port = 4173
)

$ErrorActionPreference = 'Stop'

$tailscale = Get-Command tailscale -ErrorAction SilentlyContinue
if (-not $tailscale) {
  Write-Host ''
  Write-Host 'Tailscale is not installed.' -ForegroundColor Yellow
  Write-Host 'Download: https://tailscale.com/download/windows' -ForegroundColor Cyan
  Write-Host 'After installing and signing in on both devices, run this script again.'
  exit 1
}

Write-Host ''
Write-Host 'Checking Tailscale...' -ForegroundColor Cyan
& tailscale status
if ($LASTEXITCODE -ne 0) {
  Write-Host 'Tailscale is not connected. Run: tailscale up' -ForegroundColor Yellow
  exit 1
}

Write-Host ''
Write-Host "Serving http://127.0.0.1:$Port over Tailscale HTTPS..." -ForegroundColor Cyan
& tailscale serve --bg $Port
if ($LASTEXITCODE -ne 0) {
  Write-Host 'Could not start Tailscale Serve. Enable HTTPS certificates in the Tailscale admin console first.' -ForegroundColor Yellow
  exit 1
}

$status = & tailscale status --json | ConvertFrom-Json
$dnsName = [string]$status.Self.DNSName
if ($dnsName) {
  $dnsName = $dnsName.TrimEnd('.')
  $publicUrl = "https://$dnsName"
  Write-Host ''
  Write-Host 'Remote URL:' -ForegroundColor Green
  Write-Host "  $publicUrl" -ForegroundColor Green
  Write-Host ''
  Write-Host 'Restart the StudyDesk server with this environment variable:' -ForegroundColor Cyan
  Write-Host "  `$env:STUDYDESK_PUBLIC_URL = `"$publicUrl`"" -ForegroundColor White
  Write-Host '  npm start'
  Write-Host ''
  Write-Host 'The phone/tablet must also be signed into the same tailnet.'
  Write-Host 'Do not forward TCP 4173 on your router.'
} else {
  Write-Host 'Tailscale Serve started, but DNSName was not available.' -ForegroundColor Yellow
  Write-Host 'Run: tailscale status'
}
