export interface ExtractedJobPosting {
  companyName: string | null
  positionTitle: string | null
  sourceUrl: string
}

export function extractJobPosting(
  documentRef: Document = document,
  sourceUrl: string = documentRef.location.href
): ExtractedJobPosting {
  const title = documentRef.querySelector('h1')?.textContent?.trim() || null

  return {
    companyName: null,
    positionTitle: title,
    sourceUrl
  }
}

declare global {
  interface Window {
    ezOneExtractJobPosting?: () => ExtractedJobPosting
  }
}

window.ezOneExtractJobPosting = () => extractJobPosting()
