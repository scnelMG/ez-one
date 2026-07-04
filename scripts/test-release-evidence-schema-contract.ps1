[CmdletBinding()]
param()

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

$repoRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
$schemaScript = Join-Path $repoRoot "scripts/release-evidence-schema.ps1"
$checkScript = Join-Path $repoRoot "scripts/check-release-evidence.ps1"
$gapScript = Join-Path $repoRoot "scripts/show-release-evidence-gaps.ps1"
$newEvidenceScript = Join-Path $repoRoot "scripts/new-release-evidence.ps1"
$templatePath = Join-Path $repoRoot "docs/40_release-evidence.template.json"
$runbookPath = Join-Path $repoRoot "docs/39_production-deployment-runbook.md"

if (-not (Test-Path -LiteralPath $schemaScript)) {
  throw "scripts/release-evidence-schema.ps1 must define the shared release evidence schema."
}

. $schemaScript

foreach ($functionName in @(
    "Get-ReleaseEvidenceRequiredTopLevel",
    "Get-ReleaseEvidenceRequiredGates",
    "Get-ReleaseEvidenceGateHints",
    "Get-ReleaseEvidenceFieldHints",
    "Assert-ReleaseEvidenceFieldHintsComplete",
    "Assert-ReleaseEvidenceTemplateMatchesSchema",
    "Assert-ReleaseEvidenceMatchesSchema",
    "Assert-ReleaseEvidenceRunbookHintsResolvable",
    "Test-ReleaseEvidencePlaceholder"
  )) {
  if (-not (Get-Command $functionName -ErrorAction SilentlyContinue)) {
    throw "release-evidence-schema.ps1 must define $functionName."
  }
}

$topLevel = Get-ReleaseEvidenceRequiredTopLevel
foreach ($field in @("releaseId", "owner", "decision", "decisionTimestamp", "gates")) {
  if ($topLevel -notcontains $field) {
    throw "shared release evidence schema must require root.$field."
  }
}

$gates = Get-ReleaseEvidenceRequiredGates
foreach ($gateName in @(
    "localReleaseGate",
    "productionEnvPolicy",
    "dbBackupMigrationRehearsal",
    "artifactBuildInstall",
    "ec2Runtime",
    "realIntegrationSmoke",
    "canary",
    "rollback"
  )) {
  if (-not $gates.Contains($gateName)) {
    throw "shared release evidence schema must require gates.$gateName."
  }
}

if ($gates.rollback -notcontains "previousExtensionArtifactPath") {
  throw "shared release evidence schema must require rollback.previousExtensionArtifactPath."
}

$hints = Get-ReleaseEvidenceGateHints
foreach ($gateName in $gates.Keys) {
  if (-not $hints.Contains($gateName)) {
    throw "shared release evidence schema must provide a runbook hint for gates.$gateName."
  }
  if ($hints[$gateName] -notmatch [regex]::Escape("docs/39_production-deployment-runbook.md")) {
    throw "runbook hint for gates.$gateName must point to docs/39_production-deployment-runbook.md."
  }
}

if (-not (Test-ReleaseEvidencePlaceholder -Value "pending until deploy")) {
  throw "shared release evidence schema must reject placeholder sentences."
}
if (Test-ReleaseEvidencePlaceholder -Value "release evidence recorded with command output path") {
  throw "shared release evidence schema must allow concrete evidence notes."
}

Assert-ReleaseEvidenceTemplateMatchesSchema -TemplateFile $templatePath
Assert-ReleaseEvidenceRunbookHintsResolvable -RunbookFile $runbookPath
Assert-ReleaseEvidenceFieldHintsComplete

$badTemplate = Get-Content -Raw -LiteralPath $templatePath | ConvertFrom-Json
$badTemplate.gates.rollback.PSObject.Properties.Remove("previousChecksumFilePath")
$badTemplatePath = Join-Path ([System.IO.Path]::GetTempPath()) ("ez-one-bad-evidence-template-" + [Guid]::NewGuid().ToString("N") + ".json")
try {
  $badTemplate | ConvertTo-Json -Depth 20 | Set-Content -Encoding ASCII -LiteralPath $badTemplatePath
  $failedBadTemplateAsExpected = $false
  try {
    Assert-ReleaseEvidenceTemplateMatchesSchema -TemplateFile $badTemplatePath
  } catch {
    $failedBadTemplateAsExpected = $true
  }
  if (-not $failedBadTemplateAsExpected) {
    throw "Assert-ReleaseEvidenceTemplateMatchesSchema must reject templates missing schema fields."
  }
} finally {
  Remove-Item -LiteralPath $badTemplatePath -Force -ErrorAction SilentlyContinue
}

$extraTemplate = Get-Content -Raw -LiteralPath $templatePath | ConvertFrom-Json
$extraTemplate.gates.canary | Add-Member -NotePropertyName "staleEvidenceField" -NotePropertyValue ""
$extraTemplatePath = Join-Path ([System.IO.Path]::GetTempPath()) ("ez-one-extra-evidence-template-" + [Guid]::NewGuid().ToString("N") + ".json")
try {
  $extraTemplate | ConvertTo-Json -Depth 20 | Set-Content -Encoding ASCII -LiteralPath $extraTemplatePath
  $failedExtraTemplateAsExpected = $false
  try {
    Assert-ReleaseEvidenceTemplateMatchesSchema -TemplateFile $extraTemplatePath
  } catch {
    $failedExtraTemplateAsExpected = $true
  }
  if (-not $failedExtraTemplateAsExpected) {
    throw "Assert-ReleaseEvidenceTemplateMatchesSchema must reject templates with unknown schema fields."
  }
} finally {
  Remove-Item -LiteralPath $extraTemplatePath -Force -ErrorAction SilentlyContinue
}

$checkSource = Get-Content -Raw -LiteralPath $checkScript
$gapSource = Get-Content -Raw -LiteralPath $gapScript
$newEvidenceSource = Get-Content -Raw -LiteralPath $newEvidenceScript
foreach ($scriptAndSource in @(
    [pscustomobject]@{ Name = "check-release-evidence.ps1"; Source = $checkSource },
    [pscustomobject]@{ Name = "show-release-evidence-gaps.ps1"; Source = $gapSource },
    [pscustomobject]@{ Name = "new-release-evidence.ps1"; Source = $newEvidenceSource }
  )) {
  if ($scriptAndSource.Source -notmatch [regex]::Escape("release-evidence-schema.ps1")) {
    throw "$($scriptAndSource.Name) must dot-source the shared release evidence schema."
  }
  if ($scriptAndSource.Source -match '\$requiredGates\s*=\s*\[ordered\]@') {
    throw "$($scriptAndSource.Name) must not duplicate the required gate field map."
  }
}

Write-Host "[PASS] release evidence schema contract test passed."
