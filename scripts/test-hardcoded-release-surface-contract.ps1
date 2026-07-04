[CmdletBinding()]
param(
  [string]$RepoRoot = ""
)

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

trap {
  Write-Output "CONTRACT_ERROR: $($_.Exception.Message)"
  exit 2
}

function Resolve-RepoRoot {
  param([string]$Value)

  if ([string]::IsNullOrWhiteSpace($Value)) {
    return (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
  }

  if (-not (Test-Path -LiteralPath $Value -PathType Container)) {
    throw "RepoRoot does not exist or is not a directory."
  }

  return (Resolve-Path -LiteralPath $Value).Path
}

function Convert-ToRepoPath {
  param(
    [string]$Root,
    [string]$Path
  )

  $rootPath = [System.IO.Path]::GetFullPath($Root)
  $fullPath = [System.IO.Path]::GetFullPath($Path)
  $rootWithSeparator = $rootPath
  if (-not $rootWithSeparator.EndsWith([System.IO.Path]::DirectorySeparatorChar)) {
    $rootWithSeparator = "$rootWithSeparator$([System.IO.Path]::DirectorySeparatorChar)"
  }

  if ($fullPath.Equals($rootPath, [System.StringComparison]::OrdinalIgnoreCase)) {
    $relative = ""
  } elseif ($fullPath.StartsWith($rootWithSeparator, [System.StringComparison]::OrdinalIgnoreCase)) {
    $relative = $fullPath.Substring($rootWithSeparator.Length)
  } else {
    throw "Path is outside RepoRoot."
  }

  return ($relative -replace "\\", "/")
}

function Test-ExcludedPath {
  param([string]$RelativePath)

  $normalized = ($RelativePath -replace "\\", "/").TrimStart("/")
  $excludedPrefixes = @(
    "backend/target/",
    "frontend/dist/",
    "extension/dist/",
    "node_modules/",
    "release-artifacts/",
    "secrets/",
    ".git/",
    ".omo/evidence/",
    ".omo/start-work/",
    ".omo/plans/",
    ".omo/drafts/"
  )

  foreach ($prefix in $excludedPrefixes) {
    if ($normalized.StartsWith($prefix, [System.StringComparison]::OrdinalIgnoreCase) -or
        $normalized.Equals($prefix.TrimEnd("/"), [System.StringComparison]::OrdinalIgnoreCase)) {
      return $true
    }
  }

  return $false
}

function Test-TextSurface {
  param([string]$RelativePath)

  $fileName = [System.IO.Path]::GetFileName($RelativePath)
  $extension = [System.IO.Path]::GetExtension($RelativePath).ToLowerInvariant()
  if ($fileName -in @(".env", ".env.example", ".env.local", ".env.production", "pom.xml")) {
    return $true
  }

  return $extension -in @(
    ".java", ".js", ".ts", ".vue", ".ps1", ".sh", ".yml", ".yaml", ".properties", ".xml",
    ".md", ".json", ".toml", ".env", ".example", ".html", ".css", ".sql", ".txt", ".lock"
  )
}

function Get-UrlClassification {
  param([string]$Value)

  $trimmed = $Value.Trim().TrimEnd(".", ",", ";", ")", "]", "}")
  $uri = $null
  if ([System.Uri]::TryCreate($trimmed, [System.UriKind]::Absolute, [ref]$uri)) {
    return "url scheme:$($uri.Scheme) host:$($uri.Host.ToLowerInvariant()) path:$($uri.AbsolutePath)"
  }

  return "url malformed-or-template"
}

function Get-DomainClassification {
  param([string]$Value)

  return "domain host:$($Value.ToLowerInvariant())"
}

function Get-KeyName {
  param([string]$Value)

  $envMatch = [regex]::Match($Value, "(?i)\b[A-Z][A-Z0-9_]*(?:API_KEY|PROVIDER_KEY|CLIENT_SECRET|CLIENT_ID|TOKEN|WEBHOOK_SECRETS?|BASE_URL|API_URL|REDIRECT_URI|CALLBACK_URL|ALLOWED_ORIGINS|ENABLED)\b")
  if ($envMatch.Success) {
    return $envMatch.Value
  }

  $propertyMatch = [regex]::Match($Value, "(?i)\b(?:gms|opendart|public-data|google|notion|mattermost)[a-z0-9_.-]*(?:api-key|provider-key|secret|token|webhook|base-url|api-url|redirect-uri|callback-url|enabled)\b")
  if ($propertyMatch.Success) {
    return $propertyMatch.Value
  }

  return ""
}

function New-Finding {
  param(
    [string]$RelativePath,
    [int]$Line,
    [string]$Category,
    [string]$Classification,
    [string]$KeyName,
    [string]$Disposition,
    [string]$Reason
  )

  return [pscustomobject]@{
    File = $RelativePath
    Line = $Line
    Category = $Category
    Classification = $Classification
    KeyName = $KeyName
    Disposition = $Disposition
    Reason = $Reason
  }
}

function Get-Disposition {
  param(
    [string]$RelativePath,
    [string]$Category,
    [string]$Classification
  )

  $includeRuntimeFiles = @(
    "backend/src/main/java/com/ezone/backend/infrastructure/api/DartApiClient.java",
    "backend/src/main/java/com/ezone/backend/service/DartBatchSyncService.java",
    "backend/src/main/java/com/ezone/backend/service/OpenDartHttpClient.java",
    "backend/src/main/java/com/ezone/backend/service/OpenDartCompanyOverviewProvider.java",
    "backend/src/main/java/com/ezone/backend/infrastructure/api/VentureApiClient.java",
    "backend/src/main/java/com/ezone/backend/infrastructure/api/NationalPensionApiClient.java",
    "backend/src/main/java/com/ezone/backend/service/GmsKeyInfoHttpClient.java",
    "backend/src/main/java/com/ezone/backend/infrastructure/api/OpenAiClient.java",
    "backend/src/main/java/com/ezone/backend/service/GmsDartAiAnalysisClient.java",
    "backend/src/main/java/com/ezone/backend/service/GmsApplicationActivityAssistAiClient.java",
    "backend/src/main/java/com/ezone/backend/service/GmsAiJobRecommendationClient.java"
  )

  if ($RelativePath -match "(^|/)(test|tests|fixtures|fixture|mock|mocks|seed|seeds)(/|$)" -or
      $RelativePath -match "(^|/)docs/" -or
      $RelativePath -match "(\.lock|package-lock\.json|pnpm-lock\.yaml|yarn\.lock)$") {
    return [pscustomobject]@{
      Disposition = "defer"
      Reason = "defer-scope docs/tests/fixtures/lockfiles/seed/mock inventory only"
    }
  }

  if ($Classification -match "host:(www\.)?w3\.org|host:apache\.org|host:mybatis\.org") {
    return [pscustomobject]@{
      Disposition = "defer"
      Reason = "defer-scope namespace, XML parser feature, or MyBatis DTD"
    }
  }

  if ($RelativePath -eq "frontend/src/pages/LoginPage.vue" -or $RelativePath -eq "extension/src/popup/popup.js") {
    return [pscustomobject]@{
      Disposition = "defer"
      Reason = "safe-deferred client fallback; scripts/check-client-prod-env.ps1 and scripts/new-production-env-files.ps1 require explicit HTTPS production env overrides"
    }
  }

  if ($includeRuntimeFiles -contains $RelativePath -and $Category -in @("url", "domain")) {
    return [pscustomobject]@{
      Disposition = "include-fail"
      Reason = "include-scope runtime/release-sensitive hardcoded endpoint"
    }
  }

  if ($RelativePath -match "^scripts/" -and $Category -in @("url", "domain", "origin", "api-base-url", "callback-url")) {
    return [pscustomobject]@{
      Disposition = "defer"
      Reason = "release-script inventory; caller-provided production env and validators reject local/loopback surfaces"
    }
  }

  if ($Category -eq "provider-key-name" -or $Category -eq "feature-toggle-name") {
    return [pscustomobject]@{
      Disposition = "defer"
      Reason = "key/toggle name inventory only; value is redacted and not a hardcoded secret"
    }
  }

  return [pscustomobject]@{
    Disposition = "defer"
    Reason = "defer-scope inventory pending later refactor decision"
  }
}

function Write-FindingTable {
  param(
    [string]$Title,
    [object[]]$Findings
  )

  Write-Output ""
  Write-Output "## $Title"
  if ($Findings.Count -eq 0) {
    Write-Output "No findings."
    return
  }

  Write-Output "| disposition | category | file | line | classification | key name | reason |"
  Write-Output "| --- | --- | --- | ---: | --- | --- | --- |"
  foreach ($finding in $Findings | Sort-Object File, Line, Category, Classification -Unique) {
    $keyName = if ([string]::IsNullOrWhiteSpace($finding.KeyName)) { "-" } else { $finding.KeyName }
    Write-Output "| $($finding.Disposition) | $($finding.Category) | $($finding.File) | $($finding.Line) | $($finding.Classification) | $keyName | $($finding.Reason) |"
  }
}

$repoRootPath = Resolve-RepoRoot $RepoRoot
$findings = New-Object System.Collections.Generic.List[object]
$urlPattern = [regex]"(?i)\b(?:https?|chrome-extension)://[^\s'""``<>\)]+"
$domainPattern = [regex]"(?i)\b(?:localhost|127\.\d{1,3}\.\d{1,3}\.\d{1,3}|0\.0\.0\.0|opendart\.fss\.or\.kr|dart\.fss\.or\.kr|apis\.data\.go\.kr|gms\.ssafy\.io|api\.openai\.com|oauth2\.googleapis\.com|www\.googleapis\.com|api\.notion\.com|chromewebstore\.google\.com|jasoseol\.com)\b"
$keyPattern = [regex]"(?i)\b(?:[A-Z][A-Z0-9_]*(?:API_KEY|PROVIDER_KEY|CLIENT_SECRET|CLIENT_ID|TOKEN|WEBHOOK_SECRETS?|BASE_URL|API_URL|REDIRECT_URI|CALLBACK_URL|ALLOWED_ORIGINS|ENABLED)|(?:gms|opendart|public-data|google|notion|mattermost)[a-z0-9_.-]*(?:api-key|provider-key|secret|token|webhook|base-url|api-url|redirect-uri|callback-url|enabled))\b"

Write-Output "# Hardcoded Release Surface Contract"
Write-Output ""
Write-Output "Repo root: $repoRootPath"
Write-Output "Scan mode: local-only hardcoded release-surface inventory"
Write-Output "Secret handling: key-like values are redacted; URL findings report scheme, host, and path only."
Write-Output "Excluded trees: backend/target, frontend/dist, extension/dist, node_modules, release-artifacts, secrets, .git, .omo/evidence, .omo/start-work, .omo/plans, .omo/drafts."

$gitFiles = & git -C $repoRootPath ls-files --cached --others --exclude-standard 2>$null
if ($LASTEXITCODE -eq 0 -and @($gitFiles).Count -gt 0) {
  $candidateFiles = @($gitFiles |
    ForEach-Object {
      $relative = ($_ -replace "\\", "/").TrimStart("/")
      $fullName = Join-Path $repoRootPath $relative
      [pscustomobject]@{
        FullName = $fullName
        Relative = $relative
      }
    } |
    Where-Object {
      -not (Test-ExcludedPath $_.Relative) -and
      (Test-Path -LiteralPath $_.FullName -PathType Leaf) -and
      (Test-TextSurface $_.Relative)
    })
} else {
  $candidateFiles = @(Get-ChildItem -LiteralPath $repoRootPath -Recurse -File -Force |
    ForEach-Object {
      $relative = Convert-ToRepoPath -Root $repoRootPath -Path $_.FullName
      [pscustomobject]@{
        FullName = $_.FullName
        Relative = $relative
      }
    } |
    Where-Object { -not (Test-ExcludedPath $_.Relative) -and (Test-TextSurface $_.Relative) })
}

foreach ($file in $candidateFiles) {
  $lineNumber = 0
  foreach ($line in Get-Content -LiteralPath $file.FullName -ErrorAction Stop) {
    $lineNumber++

    foreach ($match in $urlPattern.Matches($line)) {
      $classification = Get-UrlClassification $match.Value
      $category = "url"
      if ($classification -match "path:.*/callback") {
        $category = "callback-url"
      } elseif ($classification -match "path:.*/api(?:/|$)" -or $line -match "(?i)base[_-]?url") {
        $category = "api-base-url"
      } elseif ($classification -match "path:/") {
        $category = "origin"
      }
      $disposition = Get-Disposition -RelativePath $file.Relative -Category $category -Classification $classification
      $findings.Add((New-Finding -RelativePath $file.Relative -Line $lineNumber -Category $category -Classification $classification -KeyName (Get-KeyName $line) -Disposition $disposition.Disposition -Reason $disposition.Reason))
    }

    foreach ($match in $domainPattern.Matches($line)) {
      $classification = Get-DomainClassification $match.Value
      $disposition = Get-Disposition -RelativePath $file.Relative -Category "domain" -Classification $classification
      $findings.Add((New-Finding -RelativePath $file.Relative -Line $lineNumber -Category "domain" -Classification $classification -KeyName (Get-KeyName $line) -Disposition $disposition.Disposition -Reason $disposition.Reason))
    }

    foreach ($match in $keyPattern.Matches($line)) {
      $keyName = $match.Value
      $category = if ($keyName -match "(?i)ENABLED$") { "feature-toggle-name" } else { "provider-key-name" }
      $disposition = Get-Disposition -RelativePath $file.Relative -Category $category -Classification "key-name redacted-value"
      $findings.Add((New-Finding -RelativePath $file.Relative -Line $lineNumber -Category $category -Classification "key-name redacted-value" -KeyName $keyName -Disposition $disposition.Disposition -Reason $disposition.Reason))
    }
  }
}

$includeFindings = @($findings | Where-Object { $_.Disposition -eq "include-fail" })
$deferFindings = @($findings | Where-Object { $_.Disposition -ne "include-fail" })

Write-FindingTable -Title "Include-Scope Findings - Contract Fails On These Hardcoded Runtime Surfaces" -Findings $includeFindings
Write-FindingTable -Title "Deferred Inventory - No Refactor Required In T0" -Findings $deferFindings

Write-Output ""
Write-Output "## Summary"
Write-Output "SCANNED_FILES=$(@($candidateFiles).Count)"
Write-Output "INCLUDE_SCOPE_FINDINGS=$($includeFindings.Count)"
Write-Output "DEFER_SCOPE_FINDINGS=$($deferFindings.Count)"
Write-Output "CLIENT_FALLBACK_DEFER_REASON: scripts/check-client-prod-env.ps1 and scripts/new-production-env-files.ps1 require explicit HTTPS production env overrides"

$status = & git -C $repoRootPath status --short 2>$null
if ($LASTEXITCODE -eq 0) {
  $dirtyCount = @($status).Count
  Write-Output "DIRTY_WORKTREE_AWARENESS=observed $dirtyCount changed or untracked paths; contract did not revert or modify them"
} else {
  Write-Output "DIRTY_WORKTREE_AWARENESS=git status unavailable; contract continued without mutating worktree"
}

if ($includeFindings.Count -gt 0) {
  Write-Output "CONTRACT_RESULT=FAIL hardcoded include-scope runtime/release-sensitive findings require later T2 remediation"
  exit 1
}

Write-Output "CONTRACT_RESULT=PASS no include-scope hardcoded runtime/release-sensitive findings detected"
exit 0
