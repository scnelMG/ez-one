param(
  [switch]$Fix
)

$ErrorActionPreference = "Stop"

$root = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$utf8Strict = [System.Text.UTF8Encoding]::new($false, $true)
$utf8NoBom = [System.Text.UTF8Encoding]::new($false)

$skipDirs = @(
  ".git",
  ".codex-run-logs",
  "node_modules",
  "dist",
  "target",
  "build",
  ".vite",
  "coverage",
  "tmp",
  "temp"
)

$textExtensions = @(
  ".css",
  ".html",
  ".java",
  ".js",
  ".json",
  ".md",
  ".properties",
  ".ps1",
  ".sh",
  ".sql",
  ".toml",
  ".txt",
  ".vue",
  ".xml",
  ".yaml",
  ".yml"
)

$textNames = @(
  ".editorconfig",
  ".env.example",
  ".gitattributes",
  ".gitignore"
)

function Get-RelativePath {
  param([string]$Path)

  return $Path.Substring($root.Length).TrimStart("\", "/")
}

function Test-SkippedPath {
  param([string]$Path)

  $relative = Get-RelativePath $Path
  $parts = $relative -split "[/\\]"
  foreach ($part in $parts) {
    if ($skipDirs -contains $part) {
      return $true
    }
  }

  return $false
}

$issues = New-Object System.Collections.Generic.List[object]

Get-ChildItem -LiteralPath $root -Recurse -File -Force |
  Where-Object { -not (Test-SkippedPath $_.FullName) } |
  Where-Object {
    $extension = $_.Extension.ToLowerInvariant()
    $name = $_.Name.ToLowerInvariant()
    $textExtensions -contains $extension -or $textNames -contains $name
  } |
  ForEach-Object {
    $bytes = [IO.File]::ReadAllBytes($_.FullName)
    $relative = Get-RelativePath $_.FullName

    if ($bytes.Length -ge 3 -and $bytes[0] -eq 0xEF -and $bytes[1] -eq 0xBB -and $bytes[2] -eq 0xBF) {
      if ($Fix) {
        $content = [System.Text.Encoding]::UTF8.GetString($bytes, 3, $bytes.Length - 3)
        [IO.File]::WriteAllText($_.FullName, $content, $utf8NoBom)
      } else {
        $issues.Add([pscustomobject]@{ Issue = "UTF-8 BOM"; Path = $relative })
      }
      return
    }

    if ($bytes.Length -ge 2 -and (($bytes[0] -eq 0xFF -and $bytes[1] -eq 0xFE) -or ($bytes[0] -eq 0xFE -and $bytes[1] -eq 0xFF))) {
      $issues.Add([pscustomobject]@{ Issue = "UTF-16 BOM"; Path = $relative })
      return
    }

    try {
      [void]$utf8Strict.GetString($bytes)
    } catch {
      $issues.Add([pscustomobject]@{ Issue = "Invalid UTF-8"; Path = $relative })
    }
  }

if ($Fix) {
  Write-Host "Encoding fix complete. Re-run without -Fix to verify."
  exit 0
}

if ($issues.Count -gt 0) {
  $issues | Sort-Object Issue, Path | Format-Table -AutoSize
  exit 1
}

Write-Host "Encoding check passed: text files are UTF-8 without BOM."
