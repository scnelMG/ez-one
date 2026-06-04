export interface ExtractedJobPosting {
  companyName: string | null
  positionTitle: string | null
  deadlineLabel: string | null
  sourceUrl: string
  roleOptions: string[]
  essayQuestions: EssayQuestion[]
}

export interface EssayQuestion {
  prompt: string
  maxLength: number | null
}

export function extractJobPosting(
  documentRef: Document = document,
  sourceUrl: string = documentRef.location.href
): ExtractedJobPosting {
  const title = cleanText(documentRef.querySelector('h1')?.textContent) || null
  const jasoseolData = extractJasoseolPageData(documentRef)

  return {
    companyName: extractCompanyName(documentRef, jasoseolData),
    positionTitle: title,
    deadlineLabel: extractDeadlineLabel(documentRef, jasoseolData),
    sourceUrl,
    roleOptions: extractRoleOptions(documentRef, jasoseolData),
    essayQuestions: extractEssayQuestions(documentRef)
  }
}

interface JasoseolPageData {
  companyName: string | null
  deadlineLabel: string | null
  roleOptions: string[]
}

function extractCompanyName(documentRef: Document, jasoseolData: JasoseolPageData) {
  return (
    cleanText(documentRef.querySelector('[data-ezone-company]')?.textContent) ||
    cleanText(documentRef.querySelector('a[href*="/company/"]')?.textContent) ||
    jasoseolData.companyName ||
    null
  )
}

function extractDeadlineLabel(documentRef: Document, jasoseolData: JasoseolPageData) {
  const datetime = documentRef.querySelector('time')?.getAttribute('datetime')
  return cleanText(documentRef.querySelector('[data-ezone-deadline]')?.textContent) ||
    cleanText(documentRef.querySelector('time')?.textContent) ||
    datetime ||
    jasoseolData.deadlineLabel ||
    null
}

function extractRoleOptions(documentRef: Document, jasoseolData: JasoseolPageData) {
  const explicitRoles = Array.from(documentRef.querySelectorAll('[data-ezone-role]'))
    .map((item) => cleanText(item.textContent))
    .filter((value): value is string => Boolean(value))

  if (explicitRoles.length > 0) {
    return unique(explicitRoles)
  }

  if (jasoseolData.roleOptions.length > 0) {
    return jasoseolData.roleOptions
  }

  const roleSection = findSection(documentRef, ['모집 직무', '모집 부문', '지원 분야'])
  const roleTexts = roleSection
    ? Array.from(roleSection.querySelectorAll('label, li, button')).map((item) => cleanText(item.textContent))
    : []

  return unique(roleTexts.filter((value): value is string => Boolean(value)))
}

function extractEssayQuestions(documentRef: Document): EssayQuestion[] {
  const questionSection = findSection(documentRef, '자기소개서')
  if (!questionSection) {
    return []
  }

  return Array.from(questionSection.querySelectorAll('article, li')).flatMap((item) => {
    const prompt = cleanText(item.querySelector('p, strong, h3')?.textContent)
    if (!prompt) {
      return []
    }

    return [{
      prompt,
      maxLength: extractMaxLength(cleanText(item.textContent))
    }]
  })
}

function findSection(documentRef: Document, labels: string | string[]) {
  const candidates = Array.isArray(labels) ? labels : [labels]

  return Array.from(documentRef.querySelectorAll('section, [role="region"]')).find((section) =>
    candidates.some((label) =>
      section.getAttribute('aria-label')?.includes(label) ||
      cleanText(section.querySelector('h2, h3')?.textContent)?.includes(label)
    )
  )
}

function extractMaxLength(text: string | null) {
  if (!text) {
    return null
  }

  const match = text.match(/(\d{2,5})\s*자/)
  return match ? Number(match[1]) : null
}

function cleanText(value: string | null | undefined) {
  const cleaned = value?.replace(/\s+/g, ' ').trim()
  return cleaned || null
}

function unique(values: string[]) {
  return Array.from(new Set(values))
}

function extractJasoseolPageData(documentRef: Document): JasoseolPageData {
  const empty = {
    companyName: null,
    deadlineLabel: null,
    roleOptions: []
  }
  const rawJson = documentRef.querySelector('#__NEXT_DATA__')?.textContent

  if (!rawJson) {
    return empty
  }

  try {
    const parsed = JSON.parse(rawJson) as Record<string, unknown>
    const company = readRecordPath(parsed, ['props', 'pageProps', 'initialEmploymentCompany'])
    const employments = Array.isArray(company?.employments) ? company.employments : []

    return {
      companyName: readString(company, 'name'),
      deadlineLabel: readString(company, 'end_time'),
      roleOptions: unique(employments
        .map((employment) => readString(asRecord(employment), 'field'))
        .filter((value): value is string => Boolean(value)))
    }
  } catch {
    return empty
  }
}

function readRecordPath(source: Record<string, unknown>, path: string[]) {
  return path.reduce<Record<string, unknown> | null>((current, key) => {
    if (!current) {
      return null
    }

    return asRecord(current[key])
  }, source)
}

function readString(source: Record<string, unknown> | null, key: string) {
  const value = source?.[key]
  return typeof value === 'string' ? cleanText(value) : null
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' ? value as Record<string, unknown> : null
}

declare global {
  interface Window {
    ezOneExtractJobPosting?: () => ExtractedJobPosting
  }
}

window.ezOneExtractJobPosting = () => extractJobPosting()

if (typeof chrome !== 'undefined' && chrome.runtime?.onMessage) {
  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (message?.type !== 'EZONE_EXTRACT_JOB') {
      return false
    }

    sendResponse(extractJobPosting())
    return true
  })
}
