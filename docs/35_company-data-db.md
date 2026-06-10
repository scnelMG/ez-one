# Company Data DB

## Goal

Workspace company info should come from traceable, low-risk sources instead of copied job-board pages.
The database keeps the display-ready company profile separate from raw source documents so we can show concise data in the UI while preserving where each value came from.

## Source Priority

1. OpenDART company profile and filings for listed or disclosure-subject companies.
2. Public data portals with clear API terms and source attribution.
3. Manual entry from company-owned pages when the text is summarized in our own words and the source URL is recorded.

Do not store private API keys, crawler cookies, paid database exports, or copied third-party article text in SQL files.

## Tables

| Table | Purpose |
| --- | --- |
| `company_profiles` | One display profile per `companies.id`: industry, CEO, founded date, employee count, homepage, address, and summary. |
| `company_profile_sources` | Attribution and license notes for each source used by a company profile. |
| `company_financial_snapshots` | Yearly financial facts extracted from DART or another allowed source. |
| `company_raw_documents` | Optional raw API payload/text snippets for audit and reprocessing. Use sparingly and keep license notes. |

## Local Workflow

1. Put local DB credentials in `backend/.env`. Do not send or commit the file.
2. Add `OPENDART_API_KEY` to `backend/.env`.
3. Start MySQL and create the local database/user if they do not exist.
4. Start the backend or run Flyway so `V14__add_company_profile_data_foundation.sql` creates the new tables.
5. Generate a local import SQL file:

```bash
python3 tools/collect-opendart-company-data.py --company "한미약품" --output tmp/opendart_company_profiles.sql
```

For ambiguous short names, pass an explicit stock code:

```bash
python3 tools/collect-opendart-company-data.py --company "네이버" --stock-code "네이버=035420"
```

For annual financial snapshots:

```bash
python3 tools/collect-opendart-company-data.py --company "한미약품" --include-financials --year 2025
```

6. Review `tmp/opendart_company_profiles.sql` before applying it.
7. Apply the reviewed SQL to your local DB.

## Minimal Import Shape

For each target company, collect:

| Field | Required | Example |
| --- | --- | --- |
| company name | Yes | `한미그룹` |
| domain | Yes | `hanmi.co.kr` |
| DART corp code | Recommended | `00126380` |
| stock code | Optional | `128940` |
| source URL | Yes | OpenDART, public data, or company page URL |
| license/source note | Yes | `OpenDART API response, source URL recorded` |

Use `INSERT ... ON DUPLICATE KEY UPDATE` so repeated imports update existing rows instead of creating duplicates.
