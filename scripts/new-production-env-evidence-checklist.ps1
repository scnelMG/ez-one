[CmdletBinding()]
param(
  [Parameter(Mandatory = $true)]
  [string]$EvidenceFile,

  [string]$OutputFile = ""
)

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

$schemaPath = Join-Path $PSScriptRoot "release-evidence-schema.ps1"
. $schemaPath

function Escape-MarkdownCell {
  param([string]$Value)

  return $Value.Replace("|", "\|")
}

if (-not (Test-Path -LiteralPath $EvidenceFile -PathType Leaf)) {
  throw @"
Release evidence file was not found: $EvidenceFile
Run the full local Gate 0 first, then create release evidence with:
.\scripts\new-release-evidence.ps1 -ReleaseId <release-id> -Owner <owner-name> -LocalGateLog `$gateLog
"@
}

$evidencePath = Resolve-Path -LiteralPath $EvidenceFile
try {
  $evidence = Get-Content -Raw -LiteralPath $evidencePath | ConvertFrom-Json
} catch {
  throw "Release evidence file must be valid JSON: $($_.Exception.Message)"
}

Assert-ReleaseEvidenceMatchesSchema -Evidence $evidence

if ([string]::IsNullOrWhiteSpace($OutputFile)) {
  $OutputFile = Join-Path (Split-Path -Parent $evidencePath) "production-env-evidence-checklist.md"
}

if (-not [System.IO.Path]::IsPathRooted($OutputFile)) {
  $OutputFile = Join-Path (Resolve-Path ".") $OutputFile
}

$outputDirectory = Split-Path -Parent $OutputFile
New-Item -ItemType Directory -Force -Path $outputDirectory | Out-Null

$evidenceItems = [ordered]@{
  envPolicyCheckOutput = "Backend production env policy output"
  clientEnvPolicyCheckOutput = "Frontend/extension production env policy output"
  ec2EnvFilePath = "EC2 env file owner/mode and path"
  secretOwnerRotationNote = "secret owner and rotation note"
}

$requiredFields = (Get-ReleaseEvidenceRequiredGates).productionEnvPolicy
foreach ($field in $requiredFields) {
  if (-not $evidenceItems.Contains($field)) {
    throw "Production env evidence checklist script is missing a step for gates.productionEnvPolicy.$field"
  }
}
foreach ($field in $evidenceItems.Keys) {
  if ($requiredFields -notcontains $field) {
    throw "Production env evidence checklist script has an unknown evidence field: gates.productionEnvPolicy.$field"
  }
}

$lines = New-Object System.Collections.Generic.List[string]
$lines.Add("# Production Env Evidence Checklist")
$lines.Add("")
$lines.Add("- Release ID: $($evidence.releaseId)")
$lines.Add("- Evidence file: $evidencePath")
$lines.Add("- Use real production/staging release values only.")
$lines.Add("- Do not paste raw secrets into release evidence; use command output, file path, owner, permission, and rotation notes.")
$lines.Add("")
$lines.Add("## Commands To Run")
$lines.Add("")
$lines.Add('```powershell')
$lines.Add(".\scripts\check-prod-env.ps1 -EnvFile .\secrets\ez-one.prod.env")
$lines.Add(".\scripts\check-client-prod-env.ps1 -FrontendEnvFile .\secrets\frontend.prod.env -ExtensionEnvFile .\secrets\extension.prod.env")
$lines.Add('```')
$lines.Add("")
$lines.Add("Enabled integrations require their matching production key. Disabled integrations may omit keys, including `PUBLIC_DATA_API_KEY`, `OPENDART_API_KEY`, `GMS_API_KEY`, and `MATTERMOST_WEBHOOK_SECRET(S)` when the related integration is off.")
$lines.Add("Production company sync defaults must remain `COMPANY_ENRICHMENT_REALTIME_ENABLED=false`, `COMPANY_DATA_STARTUP_SYNC_ENABLED=false`, and `COMPANY_DATA_BATCH_SYNC_ENABLED=false` unless a release owner explicitly enables realtime enrichment and provides its key evidence. Startup and batch company sync stay disabled in prod.")
$lines.Add("The client localhost/generic fallbacks are deferred only because production env/artifact validators require explicit HTTPS env overrides for frontend and extension artifacts.")
$lines.Add("")
$lines.Add("## Provider URL review table")
$lines.Add("")
$lines.Add("| Provider env key | Production review rule | Evidence to record |")
$lines.Add("| --- | --- | --- |")
$lines.Add("| `GMS_AI_BASE_URL`, `GMS_KEY_INFO_URL` | HTTPS only, non-local, expected host `gms.ssafy.io`; key-info path is `/gmsapi/key-info`. | `check-prod-env.ps1` output and reviewed env key names only. |")
$lines.Add("| `OPENDART_API_BASE_URL`, `OPENDART_VIEWER_BASE_URL`, `OPENDART_COMPANY_OVERVIEW_SOURCE_URL` | HTTPS only, non-local, expected OpenDART/DART hosts and documented paths. | `check-prod-env.ps1` output and URL host/path review, no API key values. |")
$lines.Add("| `VENTURE_COMPANY_API_URL`, `NATIONAL_PENSION_API_URL`, `PUBLIC_INSTITUTION_API_URL`, `FTC_AFFILIATE_API_URL` | Exact `apis.data.go.kr` host/path; HTTP is allowed only for these public-data endpoints. | data-sensitivity note confirming no secrets, auth headers, cookies, or personal data are sent to the HTTP endpoint. |")
$lines.Add("| `FINANCIAL_COMPANY_BASIC_INFO_URL`, `MIDDLE_MARKET_API_URL` | May be blank; if present, HTTPS only and non-local. | Blank/not used or reviewed HTTPS host/path. |")
$lines.Add("")
$lines.Add('On EC2, record the env file path, owner, and permission mode, for example `/etc/ez-one/ez-one.prod.env`, owner `root:ezone`, mode `0640`.')
$lines.Add("")
$lines.Add("## Evidence Table")
$lines.Add("")
$lines.Add("| Done | Evidence item | Evidence path | Concrete evidence to paste |")
$lines.Add("| --- | --- | --- | --- |")

foreach ($field in $requiredFields) {
  $path = "gates.productionEnvPolicy.$field"
  $lines.Add(("| [ ] | {0} | `{1}` | command output, EC2 env file owner/mode, or secret owner/rotation note |" -f (Escape-MarkdownCell $evidenceItems[$field]), $path))
}

$lines.Add("")
$lines.Add("## Evidence Update Commands")
$lines.Add("")
$lines.Add("Replace `<evidence>` with concrete evidence. Do not include raw secret values.")
$lines.Add("")

foreach ($field in $requiredFields) {
  $path = "gates.productionEnvPolicy.$field"
  $lines.Add('```powershell')
  $lines.Add(('.\scripts\set-release-evidence-field.ps1 -EvidenceFile "{0}" -Path "{1}" -Value "<evidence>"' -f $evidencePath, $path))
  $lines.Add('```')
  $lines.Add("")
}

$lines.Add("## Minimum Pass Conditions")
$lines.Add("")
$lines.Add('- `check-prod-env.ps1` passes for backend production env.')
$lines.Add('- `check-client-prod-env.ps1` passes for frontend and extension production env.')
$lines.Add("- EC2 env file path, owner, and permission mode are recorded.")
$lines.Add("- Every production secret has an owner and planned rotation note.")
$lines.Add("- Evidence contains no raw secret values.")
$lines.Add("")

Set-Content -LiteralPath $OutputFile -Encoding UTF8 -Value $lines

Write-Host "[PASS] Production env evidence checklist written: $OutputFile"
