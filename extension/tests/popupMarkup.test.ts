import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

describe('extension popup markup', () => {
  const markup = readFileSync(resolve(__dirname, '../popup.html'), 'utf-8')

  it('uses the P1 job-save wireframe copy without corrupted Korean text', () => {
    expect(markup).toContain('공고 저장하기')
    expect(markup).toContain('서류 정보 입력하기')
    expect(markup).toContain('선택한 공고 장바구니에 담기')
    expect(markup).toContain('장바구니에 담았습니다')
    expect(markup).not.toContain('濡')
    expect(markup).not.toContain('怨')
    expect(markup).not.toContain('�')
  })
})
