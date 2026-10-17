# 允许同一局域网内的手机 / 平板访问知序 StudyDesk。
# 用法：右键“使用 PowerShell 运行”，或在项目目录执行：
#   powershell -NoProfile -ExecutionPolicy Bypass -File scripts/open-lan-firewall.ps1
# 会弹出 UAC，请点“是”。脚本只开放指定 TCP 端口，不改动其他防火墙规则。

param(
  [int]$Port = 4173
)

$ErrorActionPreference = 'Stop'
$ruleName = '知序 StudyDesk LAN'
$dataDir = Join-Path (Split-Path -Parent $PSScriptRoot) 'data'
if (-not (Test-Path -LiteralPath $dataDir)) {
  New-Item -ItemType Directory -Path $dataDir -Force | Out-Null
}
$resultPath = Join-Path $dataDir 'firewall-result.json'

$isAdmin = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole(
  [Security.Principal.WindowsBuiltInRole]::Administrator
)

if (-not $isAdmin) {
  Write-Host '需要管理员权限，正在请求 UAC…' -ForegroundColor Yellow
  $arguments = @(
    '-NoProfile',
    '-ExecutionPolicy', 'Bypass',
    '-File', "`"$PSCommandPath`"",
    '-Port', "$Port"
  )
  try {
    Start-Process -FilePath 'powershell.exe' -Verb RunAs -ArgumentList $arguments | Out-Null
  } catch {
    Write-Host 'UAC 被取消，未能修改防火墙。' -ForegroundColor Red
    exit 1
  }
  exit 0
}

try {
  $subnet = Get-NetRoute -AddressFamily IPv4 -ErrorAction SilentlyContinue |
    Where-Object {
      $_.NextHop -eq '0.0.0.0' -and
      $_.DestinationPrefix -notlike '*/32' -and
      $_.DestinationPrefix -match '^(10\.|192\.168\.|172\.(1[6-9]|2[0-9]|3[01])\.)'
    } |
    Select-Object -First 1 -ExpandProperty DestinationPrefix
  if (-not $subnet) { $subnet = 'LocalSubnet' }

  $existing = Get-NetFirewallRule -DisplayName $ruleName -ErrorAction SilentlyContinue
  if (-not $existing) {
    New-NetFirewallRule `
      -DisplayName $ruleName `
      -Description 'Allow StudyDesk (local note app) on the home LAN' `
      -Direction Inbound `
      -Action Allow `
      -Protocol TCP `
      -LocalPort $Port `
      -RemoteAddress $subnet `
      -Profile Private,Domain,Public | Out-Null
    Write-Host "已添加防火墙规则：$ruleName（TCP $Port，仅 $subnet）" -ForegroundColor Green
  } else {
    Set-NetFirewallRule -DisplayName $ruleName -Enabled True -Action Allow -RemoteAddress $subnet -Profile Private,Domain,Public | Out-Null
    Write-Host "防火墙规则已更新：$ruleName（TCP $Port，仅 $subnet）" -ForegroundColor Green
  }

  # Windows 在「公用网络」下可能为 node.exe 生成“阻止”规则；阻止优先于允许，
  # 必须停用这些 node.exe 的入站 Block 规则，端口允许规则才会生效。
  $disabledBlocks = @()
  $nodeFilters = Get-NetFirewallApplicationFilter -ErrorAction SilentlyContinue |
    Where-Object { $_.Program -like '*\node.exe' }
  foreach ($nodeFilter in $nodeFilters) {
    $nodeRules = Get-NetFirewallRule -AssociatedNetFirewallApplicationFilter $nodeFilter -ErrorAction SilentlyContinue
    foreach ($nodeRule in $nodeRules) {
      if ($nodeRule.Direction -eq 'Inbound' -and $nodeRule.Action -eq 'Block' -and $nodeRule.Enabled -eq 'True') {
        Disable-NetFirewallRule -Name $nodeRule.Name -ErrorAction SilentlyContinue
        $disabledBlocks += $nodeRule.DisplayName
      }
    }
  }
  if ($disabledBlocks.Count -gt 0) {
    Write-Host "已停用 $($disabledBlocks.Count) 条 node.exe 入站阻止规则（只影响 node，不改其他程序）。" -ForegroundColor Yellow
  }

  $urls = Get-NetIPAddress -AddressFamily IPv4 |
    Where-Object {
      $_.IPAddress -notlike '127.*' -and
      $_.IPAddress -notlike '169.254.*' -and
      $_.PrefixOrigin -ne 'WellKnown'
    } |
    Select-Object -ExpandProperty IPAddress

  Write-Host ''
  Write-Host '手机 / 平板连同一个 Wi-Fi，打开：' -ForegroundColor Cyan
  foreach ($ip in $urls) {
    Write-Host ("  http://" + $ip + ":$Port") -ForegroundColor White
  }
  Write-Host ''
  Write-Host '如果仍然打不开：确认电脑和手机在同一网段，且服务器窗口仍在运行。' -ForegroundColor DarkGray

  @{
    ok   = $true
    rule = $ruleName
    port = $Port
    subnet = $subnet
    disabledBlocks = $disabledBlocks.Count
    urls = @($urls | ForEach-Object { "http://" + $_ + ":$Port" })
    at   = (Get-Date).ToString('o')
  } | ConvertTo-Json -Depth 4 | Set-Content -LiteralPath $resultPath -Encoding UTF8
} catch {
  Write-Host "设置失败：$($_.Exception.Message)" -ForegroundColor Red
  @{
    ok    = $false
    error = $_.Exception.Message
    at    = (Get-Date).ToString('o')
  } | ConvertTo-Json -Depth 3 | Set-Content -LiteralPath $resultPath -Encoding UTF8
  exit 1
}
