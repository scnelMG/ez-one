param()

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

$scriptPath = Join-Path $PSScriptRoot "release-local-gate.ps1"
$source = Get-Content -Raw -Encoding UTF8 -LiteralPath $scriptPath

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

function Assert-NotContains {
  param(
    [string]$Text,
    [string]$Pattern,
    [string]$Message
  )

  if ($Text.Contains($Pattern)) {
    throw $Message
  }
}

Assert-Contains $source '[string]$LogFile' "release-local-gate.ps1 must accept -LogFile so full gate evidence can be saved for release-evidence import."
Assert-Contains $source 'Start-Transcript' "release-local-gate.ps1 must start a transcript when -LogFile is provided."
Assert-Contains $source 'Stop-Transcript' "release-local-gate.ps1 must stop the transcript in cleanup."
Assert-Contains $source '[INFO] Local release gate log written' "release-local-gate.ps1 must print the saved log path as informational output, not as a gate pass."
Assert-NotContains $source '[PASS] Local release gate log written' "release-local-gate.ps1 must not label log-file creation as a gate pass."
Assert-Contains $source 'New-Item -ItemType Directory -Force -Path $logDirectory' "release-local-gate.ps1 must create the log directory automatically."
Assert-Contains $source 'Get-ChildItem -LiteralPath (Join-Path $repoRoot "scripts") -Filter "*.ps1"' "release-local-gate.ps1 must discover every scripts/*.ps1 file for syntax checking."
Assert-Contains $source '$file.FullName' "release-local-gate.ps1 must syntax-check discovered script paths, not a hand-maintained list."
Assert-Contains $source 'Get-ChildItem -LiteralPath (Join-Path $repoRoot "scripts") -Filter "*.sh"' "release-local-gate.ps1 must discover every scripts/*.sh file for bash syntax checking."
Assert-Contains $source '& $runnableBash -n $bashFile.FullName' "release-local-gate.ps1 must bash-check discovered shell script paths, not a hand-maintained list."
Assert-Contains $source 'Assert-NoReleaseTextHygieneIssues' "release-local-gate.ps1 must scan release docs/scripts for whitespace and merge-conflict markers, including untracked files."
Assert-Contains $source 'trailing whitespace' "release-local-gate.ps1 must reject trailing whitespace in release text files."
Assert-Contains $source 'merge conflict marker' "release-local-gate.ps1 must reject merge conflict markers in release text files."
Assert-Contains $source 'Assert-NoMojibakeInTree' "release-local-gate.ps1 must scan source trees for mojibake, including untracked files."
Assert-Contains $source 'backend/src' "release-local-gate.ps1 must include backend source and test Java files in the mojibake guard."
Assert-Contains $source '.java' "release-local-gate.ps1 must scan Java source files for mojibake before release."
Assert-Contains $source '0xf9dd' "release-local-gate.ps1 must reject mojibake compatibility character U+F9DD."
Assert-Contains $source '0x6fe1' "release-local-gate.ps1 must reject mojibake character U+6FE1."
Assert-Contains $source '0x73e5' "release-local-gate.ps1 must reject mojibake character U+73E5."
Assert-Contains $source 'test-set-release-evidence-field-contract.ps1' "release-local-gate.ps1 must run the safe release evidence field updater contract."
Assert-Contains $source 'set release evidence field contract' "release-local-gate.ps1 must expose a named gate for the release evidence field updater."
Assert-Contains $source 'test-real-smoke-checklist-contract.ps1' "release-local-gate.ps1 must run the real integration smoke checklist contract."
Assert-Contains $source 'real integration smoke checklist contract' "release-local-gate.ps1 must expose a named gate for the real integration smoke checklist generator."
Assert-Contains $source 'test-production-env-evidence-checklist-contract.ps1' "release-local-gate.ps1 must run the production env evidence checklist contract."
Assert-Contains $source 'production env evidence checklist contract' "release-local-gate.ps1 must expose a named gate for the production env evidence checklist generator."
Assert-Contains $source 'Assert-SurefireReportsClean' "release-local-gate.ps1 must inspect backend surefire reports after Maven tests so failures cannot be hidden by native exit-code quirks."
Assert-Contains $source 'backend surefire report guard' "release-local-gate.ps1 must expose a named surefire report guard."
Assert-Contains $source '<<< FAILURE!' "release-local-gate.ps1 must reject surefire failure markers."
Assert-Contains $source 'Failures:\s*[1-9]' "release-local-gate.ps1 must reject nonzero surefire failure counts."

Write-Host "[PASS] release local gate contract test passed."
