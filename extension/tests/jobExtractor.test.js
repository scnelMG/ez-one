import { describe, expect, it } from 'vitest';
import { extractJobPosting } from '../src/content/jobExtractor';
describe('extractJobPosting', () => {
    it('EXT-016: prefers explicit role fixtures and removes duplicate branch labels', () => {
        const doc = document.implementation.createHTMLDocument('posting');
        doc.body.innerHTML = `
      <main>
        <h1>Backend Developer</h1>
        <a href="/company/naver">Naver</a>
        <section aria-label="모집 직무">
          <label><input type="checkbox" /> Backend</label>
        </section>
        <button data-ezone-role> Backend </button>
        <button data-ezone-role>Platform</button>
        <button data-ezone-role>Backend</button>
      </main>
    `;
        expect(extractJobPosting(doc, 'https://www.jasoseol.com/recruit/1').roleOptions).toEqual([
            'Backend',
            'Platform'
        ]);
    });
    it('EXT-016: extracts branch options from 모집 부문 and 지원 분야 sections', () => {
        const branchDoc = document.implementation.createHTMLDocument('branch');
        branchDoc.body.innerHTML = `
      <main>
        <h1>Software Engineer</h1>
        <a href="/company/daangn">Daangn</a>
        <section>
          <h2>모집 부문</h2>
          <label><input type="checkbox" /> Server Engineer </label>
          <label><input type="checkbox" /> Platform Engineer </label>
        </section>
      </main>
    `;
        const fieldDoc = document.implementation.createHTMLDocument('field');
        fieldDoc.body.innerHTML = `
      <main>
        <h1>Software Engineer</h1>
        <a href="/company/kakao">Kakao</a>
        <section>
          <h3>지원 분야</h3>
          <ul>
            <li>Backend</li>
            <li>Infra</li>
          </ul>
        </section>
      </main>
    `;
        expect(extractJobPosting(branchDoc, 'https://www.jasoseol.com/recruit/2').roleOptions).toEqual([
            'Server Engineer',
            'Platform Engineer'
        ]);
        expect(extractJobPosting(fieldDoc, 'https://www.jasoseol.com/recruit/3').roleOptions).toEqual([
            'Backend',
            'Infra'
        ]);
    });
    it('EXT-016: extracts clean Jasoseol roles and company from Next page data before noisy rendered text', () => {
        const doc = document.implementation.createHTMLDocument('jasoseol');
        doc.body.innerHTML = `
      <main>
        <h1>각 직군별 신입 및 경력을 모집합니다</h1>
        <section aria-label="모집 직무">
          <li>경력iOS 개발자27명 작성자소서 문항 보기</li>
          <li>신입/경력웹 프론트엔드104명 작성자소서 문항 보기</li>
          <li>공고 오류 신고</li>
        </section>
        <script id="__NEXT_DATA__" type="application/json">
          {
            "props": {
              "pageProps": {
                "initialEmploymentCompany": {
                  "name": "자소설닷컴",
                  "end_time": "2022-01-31T23:59:00.000+09:00",
                  "employments": [
                    { "field": "iOS 개발자" },
                    { "field": "웹 프론트엔드" },
                    { "field": "iOS 개발자" }
                  ]
                }
              }
            }
          }
        </script>
      </main>
    `;
        expect(extractJobPosting(doc, 'https://www.jasoseol.com/recruit/51271')).toMatchObject({
            companyName: '자소설닷컴',
            deadlineLabel: '2022-01-31T23:59:00.000+09:00',
            roleOptions: ['iOS 개발자', '웹 프론트엔드']
        });
    });
    it('extracts Jasoseol posting fields, roles, and essay questions from a posting page fixture', () => {
        const doc = document.implementation.createHTMLDocument('posting');
        doc.body.innerHTML = `
      <main>
        <h1>Backend Developer</h1>
        <a href="/company/naver">Naver</a>
        <time datetime="2026-06-30">D-26</time>
        <section aria-label="모집 직무">
          <label><input type="checkbox" /> Backend</label>
          <label><input type="checkbox" /> Platform</label>
        </section>
        <section aria-label="자기소개서">
          <article>
            <p>지원동기를 작성해 주세요.</p>
            <span>1000자</span>
          </article>
          <article>
            <p>협업 경험을 작성해 주세요.</p>
            <span>800자</span>
          </article>
        </section>
      </main>
    `;
        expect(extractJobPosting(doc, 'https://www.jasoseol.com/recruit/1')).toEqual({
            companyName: 'Naver',
            positionTitle: 'Backend Developer',
            deadlineLabel: 'D-26',
            sourceUrl: 'https://www.jasoseol.com/recruit/1',
            logoUrl: null,
            roleOptions: ['Backend', 'Platform'],
            essayQuestions: [
                { prompt: '지원동기를 작성해 주세요.', maxLength: 1000 },
                { prompt: '협업 경험을 작성해 주세요.', maxLength: 800 }
            ]
        });
    });
    it('marks unsupported pages without silently inventing required fields', () => {
        const doc = document.implementation.createHTMLDocument('unsupported');
        doc.body.innerHTML = '<h1>일반 페이지</h1>';
        expect(extractJobPosting(doc, 'https://example.com/page')).toMatchObject({
            companyName: null,
            positionTitle: '일반 페이지',
            deadlineLabel: null,
            sourceUrl: 'https://example.com/page',
            roleOptions: [],
            essayQuestions: []
        });
    });
    it('EXT-008: extracts an absolute company logo candidate for save reuse', () => {
        const doc = document.implementation.createHTMLDocument('posting');
        doc.body.innerHTML = `
      <main>
        <h1>Backend Developer</h1>
        <a href="/company/naver">Naver</a>
        <img alt="Naver logo" src="/assets/naver-logo.png" />
      </main>
    `;
        expect(extractJobPosting(doc, 'https://www.jasoseol.com/recruit/1')).toMatchObject({
            companyName: 'Naver',
            logoUrl: 'https://www.jasoseol.com/assets/naver-logo.png'
        });
    });
});
