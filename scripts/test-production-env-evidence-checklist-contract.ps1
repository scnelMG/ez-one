[CmdletBinding()]
param()

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

$repoRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
$scriptPath = Join-Path $repoRoot "scripts/new-production-env-evidence-checklist.ps1"
$schemaPath = Join-Path $repoRoot "scripts/release-evidence-schema.ps1"
. $schemaPath

function Assert-Contains {
  param(
    [string]$Text,
    [string]$Pattern,
    [string]$Message
  )

  if (-not $Text.Contains($Pattern)) {
    throw $Message
  }
}

function Invoke-ScriptCapture {
  param([string[]]$Arguments)

  $startInfo = New-Object System.Diagnostics.ProcessStartInfo
  $startInfo.FileName = "powershell"
  $startInfo.Arguments = ($Arguments | ForEach-Object {
      if ($_ -match '[\s"]') {
        '"' + ($_.Replace('"', '\"')) + '"'
      } else {
        $_
      }
    }) -join " "
  $startInfo.RedirectStandardOutput = $true
  $startInfo.RedirectStandardError = $true
  $startInfo.UseShellExecute = $false

  $process = [System.Diagnostics.Process]::Start($startInfo)
  $stdout = $process.StandardOutput.ReadToEnd()
  $stderr = $process.StandardError.ReadToEnd()
  $process.WaitForExit()

  return [pscustomobject]@{
    ExitCode = $process.ExitCode
    Output = ($stdout + $stderr)
  }
}

function New-TestEvidence {
  $gates = [ordered]@{}
  foreach ($gateName in (Get-ReleaseEvidenceRequiredGates).Keys) {
    $gate = [ordered]@{}
    foreach ($field in (Get-ReleaseEvidenceRequiredGates)[$gateName]) {
      $gate[$field] = ""
    }
    $gates[$gateName] = $gate
  }

  return [ordered]@{
    releaseId = "release-prod-env-test"
    owner = "release-owner"
    decision = "No-go"
    decisionTimestamp = "2026-06-30T21:00:00+09:00"
    gates = $gates
  }
}

$tempRoot = Join-Path ([System.IO.Path]::GetTempPath()) ("ez-one-prod-env-evidence-checklist-" + [Guid]::NewGuid().ToString("N"))
New-Item -ItemType Directory -Force -Path $tempRoot | Out-Null

try {
  $missingEvidenceFile = Join-Path $tempRoot "missing-release-evidence.json"
  $missingResult = Invoke-ScriptCapture @(
    "-NoProfile",
    "-ExecutionPolicy",
    "Bypass",
    "-File",
    $scriptPath,
    "-EvidenceFile",
    $missingEvidenceFile
  )
  if ($missingResult.ExitCode -eq 0) {
    throw "new-production-env-evidence-checklist.ps1 should fail when release-evidence.json does not exist."
  }
  $missingOutputText = $missingResult.Output
  Assert-Contains $missingOutputText "Release evidence file was not found" "Missing evidence failure must explain that release-evidence.json is missing."
  Assert-Contains $missingOutputText ".\scripts\new-release-evidence.ps1 -ReleaseId <release-id> -Owner <owner-name> -LocalGateLog `$gateLog" "Missing evidence failure must show the command that creates release evidence after Gate 0."

  $evidenceFile = Join-Path $tempRoot "release-evidence.json"
  New-TestEvidence | ConvertTo-Json -Depth 20 | Set-Content -Encoding UTF8 -LiteralPath $evidenceFile

  $output = & powershell -NoProfile -ExecutionPolicy Bypass -File $scriptPath -EvidenceFile $evidenceFile 2>&1
  if ($LASTEXITCODE -ne 0) {
    throw "new-production-env-evidence-checklist.ps1 should generate a checklist. Output: $($output -join "`n")"
  }

  $checklistFile = Join-Path $tempRoot "production-env-evidence-checklist.md"
  if (-not (Test-Path -LiteralPath $checklistFile -PathType Leaf)) {
    throw "Expected production env evidence checklist file to be created beside release evidence."
  }

  $text = [System.IO.File]::ReadAllText($checklistFile, [System.Text.Encoding]::UTF8)
  Assert-Contains $text "# Production Env Evidence Checklist" "Checklist must have a clear title."
  Assert-Contains $text "release-prod-env-test" "Checklist must include the release id."
  Assert-Contains $text "Use real production/staging release values only." "Checklist must warn operators to avoid placeholders."
  Assert-Contains $text ".\scripts\check-prod-env.ps1 -EnvFile .\secrets\ez-one.prod.env" "Checklist must show the backend env policy command."
  Assert-Contains $text ".\scripts\check-client-prod-env.ps1 -FrontendEnvFile .\secrets\frontend.prod.env -ExtensionEnvFile .\secrets\extension.prod.env" "Checklist must show the client env policy command."
  Assert-Contains $text "EC2 env file owner/mode" "Checklist must require EC2 env file owner/mode evidence."
  Assert-Contains $text "secret owner and rotation note" "Checklist must require secret owner and rotation evidence."
  Assert-Contains $text "Enabled integrations require their matching production key" "Checklist must explain enabled integration key requirements."
  Assert-Contains $text "Disabled integrations may omit keys" "Checklist must explain disabled integration key policy."
  Assert-Contains $text "COMPANY_DATA_STARTUP_SYNC_ENABLED=false" "Checklist must document startup company sync disabled in production."
  Assert-Contains $text "COMPANY_DATA_BATCH_SYNC_ENABLED=false" "Checklist must document batch company sync disabled in production."
  Assert-Contains $text "Provider URL review table" "Checklist must include a provider URL review table."
  Assert-Contains $text "data-sensitivity note" "Checklist must include the public-data HTTP data-sensitivity note."
  Assert-Contains $text "client localhost/generic fallbacks are deferred only because production env/artifact validators require explicit HTTPS env overrides" "Checklist must document the client fallback deferral reason."

  foreach ($field in (Get-ReleaseEvidenceRequiredGates).productionEnvPolicy) {
    $path = "gates.productionEnvPolicy.$field"
    Assert-Contains $text $path "Checklist must include evidence path $path."
    Assert-Contains $text ".\scripts\set-release-evidence-field.ps1 -EvidenceFile `"$evidenceFile`" -Path `"$path`" -Value" "Checklist must show the evidence update command for $path."
  }

  Write-Host "[PASS] production env evidence checklist contract test passed."
} finally {
  Remove-Item -LiteralPath $tempRoot -Recurse -Force -ErrorAction SilentlyContinue
}
