#!/usr/bin/env python3
"""Generate SQL imports for company profile data from OpenDART.

The script intentionally writes SQL to tmp/ first. Review the generated file
before applying it to a local or shared database.
"""

from __future__ import annotations

import argparse
import io
import json
import os
from pathlib import Path
import sys
import urllib.parse
import urllib.request
import zipfile
import xml.etree.ElementTree as ET


ROOT = Path(__file__).resolve().parents[1]
BACKEND_ENV = ROOT / "backend" / ".env"
DEFAULT_OUTPUT = ROOT / "tmp" / "opendart_company_profiles.sql"
CORP_CODE_URL = "https://opendart.fss.or.kr/api/corpCode.xml"
COMPANY_URL = "https://opendart.fss.or.kr/api/company.json"
FINANCIAL_URL = "https://opendart.fss.or.kr/api/fnlttSinglAcnt.json"
ANNUAL_REPORT_CODE = "11011"


def load_env(path: Path) -> dict[str, str]:
    values: dict[str, str] = {}
    if not path.exists():
        return values

    for raw_line in path.read_text(encoding="utf-8").splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        values[key.strip()] = value.strip().strip('"').strip("'")
    return values


def request_bytes(url: str, params: dict[str, str]) -> bytes:
    query = urllib.parse.urlencode(params)
    request = urllib.request.Request(f"{url}?{query}", headers={"User-Agent": "EZ-ONE local data import"})
    with urllib.request.urlopen(request, timeout=30) as response:
        return response.read()


def request_json(url: str, params: dict[str, str]) -> dict:
    payload = request_bytes(url, params)
    return json.loads(payload.decode("utf-8"))


def load_corp_codes(api_key: str) -> list[dict[str, str]]:
    archive_bytes = request_bytes(CORP_CODE_URL, {"crtfc_key": api_key})
    with zipfile.ZipFile(io.BytesIO(archive_bytes)) as archive:
        xml_names = [name for name in archive.namelist() if name.lower().endswith(".xml")]
        if not xml_names:
            raise RuntimeError("OpenDART corpCode response did not contain an XML file.")
        xml_bytes = archive.read(xml_names[0])

    root = ET.fromstring(xml_bytes)
    companies: list[dict[str, str]] = []
    for item in root.findall("list"):
        companies.append(
            {
                "corp_code": text_or_empty(item, "corp_code"),
                "corp_name": text_or_empty(item, "corp_name"),
                "stock_code": text_or_empty(item, "stock_code"),
                "modify_date": text_or_empty(item, "modify_date"),
            }
        )
    return companies


def text_or_empty(item: ET.Element, name: str) -> str:
    child = item.find(name)
    return "" if child is None or child.text is None else child.text.strip()


def find_company(corp_codes: list[dict[str, str]], name: str) -> dict[str, str] | None:
    normalized = normalize_company_name(name)
    exact = [
        company
        for company in corp_codes
        if normalize_company_name(company["corp_name"]) == normalized
    ]
    if exact:
        return sorted(exact, key=lambda company: company["stock_code"] == "", reverse=False)[0]

    return None


def find_company_by_stock_code(corp_codes: list[dict[str, str]], stock_code: str) -> dict[str, str] | None:
    normalized = stock_code.strip()
    if not normalized:
        return None
    return next((company for company in corp_codes if company["stock_code"] == normalized), None)


def find_company_by_corp_code(corp_codes: list[dict[str, str]], corp_code: str) -> dict[str, str] | None:
    normalized = corp_code.strip()
    if not normalized:
        return None
    return next((company for company in corp_codes if company["corp_code"] == normalized), None)


def normalize_company_name(value: str) -> str:
    removable = ("주식회사", "(주)", "㈜", " ", "\t", "\n")
    normalized = value.lower()
    for token in removable:
        normalized = normalized.replace(token, "")
    return normalized


def quote_sql(value: object | None) -> str:
    if value is None:
        return "NULL"
    text = str(value).strip()
    if text == "":
        return "NULL"
    return "'" + text.replace("\\", "\\\\").replace("'", "''") + "'"


def number_sql(value: str | int | None) -> str:
    if value is None:
        return "NULL"
    digits = "".join(character for character in str(value) if character.isdigit() or character == "-")
    return digits if digits and digits != "-" else "NULL"


def date_sql(yyyymmdd: str | None) -> str:
    if not yyyymmdd or len(yyyymmdd) != 8 or not yyyymmdd.isdigit():
        return "NULL"
    return quote_sql(f"{yyyymmdd[0:4]}-{yyyymmdd[4:6]}-{yyyymmdd[6:8]}")


def company_profile_sql(company: dict, requested_name: str, source_url: str) -> str:
    company_name = requested_name or company.get("corp_name") or company.get("stock_name") or "Unknown"
    domain = domain_from_homepage(company.get("hm_url"))
    profile_summary = summarize_company(company)

    return f"""
SET @company_name = {quote_sql(company_name)};
SET @company_domain = {quote_sql(domain)};

INSERT INTO companies (name, domain, company_type, size, created_at)
VALUES (@company_name, @company_domain, {quote_sql(company.get("corp_cls"))}, NULL, CURRENT_TIMESTAMP)
ON DUPLICATE KEY UPDATE
  company_type = COALESCE(VALUES(company_type), company_type),
  updated_at = CURRENT_TIMESTAMP;

SET @company_id = (
  SELECT id FROM companies
  WHERE name = @company_name AND domain = @company_domain
  LIMIT 1
);

INSERT INTO company_profiles (
  company_id,
  corp_code,
  stock_code,
  business_number,
  industry,
  company_category,
  ceo_name,
  founded_at,
  employee_count,
  capital_amount,
  revenue_amount,
  homepage_url,
  address,
  profile_summary,
  source_updated_at
)
VALUES (
  @company_id,
  {quote_sql(company.get("corp_code"))},
  {quote_sql(company.get("stock_code"))},
  {quote_sql(company.get("bizr_no"))},
  {quote_sql(company.get("induty_code"))},
  {quote_sql(company.get("corp_cls"))},
  {quote_sql(company.get("ceo_nm"))},
  {date_sql(company.get("est_dt"))},
  NULL,
  NULL,
  NULL,
  {quote_sql(company.get("hm_url"))},
  {quote_sql(company.get("adres"))},
  {quote_sql(profile_summary)},
  CURRENT_TIMESTAMP
)
ON DUPLICATE KEY UPDATE
  corp_code = VALUES(corp_code),
  stock_code = VALUES(stock_code),
  business_number = VALUES(business_number),
  industry = VALUES(industry),
  company_category = VALUES(company_category),
  ceo_name = VALUES(ceo_name),
  founded_at = VALUES(founded_at),
  homepage_url = VALUES(homepage_url),
  address = VALUES(address),
  profile_summary = VALUES(profile_summary),
  source_updated_at = VALUES(source_updated_at);

INSERT INTO company_profile_sources (
  company_id,
  source_type,
  source_name,
  source_url,
  license_note,
  collected_at
)
VALUES (
  @company_id,
  'OPENDART',
  'OpenDART 기업개황',
  {quote_sql(source_url)},
  'OpenDART API response. API key is not stored in this SQL.',
  CURRENT_TIMESTAMP
)
ON DUPLICATE KEY UPDATE
  license_note = VALUES(license_note),
  collected_at = VALUES(collected_at);
""".strip()


def domain_from_homepage(homepage: str | None) -> str:
    if not homepage:
        return "unknown"
    value = homepage.strip()
    if not value:
        return "unknown"
    parsed = urllib.parse.urlparse(value if "://" in value else f"https://{value}")
    domain = parsed.netloc or parsed.path.split("/")[0] or "unknown"
    return domain.removeprefix("www.")


def summarize_company(company: dict) -> str:
    parts = []
    if company.get("ceo_nm"):
        parts.append(f"대표자: {company['ceo_nm']}")
    if company.get("est_dt") and len(company["est_dt"]) == 8:
        parts.append(f"설립일: {company['est_dt'][0:4]}.{company['est_dt'][4:6]}.{company['est_dt'][6:8]}")
    if company.get("adres"):
        parts.append(f"주소: {company['adres']}")
    if company.get("hm_url"):
        parts.append(f"홈페이지: {company['hm_url']}")
    return " / ".join(parts)


def financial_sql(company_id_var: str, financials: dict, source_url: str, year: str) -> str:
    rows = financials.get("list") or []
    mapped = {
        "revenue_amount": find_account_amount(rows, ("매출액", "영업수익", "수익(매출액)")),
        "operating_income_amount": find_account_amount(rows, ("영업이익", "영업손실")),
        "net_income_amount": find_account_amount(rows, ("당기순이익", "당기순손실")),
        "total_assets_amount": find_account_amount(rows, ("자산총계",)),
        "total_liabilities_amount": find_account_amount(rows, ("부채총계",)),
    }

    return f"""
INSERT INTO company_financial_snapshots (
  company_id,
  fiscal_year,
  statement_type,
  revenue_amount,
  operating_income_amount,
  net_income_amount,
  total_assets_amount,
  total_liabilities_amount,
  source_type,
  source_url,
  collected_at
)
VALUES (
  {company_id_var},
  {int(year)},
  'ANNUAL',
  {number_sql(mapped["revenue_amount"])},
  {number_sql(mapped["operating_income_amount"])},
  {number_sql(mapped["net_income_amount"])},
  {number_sql(mapped["total_assets_amount"])},
  {number_sql(mapped["total_liabilities_amount"])},
  'OPENDART',
  {quote_sql(source_url)},
  CURRENT_TIMESTAMP
)
ON DUPLICATE KEY UPDATE
  revenue_amount = VALUES(revenue_amount),
  operating_income_amount = VALUES(operating_income_amount),
  net_income_amount = VALUES(net_income_amount),
  total_assets_amount = VALUES(total_assets_amount),
  total_liabilities_amount = VALUES(total_liabilities_amount),
  source_url = VALUES(source_url),
  collected_at = VALUES(collected_at);
""".strip()


def find_account_amount(rows: list[dict], names: tuple[str, ...]) -> str | None:
    for row in rows:
        account_name = row.get("account_nm", "")
        if any(name in account_name for name in names):
            return row.get("thstrm_amount")
    return None


def read_company_names(args: argparse.Namespace) -> list[str]:
    names = list(args.company or [])
    if args.company_file:
        names.extend(
            line.strip()
            for line in Path(args.company_file).read_text(encoding="utf-8").splitlines()
            if line.strip() and not line.strip().startswith("#")
        )
    return names


def parse_mapping(values: list[str] | None, label: str) -> dict[str, str]:
    mapping: dict[str, str] = {}
    for value in values or []:
        if "=" not in value:
            raise ValueError(f"{label} must use NAME=VALUE format: {value}")
        name, mapped_value = value.split("=", 1)
        mapping[name.strip()] = mapped_value.strip()
    return mapping


def main() -> int:
    parser = argparse.ArgumentParser(description="Generate OpenDART company profile SQL imports.")
    parser.add_argument("--company", action="append", help="Company name to collect. Can be repeated.")
    parser.add_argument("--company-file", help="UTF-8 text file with one company name per line.")
    parser.add_argument("--stock-code", action="append", help="Explicit stock mapping, e.g. 네이버=035420")
    parser.add_argument("--corp-code", action="append", help="Explicit OpenDART corp code mapping, e.g. 네이버=00266961")
    parser.add_argument("--year", default=None, help="Business year for annual financial snapshot, e.g. 2025.")
    parser.add_argument("--include-financials", action="store_true", help="Also collect annual key account data.")
    parser.add_argument("--output", default=str(DEFAULT_OUTPUT), help="SQL output path.")
    args = parser.parse_args()

    env = {**load_env(BACKEND_ENV), **os.environ}
    api_key = env.get("OPENDART_API_KEY", "").strip()
    if not api_key:
        print("OPENDART_API_KEY is missing. Add it to backend/.env.", file=sys.stderr)
        return 1

    company_names = read_company_names(args)
    if not company_names:
        print("Provide --company or --company-file.", file=sys.stderr)
        return 1

    try:
        stock_code_by_name = parse_mapping(args.stock_code, "--stock-code")
        corp_code_by_name = parse_mapping(args.corp_code, "--corp-code")
    except ValueError as error:
        print(str(error), file=sys.stderr)
        return 1

    corp_codes = load_corp_codes(api_key)
    statements = [
        "-- Generated by tools/collect-opendart-company-data.py",
        "-- Review before applying. No API key is stored in this file.",
        "SET NAMES utf8mb4 COLLATE utf8mb4_unicode_ci;",
        "START TRANSACTION;",
    ]
    failures: list[str] = []

    for requested_name in company_names:
        match = None
        if requested_name in corp_code_by_name:
            match = find_company_by_corp_code(corp_codes, corp_code_by_name[requested_name])
        elif requested_name in stock_code_by_name:
            match = find_company_by_stock_code(corp_codes, stock_code_by_name[requested_name])
        else:
            match = find_company(corp_codes, requested_name)

        if not match:
            failures.append(
                f"{requested_name}: exact corp_code not found. Use --stock-code \"{requested_name}=종목코드\" "
                f"or --corp-code \"{requested_name}=고유번호\"."
            )
            continue

        company_params = {"crtfc_key": api_key, "corp_code": match["corp_code"]}
        company = request_json(COMPANY_URL, company_params)
        if company.get("status") != "000":
            failures.append(f"{requested_name}: company API failed ({company.get('status')} {company.get('message')})")
            continue

        company["corp_code"] = match["corp_code"]
        company.setdefault("stock_code", match["stock_code"])
        source_url = COMPANY_URL + "?" + urllib.parse.urlencode({"corp_code": match["corp_code"]})
        statements.append("")
        statements.append(f"-- {requested_name} -> {company.get('corp_name')} ({match['corp_code']})")
        statements.append(company_profile_sql(company, requested_name, source_url))

        if args.include_financials:
            if not args.year:
                failures.append(f"{requested_name}: --year is required with --include-financials")
            else:
                financial_params = {
                    "crtfc_key": api_key,
                    "corp_code": match["corp_code"],
                    "bsns_year": args.year,
                    "reprt_code": ANNUAL_REPORT_CODE,
                }
                financials = request_json(FINANCIAL_URL, financial_params)
                if financials.get("status") == "000":
                    financial_source_url = FINANCIAL_URL + "?" + urllib.parse.urlencode(
                        {
                            "corp_code": match["corp_code"],
                            "bsns_year": args.year,
                            "reprt_code": ANNUAL_REPORT_CODE,
                        }
                    )
                    statements.append(financial_sql("@company_id", financials, financial_source_url, args.year))
                else:
                    failures.append(
                        f"{requested_name}: financial API failed ({financials.get('status')} {financials.get('message')})"
                    )

    statements.append("")
    statements.append("COMMIT;")

    output = Path(args.output)
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text("\n".join(statements) + "\n", encoding="utf-8")
    print(f"Wrote {output}")

    if failures:
        print("Warnings:")
        for failure in failures:
            print(f"- {failure}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
