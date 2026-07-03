param(
  [Parameter(Mandatory = $true)]
  [int]$Port,

  [Parameter(Mandatory = $true)]
  [string]$Routes,

  [Parameter(Mandatory = $true)]
  [string]$Viewports,

  [Parameter(Mandatory = $true)]
  [string]$EvidenceDir,

  [switch]$CheckOverflow
)

$ErrorActionPreference = 'Stop'

$frontendRoot = Split-Path -Parent $PSScriptRoot
$resolvedEvidenceDir = $ExecutionContext.SessionState.Path.GetUnresolvedProviderPathFromPSPath($EvidenceDir)
New-Item -ItemType Directory -Force -Path $resolvedEvidenceDir | Out-Null

function Wait-ForPreview {
  param(
    [Parameter(Mandatory = $true)]
    [string]$BaseUrl
  )

  $deadline = (Get-Date).AddSeconds(30)
  do {
    try {
      $response = Invoke-WebRequest -Uri $BaseUrl -UseBasicParsing -TimeoutSec 2
      if ($response.StatusCode -lt 500) {
        return
      }
    } catch {
      Start-Sleep -Milliseconds 500
    }
  } while ((Get-Date) -lt $deadline)

  throw "Vite preview did not respond at $BaseUrl"
}

function Stop-ProcessTree {
  param(
    [Parameter(Mandatory = $true)]
    [int]$ProcessId
  )

  $children = Get-CimInstance Win32_Process | Where-Object { $_.ParentProcessId -eq $ProcessId }
  foreach ($child in $children) {
    Stop-ProcessTree -ProcessId $child.ProcessId
  }

  $process = Get-Process -Id $ProcessId -ErrorAction SilentlyContinue
  if ($process) {
    Stop-Process -Id $ProcessId -Force -ErrorAction SilentlyContinue
    try {
      $process.WaitForExit(5000) | Out-Null
    } catch {
      $null = $_
    }
  }
}

$stdoutPath = Join-Path $resolvedEvidenceDir 'vite-preview.stdout.txt'
$stderrPath = Join-Path $resolvedEvidenceDir 'vite-preview.stderr.txt'
$cleanupPath = Join-Path $resolvedEvidenceDir 'preview-cleanup.txt'
$baseUrl = "http://127.0.0.1:$Port"
$previewProcess = $null

try {
  $previewProcess = Start-Process -FilePath 'npx.cmd' `
    -ArgumentList @('vite', 'preview', '--host', '127.0.0.1', '--port', "$Port") `
    -WorkingDirectory $frontendRoot `
    -RedirectStandardOutput $stdoutPath `
    -RedirectStandardError $stderrPath `
    -WindowStyle Hidden `
    -PassThru

  Wait-ForPreview -BaseUrl $baseUrl

  $nodeArgs = @(
    '.\scripts\qa-public-surfaces.mjs',
    '--base-url', $baseUrl,
    '--routes', $Routes,
    '--viewports', $Viewports,
    '--evidence-dir', $resolvedEvidenceDir
  )
  if ($CheckOverflow) {
    $nodeArgs += '--check-overflow'
  }

  & node $nodeArgs
  if ($LASTEXITCODE -ne 0) {
    throw "Browser QA failed with exit code $LASTEXITCODE"
  }
} finally {
  $stopped = $false
  if ($previewProcess -and -not $previewProcess.HasExited) {
    Stop-ProcessTree -ProcessId $previewProcess.Id
    $stopped = $true
  }
  $previewProcessId = ''
  if ($previewProcess) {
    $previewProcessId = $previewProcess.Id
  }

  @(
    "previewProcessId=$previewProcessId"
    "previewStopped=$stopped"
    "baseUrl=$baseUrl"
    "routes=$Routes"
    "viewports=$Viewports"
    "timestamp=$((Get-Date).ToString('o'))"
  ) | Set-Content -Path $cleanupPath -Encoding UTF8
}
