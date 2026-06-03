import { describe, expect, it } from 'vitest'
import { extractJobPosting } from '../src/content/jobExtractor'

describe('extractJobPosting', () => {
  it('extracts a title and source URL from a posting page fixture', () => {
    const doc = document.implementation.createHTMLDocument('posting')
    doc.body.innerHTML = '<h1>Backend Developer</h1>'

    expect(extractJobPosting(doc, 'https://www.jasoseol.com/recruit/1')).toEqual({
      companyName: null,
      positionTitle: 'Backend Developer',
      sourceUrl: 'https://www.jasoseol.com/recruit/1'
    })
  })
})
