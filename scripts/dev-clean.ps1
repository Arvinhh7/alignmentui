$ErrorActionPreference = "Stop"

$port = 3000
$connections = netstat -ano | Select-String ":$port\s+.*LISTENING"
$processIds = @()

foreach ($connection in $connections) {
  $parts = ($connection.Line.Trim() -split "\s+")
  if ($parts.Length -gt 0) {
    $processIds += $parts[$parts.Length - 1]
  }
}

$processIds |
  Sort-Object -Unique |
  Where-Object { $_ -match "^\d+$" } |
  ForEach-Object {
    Write-Host "Stopping existing dev server on port $port (PID $_)"
    Stop-Process -Id ([int]$_) -Force -ErrorAction SilentlyContinue
  }

if (Test-Path ".next") {
  Write-Host "Removing stale .next cache"
  Remove-Item -LiteralPath ".next" -Recurse -Force
}

Write-Host "Starting Next.js dev server on port $port"
npm.cmd run dev -- -p $port
