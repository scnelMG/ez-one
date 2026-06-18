param(
    [Parameter(Mandatory = $true)]
    [string]$CsvPath,

    [Parameter(Mandatory = $true)]
    [string]$Email,

    [string]$OutFile = "tmp/history-import.sql"
)

$ErrorActionPreference = "Stop"

function K([int[]]$Codepoints) {
    return -join ($Codepoints | ForEach-Object { [char]$_ })
}

function Label([string]$Key) {
    switch ($Key) {
        "IN_PROGRESS" { return K @(0xC9C4, 0xD589, 0xC911) }
        "INTERVIEW_FAILED" { return (K @(0xBA74, 0xC811)) + " " + (K @(0xB2E8, 0xACC4)) + " " + (K @(0xC885, 0xB8CC)) }
        "TEST_FAILED" { return (K @(0xD544, 0xAE30)) + "/" + (K @(0xACFC, 0xC81C)) + " " + (K @(0xB2E8, 0xACC4)) + " " + (K @(0xC885, 0xB8CC)) }
        "DOCUMENT_FAILED" { return (K @(0xC11C, 0xB958)) + " " + (K @(0xB2E8, 0xACC4)) + " " + (K @(0xC885, 0xB8CC)) }
        "NOT_APPLIED" { return K @(0xBBF8, 0xC9C0, 0xC6D0) }
        "PUBLIC_INSTITUTION" { return (K @(0xACF5, 0xACF5)) + (K @(0xAE30, 0xAD00)) }
        "ENTERPRISE" { return K @(0xB300, 0xAE30, 0xC5C5) }
        "MID_SIZE" { return (K @(0xC911, 0xACAC)) + (K @(0xAE30, 0xC5C5)) }
        "SMALL_SIZE" { return (K @(0xC911, 0xC18C)) + (K @(0xAE30, 0xC5C5)) }
        "STARTUP" { return K @(0xC2A4, 0xD0C0, 0xD2B8, 0xC5C5) }
        "OTHER" { return (K @(0xAE30, 0xD0C0)) + (K @(0xAE30, 0xC5C5)) }
        "UNKNOWN_ROLE" { return (K @(0xC9C1, 0xBB34)) + " " + (K @(0xBBF8, 0xAE30, 0xB85D)) }
        "UNKNOWN_DEADLINE" { return (K @(0xB9C8, 0xAC10, 0xC77C)) + " " + (K @(0xBBF8, 0xAE30, 0xB85D)) }
        "UNKNOWN_SIZE" { return K @(0xBBF8, 0xD655, 0xC778) }
        default { return $Key }
    }
}

function SqlString([string]$Value) {
    if ([string]::IsNullOrWhiteSpace($Value)) {
        return "NULL"
    }
    return "'" + (NormalizeText $Value).Replace("'", "''") + "'"
}

function NormalizeText([string]$Value) {
    if ($null -eq $Value) {
        return ""
    }
    return ($Value -replace "[\r\n]+", " ").Trim()
}

function CompactText([string]$Value) {
    return (NormalizeText $Value) -replace "\s+", ""
}

function SqlDate([string]$Value) {
    if ([string]::IsNullOrWhiteSpace($Value)) {
        return "NULL"
    }
    if ($Value -match "(\d{4}).*?(\d{1,2}).*?(\d{1,2})") {
        $dateValue = "{0:D4}-{1:D2}-{2:D2}" -f [int]$matches[1], [int]$matches[2], [int]$matches[3]
        return SqlString $dateValue
    }
    return "NULL"
}

function PeriodKey([string]$Value) {
    if ($Value -match "(\d{4}).*?(\d{1,2})") {
        $year = [int]$matches[1]
        $month = [int]$matches[2]
        $half = if ($month -le 6) { "H1" } else { "H2" }
        return [pscustomobject]@{
            Key = "$year-$half"
            Year = $year
            Half = $half
        }
    }
    return [pscustomobject]@{
        Key = "UNKNOWN"
        Year = "NULL"
        Half = "UNKNOWN"
    }
}

function HasText([string]$Value, [int[]]$Codepoints) {
    return $Value.Contains((K $Codepoints))
}

function IsCompactText([string]$Value, [int[]]$Codepoints) {
    return (CompactText $Value) -eq (K $Codepoints)
}

function ResultStage([string]$Value) {
    if (IsCompactText $Value @(0xBBF8, 0xC9C0, 0xC6D0)) { return "NOT_APPLIED" }
    if (IsCompactText $Value @(0xC9C4, 0xD589, 0xC911)) { return "IN_PROGRESS" }
    if (IsCompactText $Value @(0xC11C, 0xB958, 0xD0C8, 0xB77D)) { return "DOCUMENT_FAILED" }
    if (IsCompactText $Value @(0xD544, 0xAE30, 0xD0C8, 0xB77D)) { return "TEST_FAILED" }
    if (IsCompactText $Value @(0xD544, 0xAE30, 0xBBF8, 0xC751, 0xC2DC)) { return "TEST_FAILED" }
    if (IsCompactText $Value @(0xC5ED, 0xB7C9, 0xAC80, 0xC0AC, 0xBBF8, 0xC9C0, 0xC6D0)) { return "TEST_FAILED" }
    if (IsCompactText $Value @(0xBA74, 0xC811, 0xD0C8, 0xB77D)) { return "INTERVIEW_FAILED" }
    if (IsCompactText $Value @(0xBA74, 0xC811, 0xBBF8, 0xC751, 0xC2DC)) { return "INTERVIEW_FAILED" }
    if (HasText $Value @(0xC9C4, 0xD589)) { return "IN_PROGRESS" }
    if (HasText $Value @(0xBA74, 0xC811)) { return "INTERVIEW_FAILED" }
    if ((HasText $Value @(0xD544, 0xAE30)) -or (HasText $Value @(0xC5ED, 0xB7C9)) -or (HasText $Value @(0xAC80, 0xC0AC)) -or (HasText $Value @(0xACFC, 0xC81C))) {
        return "TEST_FAILED"
    }
    if (HasText $Value @(0xC11C, 0xB958)) { return "DOCUMENT_FAILED" }
    return "NOT_APPLIED"
}

function ResultLabel([string]$Stage) {
    return Label $Stage
}

function ApplicationStatus([string]$Stage) {
    if ($Stage -eq "IN_PROGRESS") {
        return "IN_PROGRESS"
    }
    if ($Stage -eq "NOT_APPLIED") {
        return "NOT_APPLIED"
    }
    return "COMPLETED"
}

function CompanyType([string]$CompanyName, [string]$SourceUrl) {
    $domainHost = DomainFromUrl $SourceUrl
    if ((HasText $CompanyName @(0xACF5, 0xC0AC)) -or (HasText $CompanyName @(0xACF5, 0xB2E8)) -or (HasText $CompanyName @(0xAE30, 0xAD00)) -or (HasText $CompanyName @(0xC7AC, 0xB2E8)) -or (HasText $CompanyName @(0xC815, 0xBD80)) -or ($domainHost -match "kdb|bok")) {
        return Label "PUBLIC_INSTITUTION"
    }
    if ($domainHost -match "samsung|hyundai|lg|sk|naver|kakao|nexon|hanwha|cj|kt|nhn|coupang|linecorp|woowahan|toss|lotte|koreanair") {
        return Label "ENTERPRISE"
    }
    if ($domainHost -match "dalpha|wrtn|upstage|wanted|buzzvil|classum|channel") {
        return Label "STARTUP"
    }
    if (HasText $CompanyName @(0xC911, 0xACAC)) {
        return Label "MID_SIZE"
    }
    if (HasText $CompanyName @(0xC911, 0xC18C)) {
        return Label "SMALL_SIZE"
    }
    return Label "OTHER"
}

function DomainFromUrl([string]$Url) {
    if ([string]::IsNullOrWhiteSpace($Url)) {
        return $null
    }
    try {
        $normalizedUrl = if ($Url -match "^[a-zA-Z][a-zA-Z0-9+.-]*://") { $Url } else { "https://$Url" }
        return ([Uri]$normalizedUrl).Host
    } catch {
        return $null
    }
}

function FieldByIndex($Row, [int]$Index) {
    $properties = @($Row.PSObject.Properties)
    if ($properties.Count -le $Index -or $null -eq $properties[$Index].Value) {
        return ""
    }
    return [string]$properties[$Index].Value
}

function FieldByHeader($Row, [int[][]]$HeaderCodepoints, [int]$FallbackIndex) {
    $headers = $HeaderCodepoints | ForEach-Object { K $_ }
    foreach ($property in $Row.PSObject.Properties) {
        $propertyName = NormalizeText $property.Name
        if ($headers -contains $propertyName) {
            return [string]$property.Value
        }
    }
    return FieldByIndex $Row $FallbackIndex
}

if (!(Test-Path -LiteralPath $CsvPath)) {
    throw "CSV file not found: $CsvPath"
}

$rows = Import-Csv -LiteralPath $CsvPath -Encoding UTF8
$outDir = Split-Path -Parent $OutFile
if (![string]::IsNullOrWhiteSpace($outDir) -and !(Test-Path -LiteralPath $outDir)) {
    New-Item -ItemType Directory -Path $outDir | Out-Null
}

$lines = New-Object System.Collections.Generic.List[string]
$lines.Add("-- Generated by tools/import-history-csv.ps1")
$lines.Add("-- Review this SQL before running it against a database.")
$lines.Add("START TRANSACTION;")
$lines.Add("SET @history_user_email = $(SqlString $Email);")
$lines.Add("SELECT @history_user_id := id FROM users WHERE email = @history_user_email LIMIT 1;")
$lines.Add("")

$index = 0
$imported = 0
foreach ($row in $rows) {
    $index += 1
    $companyName = NormalizeText (FieldByHeader $row @(@(0xAE30, 0xC5C5, 0xBA85)) 0)
    $sourceUrl = NormalizeText (FieldByHeader $row @(@(0xAD00, 0xB828, 0x20, 0xB9C1, 0xD06C)) 1)
    $rawResult = NormalizeText (FieldByHeader $row @(@(0xC120, 0xD0DD)) 2)
    $deadlineLabel = NormalizeText (FieldByHeader $row @(@(0xC811, 0xC218, 0x20, 0xAE30, 0xD55C)) 3)
    $positionTitle = NormalizeText (FieldByHeader $row @(@(0xC9C1, 0xBB34)) 4)
    if ([string]::IsNullOrWhiteSpace($companyName)) {
        continue
    }
    if ([string]::IsNullOrWhiteSpace($positionTitle)) {
        $positionTitle = Label "UNKNOWN_ROLE"
    }

    $stage = ResultStage $rawResult
    $status = ApplicationStatus $stage
    $period = PeriodKey $deadlineLabel
    $deadlineDate = SqlDate $deadlineLabel
    $companyType = CompanyType $companyName $sourceUrl
    $domain = DomainFromUrl $sourceUrl
    $resultLabel = ResultLabel $stage
    $fallbackDeadlineLabel = if ([string]::IsNullOrWhiteSpace($deadlineLabel)) { Label "UNKNOWN_DEADLINE" } else { $deadlineLabel }
    $companySize = Label "UNKNOWN_SIZE"

    $imported += 1
    $lines.Add("-- Row ${index}: $companyName / $positionTitle")
    $lines.Add("SET @history_company_id := NULL, @history_job_id := NULL, @history_basket_job_id := NULL, @history_workspace_id := NULL, @history_existing_workspace_id := NULL;")
    $lines.Add("SELECT @history_existing_workspace_id := workspace_id FROM application_history WHERE user_id = @history_user_id AND company_name = $(SqlString $companyName) AND position_title = $(SqlString $positionTitle) AND source_url <=> $(SqlString $sourceUrl) ORDER BY id ASC LIMIT 1;")
    $lines.Add("INSERT INTO companies (name, domain, company_type, size)")
    $lines.Add("VALUES ($(SqlString $companyName), $(SqlString $domain), $(SqlString $companyType), $(SqlString $companySize))")
    $lines.Add("ON DUPLICATE KEY UPDATE domain = COALESCE(domain, VALUES(domain)), company_type = COALESCE(company_type, VALUES(company_type)), updated_at = CURRENT_TIMESTAMP;")
    $lines.Add("SELECT @history_company_id := id FROM companies WHERE name = $(SqlString $companyName) LIMIT 1;")
    $lines.Add("INSERT INTO jobs (company_id, title, role, deadline_label, deadline_at, source, url)")
    $lines.Add("SELECT @history_company_id, $(SqlString $positionTitle), $(SqlString $positionTitle), $(SqlString $fallbackDeadlineLabel), $deadlineDate, 'HISTORY_IMPORT', $(SqlString $sourceUrl)")
    $lines.Add("WHERE @history_existing_workspace_id IS NULL AND NOT EXISTS (SELECT 1 FROM jobs WHERE company_id = @history_company_id AND title = $(SqlString $positionTitle) AND url <=> $(SqlString $sourceUrl));")
    $lines.Add("SELECT @history_job_id := id FROM jobs WHERE company_id = @history_company_id AND title = $(SqlString $positionTitle) AND url <=> $(SqlString $sourceUrl) ORDER BY id DESC LIMIT 1;")
    $lines.Add("INSERT INTO basket_jobs (user_id, job_id, application_status, status_reason, saved_source)")
    $lines.Add("SELECT @history_user_id, @history_job_id, '$status', '$stage', 'HISTORY_IMPORT'")
    $lines.Add("WHERE @history_existing_workspace_id IS NULL AND @history_user_id IS NOT NULL AND @history_job_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM basket_jobs WHERE user_id = @history_user_id AND job_id = @history_job_id AND deleted_at IS NULL);")
    $lines.Add("SELECT @history_basket_job_id := id FROM basket_jobs WHERE user_id = @history_user_id AND job_id = @history_job_id AND deleted_at IS NULL ORDER BY id DESC LIMIT 1;")
    $lines.Add("INSERT INTO workspaces (user_id, basket_job_id)")
    $lines.Add("SELECT @history_user_id, @history_basket_job_id")
    $lines.Add("WHERE @history_existing_workspace_id IS NULL AND @history_user_id IS NOT NULL AND @history_basket_job_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM workspaces WHERE basket_job_id = @history_basket_job_id);")
    $lines.Add("SELECT @history_workspace_id := id FROM workspaces WHERE basket_job_id = @history_basket_job_id LIMIT 1;")
    $lines.Add("SELECT @history_workspace_id := COALESCE(@history_existing_workspace_id, @history_workspace_id);")
    $lines.Add("INSERT INTO application_history (user_id, workspace_id, company_name, position_title, application_status, result_stage, result_label, raw_result, deadline_label, deadline_date, period_key, period_year, period_half, source_url, company_type)")
    $lines.Add("SELECT @history_user_id, @history_workspace_id, $(SqlString $companyName), $(SqlString $positionTitle), '$status', '$stage', $(SqlString $resultLabel), $(SqlString $rawResult), $(SqlString $fallbackDeadlineLabel), $deadlineDate, $(SqlString $period.Key), $($period.Year), $(SqlString $period.Half), $(SqlString $sourceUrl), $(SqlString $companyType)")
    $lines.Add("WHERE @history_user_id IS NOT NULL AND @history_workspace_id IS NOT NULL")
    $lines.Add("ON DUPLICATE KEY UPDATE application_status = VALUES(application_status), result_stage = VALUES(result_stage), result_label = VALUES(result_label), raw_result = VALUES(raw_result), position_title = VALUES(position_title), deadline_label = VALUES(deadline_label), company_type = VALUES(company_type), updated_at = CURRENT_TIMESTAMP;")
    $lines.Add("")
}

$lines.Add("COMMIT;")
$lines | Set-Content -LiteralPath $OutFile -Encoding UTF8
Write-Host "Read $($rows.Count) source rows; wrote $imported import rows to $OutFile"
