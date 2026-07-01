param()

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

$repoRoot = Resolve-Path (Join-Path $PSScriptRoot "..")

$releaseDocs = @(
  "docs/38_release-readiness-qa.md",
  "docs/39_production-deployment-runbook.md",
  "docs/41_beginner-deployment-guide.md",
  "docs/42_first-deployment-ko.md"
)

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

foreach ($relativePath in $releaseDocs) {
  $path = Join-Path $repoRoot $relativePath
  $text = [System.IO.File]::ReadAllText($path, [System.Text.Encoding]::UTF8)
  $fenceCount = [regex]::Matches($text, '(?m)^```').Count
  if (($fenceCount % 2) -ne 0) {
    throw "$relativePath has an unbalanced markdown code fence count: $fenceCount"
  }

  $scriptReferences = [regex]::Matches($text, 'scripts[\\/][A-Za-z0-9_.-]+') | ForEach-Object { $_.Value } | Sort-Object -Unique
  foreach ($scriptReference in $scriptReferences) {
    $normalizedScriptReference = $scriptReference -replace '/', '\'
    $scriptPath = Join-Path $repoRoot $normalizedScriptReference
    if (-not (Test-Path -LiteralPath $scriptPath -PathType Leaf)) {
      throw "$relativePath references missing script: $scriptReference"
    }
  }
}

foreach ($relativePath in @(
    "docs/38_release-readiness-qa.md",
    "docs/39_production-deployment-runbook.md",
    "docs/41_beginner-deployment-guide.md",
    "docs/42_first-deployment-ko.md"
  )) {
  $path = Join-Path $repoRoot $relativePath
  $text = [System.IO.File]::ReadAllText($path, [System.Text.Encoding]::UTF8)
  Assert-Contains $text '$gateLog = ".\.codex-run-logs\release-local-gate-full-$(Get-Date -Format yyyyMMdd-HHmmss).log"' "$relativePath must show the standard local gate evidence log path."
  Assert-Contains $text '.\scripts\release-local-gate.ps1 -LogFile $gateLog' "$relativePath must run the local release gate with -LogFile."
  Assert-Contains $text "-SkipSlow" "$relativePath must explain that -SkipSlow output is not valid final release evidence."
}

foreach ($relativePath in @(
    "docs/39_production-deployment-runbook.md",
    "docs/41_beginner-deployment-guide.md",
    "docs/42_first-deployment-ko.md"
  )) {
  $path = Join-Path $repoRoot $relativePath
  $text = [System.IO.File]::ReadAllText($path, [System.Text.Encoding]::UTF8)
  Assert-Contains $text '.\scripts\new-release-evidence.ps1 -ReleaseId <release-id> -Owner <owner-name> -LocalGateLog $gateLog' "$relativePath must import Gate 0 evidence from the local gate log."
  $newEvidenceIndex = $text.IndexOf('.\scripts\new-release-evidence.ps1 -ReleaseId <release-id> -Owner <owner-name> -LocalGateLog $gateLog')
  $envChecklistIndex = $text.IndexOf('.\scripts\new-production-env-evidence-checklist.ps1 -EvidenceFile .\release-artifacts\<release-id>\release-evidence.json')
  if ($envChecklistIndex -lt 0) {
    throw "$relativePath must document the production env evidence checklist generator command."
  }
  if ($newEvidenceIndex -gt $envChecklistIndex) {
    throw "$relativePath must create release-evidence.json before telling operators to generate production-env-evidence-checklist.md."
  }
  foreach ($line in $text -split "`r?`n") {
    if ($line.Trim() -eq '.\scripts\new-release-evidence.ps1 -ReleaseId <release-id> -Owner <owner-name>') {
      throw "$relativePath must not tell operators to initialize release evidence without -LocalGateLog after Gate 0 creates `$gateLog."
    }
  }
}

foreach ($relativePath in @(
    "docs/39_production-deployment-runbook.md",
    "docs/41_beginner-deployment-guide.md",
    "docs/42_first-deployment-ko.md"
  )) {
  $path = Join-Path $repoRoot $relativePath
  $text = [System.IO.File]::ReadAllText($path, [System.Text.Encoding]::UTF8)
  $gapIndex = $text.IndexOf('.\scripts\show-release-evidence-gaps.ps1 -EvidenceFile .\release-artifacts\<release-id>\release-evidence.json')
  $checkIndex = $text.IndexOf('.\scripts\check-release-evidence.ps1 -EvidenceFile .\release-artifacts\<release-id>\release-evidence.json')
  if ($gapIndex -lt 0) {
    throw "$relativePath must show the release evidence gap report command."
  }
  if ($checkIndex -lt 0) {
    throw "$relativePath must show the strict release evidence check command."
  }
  if ($gapIndex -gt $checkIndex) {
    throw "$relativePath must tell operators to run show-release-evidence-gaps.ps1 before check-release-evidence.ps1."
  }
  Assert-Contains $text "Suggested evidence examples" "$relativePath must explain that the gap report prints field-level suggested evidence examples."
}

foreach ($relativePath in @(
    "docs/41_beginner-deployment-guide.md",
    "docs/42_first-deployment-ko.md"
  )) {
  $path = Join-Path $repoRoot $relativePath
  $text = [System.IO.File]::ReadAllText($path, [System.Text.Encoding]::UTF8)
  Assert-Contains $text '.\scripts\check-deployment-prereqs.ps1 -RequireDatabaseTools -RequireBash' "$relativePath must show the one-command first-deploy prerequisite check that requires DB tools and Bash."
}

foreach ($relativePath in @(
    "docs/39_production-deployment-runbook.md",
    "docs/41_beginner-deployment-guide.md",
    "docs/42_first-deployment-ko.md"
  )) {
  $path = Join-Path $repoRoot $relativePath
  $text = [System.IO.File]::ReadAllText($path, [System.Text.Encoding]::UTF8)
  Assert-Contains $text "-ProductionApprovalNote" "$relativePath must document that production DB restore/migration requires a concrete production approval note."
  Assert-Contains $text "incident/release owner" "$relativePath must tell operators that the production approval note should include the incident/release owner."
}

foreach ($relativePath in @(
    "docs/39_production-deployment-runbook.md",
    "docs/41_beginner-deployment-guide.md",
    "docs/42_first-deployment-ko.md"
  )) {
  $path = Join-Path $repoRoot $relativePath
  $text = [System.IO.File]::ReadAllText($path, [System.Text.Encoding]::UTF8)
  Assert-Contains $text '.\scripts\new-production-env-evidence-checklist.ps1 -EvidenceFile .\release-artifacts\<release-id>\release-evidence.json' "$relativePath must document the production env evidence checklist generator command."
  Assert-Contains $text "production-env-evidence-checklist.md" "$relativePath must document the generated production env evidence checklist file."
  Assert-Contains $text "SPRING_PROFILES_ACTIVE" "$relativePath must document SPRING_PROFILES_ACTIVE production env validation."
  Assert-Contains $text "SQL_INIT_MODE" "$relativePath must document SQL_INIT_MODE production env validation."
  Assert-Contains $text "DB_NAME" "$relativePath must document DB_NAME production env validation."
  Assert-Contains $text "DB_PASSWORD" "$relativePath must document DB_PASSWORD production env validation."
  Assert-Contains $text "GOOGLE_CLIENT_SECRET" "$relativePath must document GOOGLE_CLIENT_SECRET production env validation."
  Assert-Contains $text "NOTION_CLIENT_SECRET" "$relativePath must document NOTION_CLIENT_SECRET production env validation."
  Assert-Contains $text "official Google/Notion production endpoints" "$relativePath must document official Google/Notion endpoint validation."
  Assert-Contains $text "at least 16 characters" "$relativePath must document minimum length checks for production DB/OAuth secrets."
  Assert-Contains $text "Enabled integrations require their matching production key" "$relativePath must document enabled integration key requirements."
  Assert-Contains $text "Disabled integrations may omit keys" "$relativePath must document disabled integration key policy."
  Assert-Contains $text "COMPANY_ENRICHMENT_REALTIME_ENABLED" "$relativePath must document realtime company enrichment policy."
  Assert-Contains $text "COMPANY_DATA_STARTUP_SYNC_ENABLED=false" "$relativePath must document startup company sync disabled in production."
  Assert-Contains $text "COMPANY_DATA_BATCH_SYNC_ENABLED=false" "$relativePath must document batch company sync disabled in production."
  Assert-Contains $text "Provider URL review table" "$relativePath must include provider URL review wording."
  Assert-Contains $text "data-sensitivity note" "$relativePath must include the justified HTTP public-data data-sensitivity note."
  Assert-Contains $text "client localhost/generic fallbacks are deferred only because production env/artifact validators require explicit HTTPS env overrides" "$relativePath must document why client localhost/generic fallbacks are deferred."
}

$backlogPath = Join-Path $repoRoot "docs/43_post_release_qa_hardening_backlog.md"
$backlogText = [System.IO.File]::ReadAllText($backlogPath, [System.Text.Encoding]::UTF8)
Assert-Contains $backlogText "P1-CORS-005 remains partially complete until EC2 runtime env evidence and browser refresh-cookie observation are captured" "docs/43 must not mark P1-CORS-005 runtime EC2/browser evidence fully complete."
Assert-Contains $backlogText "Local hardening can satisfy the script validation portion only" "docs/43 must distinguish local CORS/env validation from runtime production evidence."

foreach ($relativePath in @(
    "docs/39_production-deployment-runbook.md",
    "docs/41_beginner-deployment-guide.md",
    "docs/42_first-deployment-ko.md"
  )) {
  $path = Join-Path $repoRoot $relativePath
  $text = [System.IO.File]::ReadAllText($path, [System.Text.Encoding]::UTF8)
  Assert-Contains $text "VITE_EXTENSION_INSTALL_URL" "$relativePath must document the production extension install URL."
  Assert-Contains $text "VITE_EXTENSION_ID" "$relativePath must document the production extension ID."
  Assert-Contains $text "non-empty" "$relativePath must document that the extension install URL cannot be empty."
  Assert-Contains $text "Chrome Web Store" "$relativePath must document that the extension install URL must be a Chrome Web Store URL."
  Assert-Contains $text 'must include `VITE_EXTENSION_ID`' "$relativePath must document that the extension install URL must include the expected extension ID."
}

foreach ($relativePath in @(
    "docs/39_production-deployment-runbook.md",
    "docs/41_beginner-deployment-guide.md",
    "docs/42_first-deployment-ko.md"
  )) {
  $path = Join-Path $repoRoot $relativePath
  $text = [System.IO.File]::ReadAllText($path, [System.Text.Encoding]::UTF8)
  Assert-Contains $text "0 observed failures and 0 observed errors" "$relativePath must document the Go decision canary failure/error evidence requirement."
}

foreach ($relativePath in @(
    "docs/39_production-deployment-runbook.md",
    "docs/41_beginner-deployment-guide.md",
    "docs/42_first-deployment-ko.md"
  )) {
  $path = Join-Path $repoRoot $relativePath
  $text = [System.IO.File]::ReadAllText($path, [System.Text.Encoding]::UTF8)
  Assert-Contains $text '.\scripts\new-real-smoke-checklist.ps1 -EvidenceFile .\release-artifacts\<release-id>\release-evidence.json -BaseUrl https://ez-one.kr' "$relativePath must document the real integration smoke checklist generator command."
  Assert-Contains $text "real-integration-smoke-checklist.md" "$relativePath must document the generated real integration smoke checklist file."
  Assert-Contains $text 'smoke checklist `-BaseUrl` must be the HTTPS origin only' "$relativePath must document the smoke checklist BaseUrl origin-only rule."
}

foreach ($relativePath in @(
    "docs/41_beginner-deployment-guide.md",
    "docs/42_first-deployment-ko.md"
  )) {
  $path = Join-Path $repoRoot $relativePath
  $text = [System.IO.File]::ReadAllText($path, [System.Text.Encoding]::UTF8)
  Assert-Contains $text 'scp .\release-artifacts\<release-id>\* ubuntu@<ec2-host>:/opt/ez-one/incoming/' "$relativePath must upload release artifacts to the EC2 host, not the public service domain."
  if ($text.Contains('ubuntu@<domain>')) {
    throw "$relativePath must not use ubuntu@<domain>; SSH/SCP examples must use ubuntu@<ec2-host> so the service domain and server address stay distinct."
  }
  Assert-Contains $text 'ssh ubuntu@<ec2-host> "mkdir -p /opt/ez-one/incoming/scripts"' "$relativePath must create the EC2 incoming scripts directory before uploading deploy helpers."
  Assert-Contains $text 'scp .\scripts\deploy-ec2-release.sh ubuntu@<ec2-host>:/opt/ez-one/incoming/scripts/' "$relativePath must upload deploy-ec2-release.sh to the same scripts path used by EC2 commands."
  Assert-Contains $text 'scp .\scripts\rollback-ec2-release.sh ubuntu@<ec2-host>:/opt/ez-one/incoming/scripts/' "$relativePath must upload rollback-ec2-release.sh to the same scripts path used by EC2 commands."
  Assert-Contains $text 'scp .\scripts\check-ec2-runtime.sh ubuntu@<ec2-host>:/opt/ez-one/incoming/scripts/' "$relativePath must upload check-ec2-runtime.sh to the same scripts path used by EC2 commands."
}

Write-Host "[PASS] release docs contract test passed."
