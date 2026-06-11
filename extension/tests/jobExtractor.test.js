import { describe, expect, it } from 'vitest';
import { extractJobPosting, extractJobPostingWithInteractions } from '../src/content/jobExtractor';
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
        expect(extractJobPosting(doc, 'https://www.jasoseol.com/recruit/1')).toMatchObject({
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
    it('EXT-005: reveals and extracts essay questions from role hover content', async () => {
        const doc = document.implementation.createHTMLDocument('hover-essay');
        doc.body.innerHTML = `
      <main>
        <h1>Backend Developer</h1>
        <a href="/company/naver">Naver</a>
        <time datetime="2026-06-30">D-26</time>
        <section aria-label="모집 직무">
          <table>
            <tbody>
              <tr>
                <td>신입</td>
                <td>Backend</td>
                <td>10명 작성</td>
                <td><button id="essay-button">자기소개서 작성</button></td>
              </tr>
            </tbody>
          </table>
        </section>
      </main>
    `;
        doc.getElementById('essay-button').addEventListener('mouseover', () => {
            const section = doc.createElement('section');
            section.setAttribute('aria-label', '자기소개서');
            section.innerHTML = `
          <article>
            <p>지원동기를 작성해 주세요.</p>
            <span>1000자</span>
          </article>
          <article>
            <p>직무 관련 경험을 작성해 주세요.</p>
            <span>800자</span>
          </article>
        `;
            doc.querySelector('main').append(section);
        }, { once: true });

        await expect(extractJobPostingWithInteractions(doc, 'https://www.jasoseol.com/recruit/1', {
            hoverDelayMs: 0
        })).resolves.toMatchObject({
            essayQuestions: [
                { prompt: '지원동기를 작성해 주세요.', maxLength: 1000 },
                { prompt: '직무 관련 경험을 작성해 주세요.', maxLength: 800 }
            ]
        });
    });
    it('EXT-005: keeps essay questions mapped to the selected role', async () => {
        const doc = document.implementation.createHTMLDocument('role-specific-essays');
        doc.body.innerHTML = `
      <main>
        <h1>2026년 3분기 신입 및 경력사원 채용</h1>
        <a href="/company/taewoong">태웅로직스</a>
        <time datetime="2026-06-21">2026년 6월 21일 23:59</time>
        <section aria-label="모집 직무">
          <table>
            <tbody>
              <tr>
                <td>신입</td>
                <td>자동화 기계-로봇 자동화 설계</td>
                <td>28명 작성</td>
                <td><button id="robot-essay">자기소개서 작성</button></td>
              </tr>
              <tr>
                <td>경력</td>
                <td>자율주행로봇 알고리즘 개발</td>
                <td>0명 작성</td>
                <td><button id="algorithm-essay">자기소개서 작성</button></td>
              </tr>
            </tbody>
          </table>
        </section>
      </main>
    `;
        doc.getElementById('robot-essay').addEventListener('mouseover', () => {
            doc.querySelector('[aria-label="자기소개서"]')?.remove();
            const section = doc.createElement('section');
            section.setAttribute('aria-label', '자기소개서');
            section.innerHTML = `
          <article><p>본인의 핵심 직무 능력을 요약하여 기술하세요</p><span>300자</span></article>
          <article><p>태웅로직스에 지원한 구체적인 동기는 무엇이며 입사 후 목표에 대해 기술하시오</p><span>700자</span></article>
          <article><p>본인이 지금까지 했던 일 중 가장 열정을 가지고 했던 일은 무엇이었는지 기술하시오</p><span>700자</span></article>
          <article><p>본인이 지원한 직무를 어떻게 이해하고 있는지 구체적으로 기술하고, 해당직무에 본인이 적합하다고 판단 할 수 있는 근거를 사례 및 경험을 바탕으로 기술하시오</p><span>700자</span></article>
          <article><p>최근 태웅로직스에서 발생한 이슈 한가지를 선정하여 해당 이슈에 대한 본인의 생각을 자유롭게 기술하시오</p><span>700자</span></article>
        `;
            doc.querySelector('main').append(section);
        });
        doc.getElementById('algorithm-essay').addEventListener('mouseover', () => {
            doc.querySelector('[aria-label="자기소개서"]')?.remove();
            const section = doc.createElement('section');
            section.setAttribute('aria-label', '자기소개서');
            section.innerHTML = `
          <article><p>알고리즘 개발 경험을 구체적으로 기술하세요</p><span>500자</span></article>
        `;
            doc.querySelector('main').append(section);
        });

        await expect(extractJobPostingWithInteractions(doc, 'https://jasoseol.com/recruit/taewoong', {
            hoverDelayMs: 0
        })).resolves.toMatchObject({
            roleOptions: [
                '자동화 기계-로봇 자동화 설계',
                '자율주행로봇 알고리즘 개발'
            ],
            essayQuestions: [
                { prompt: '본인의 핵심 직무 능력을 요약하여 기술하세요', maxLength: 300 },
                { prompt: '태웅로직스에 지원한 구체적인 동기는 무엇이며 입사 후 목표에 대해 기술하시오', maxLength: 700 },
                { prompt: '본인이 지금까지 했던 일 중 가장 열정을 가지고 했던 일은 무엇이었는지 기술하시오', maxLength: 700 },
                { prompt: '본인이 지원한 직무를 어떻게 이해하고 있는지 구체적으로 기술하고, 해당직무에 본인이 적합하다고 판단 할 수 있는 근거를 사례 및 경험을 바탕으로 기술하시오', maxLength: 700 },
                { prompt: '최근 태웅로직스에서 발생한 이슈 한가지를 선정하여 해당 이슈에 대한 본인의 생각을 자유롭게 기술하시오', maxLength: 700 }
            ],
            roleEssayQuestions: {
                '자동화 기계-로봇 자동화 설계': [
                    { prompt: '본인의 핵심 직무 능력을 요약하여 기술하세요', maxLength: 300 },
                    { prompt: '태웅로직스에 지원한 구체적인 동기는 무엇이며 입사 후 목표에 대해 기술하시오', maxLength: 700 },
                    { prompt: '본인이 지금까지 했던 일 중 가장 열정을 가지고 했던 일은 무엇이었는지 기술하시오', maxLength: 700 },
                    { prompt: '본인이 지원한 직무를 어떻게 이해하고 있는지 구체적으로 기술하고, 해당직무에 본인이 적합하다고 판단 할 수 있는 근거를 사례 및 경험을 바탕으로 기술하시오', maxLength: 700 },
                    { prompt: '최근 태웅로직스에서 발생한 이슈 한가지를 선정하여 해당 이슈에 대한 본인의 생각을 자유롭게 기술하시오', maxLength: 700 }
                ],
                '자율주행로봇 알고리즘 개발': [
                    { prompt: '알고리즘 개발 경험을 구체적으로 기술하세요', maxLength: 500 }
                ]
            }
        });
    });
    it('extracts a Jasoseol floating posting modal from the listing page', () => {
        const doc = document.implementation.createHTMLDocument('jasoseol-listing-modal');
        doc.body.innerHTML = `
      <main>
        <h1>찾아다니는 공고</h1>
        <div role="dialog" aria-modal="true">
          <header>
            <img alt="BGF로지스" src="/logos/bgf.png" />
            <strong>BGF로지스</strong>
            <h1>2026년 하계 채용연계형 인턴 채용</h1>
            <p>2026년 6월 2일 00:00 ~ 2026년 6월 15일 23:59 (7일 남음)</p>
          </header>
          <section>
            <table>
              <tbody>
                <tr>
                  <td>인턴</td>
                  <td>물류센터 직군 - 지역거점 물류센터(RDC)</td>
                  <td>47명 작성</td>
                  <td><button>자기소개서 쓰기</button></td>
                </tr>
                <tr>
                  <td>인턴</td>
                  <td>물류센터 직군 - 자동화 물류센터(CDC)</td>
                  <td>10명 작성</td>
                  <td><button>자기소개서 쓰기</button></td>
                </tr>
              </tbody>
            </table>
          </section>
        </div>
      </main>
    `;
        expect(extractJobPosting(doc, 'https://jasoseol.com/?campaignid=1')).toMatchObject({
            companyName: 'BGF로지스',
            positionTitle: '2026년 하계 채용연계형 인턴 채용',
            sourceUrl: 'https://jasoseol.com/?campaignid=1',
            deadlineLabel: '2026년 6월 15일 23:59',
            roleOptions: [
                '물류센터 직군 - 지역거점 물류센터(RDC)',
                '물류센터 직군 - 자동화 물류센터(CDC)'
            ]
        });
    });
    it('EXT-004: extracts only the deadline date from a visible start-to-end range', () => {
        const doc = document.implementation.createHTMLDocument('deadline-range');
        doc.body.innerHTML = `
      <main>
        <h1>2026 Summer Internship</h1>
        <a href="/company/bgf">BGF로지스</a>
        <p>2026년 6월 2일 00:00 ~ 2026년 6월 15일 23:59 (7일 남음)</p>
      </main>
    `;

        expect(extractJobPosting(doc, 'https://jasoseol.com/?campaignid=1')).toMatchObject({
            deadlineLabel: '2026년 6월 15일 23:59'
        });
    });
    it('EXT-004: normalizes explicit deadline ranges before preview/save', () => {
        const doc = document.implementation.createHTMLDocument('explicit-deadline-range');
        doc.body.innerHTML = `
      <main>
        <h1>Backend Developer</h1>
        <a href="/company/naver">Naver</a>
        <span data-ezone-deadline>2026-06-02 00:00 ~ 2026-06-15 23:59</span>
      </main>
    `;

        expect(extractJobPosting(doc, 'https://www.jasoseol.com/recruit/1')).toMatchObject({
            deadlineLabel: '2026-06-15 23:59'
        });
    });
    it('uses the visible floating modal instead of background listing content when no dialog attributes exist', () => {
        const doc = document.implementation.createHTMLDocument('jasoseol-visible-modal');
        doc.body.innerHTML = `
      <main>
        <h1>찾아다니는 공고</h1>
        <article>
          <h2>한국미쓰이물산</h2>
          <p>2026년 채용연계형 인턴</p>
          <span>~6월 10일 23:59</span>
        </article>
        <article>
          <h2>한화금융</h2>
          <p>2026 신입사원 채용</p>
          <span>~6월 20일 23:59</span>
        </article>
        <div class="floating-layer" style="position: fixed; z-index: 1000;">
          <div class="white-panel">
            <header>
              <img alt="BGF로지스" src="/logos/bgf.png" />
              <strong>BGF로지스</strong>
              <h1>2026년 하계 채용연계형 인턴 채용</h1>
              <p>2026년 6월 2일 00:00 ~ 2026년 6월 15일 23:59 (7일 남음)</p>
            </header>
            <table>
              <tbody>
                <tr>
                  <td>인턴</td>
                  <td>재무지원팀 - 회계</td>
                  <td>68명 작성</td>
                  <td>자기소개서 쓰기</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </main>
    `;

        expect(extractJobPosting(doc, 'https://jasoseol.com/?campaignid=15830248521')).toMatchObject({
            companyName: 'BGF로지스',
            positionTitle: '2026년 하계 채용연계형 인턴 채용',
            sourceUrl: 'https://jasoseol.com/?campaignid=15830248521',
            roleOptions: ['재무지원팀 - 회계']
        });
    });
    it('extracts only the selected Jasoseol recruit detail from a noisy recruit listing page', () => {
        const doc = document.implementation.createHTMLDocument('jasoseol-recruit-selected');
        doc.body.innerHTML = `
      <main>
        <h1>채용공고</h1>
        <aside>
          <button>채용 사이트</button>
          <button>채용 공고 공유</button>
        </aside>
        <section>
          <article>
            <strong>LG CNS</strong>
            <h2>2026년 상반기 신입사원 수시채용</h2>
            <p>2026년 6월 6일 00:00 ~ 2026년 6월 16일 18:00</p>
          </article>
          <article>
            <strong>국립보안기술연구소</strong>
            <h2>2026년도 1차 정규직 채용</h2>
            <p>2026년 6월 2일 14:00 ~ 2026년 6월 17일 16:00</p>
          </article>
          <article>
            <strong>한국국제협력단(KOICA)</strong>
            <h2>2026년 일반직 및 공무직 채용</h2>
            <p>2026년 6월 8일 15:00 ~ 2026년 6월 23일 11:00</p>
            <button>제출 서류 받기</button>
            <section aria-label="모집 직무">
              <table>
                <tbody>
                  <tr>
                    <td>신입</td>
                    <td>일반직 - 개발협력일반 (일반)</td>
                    <td>43명 작성</td>
                    <td><button>자기소개서 쓰기</button></td>
                  </tr>
                  <tr>
                    <td>신입</td>
                    <td>일반직 - 개발협력일반 (비수도권 지역인재)</td>
                    <td>15명 작성</td>
                    <td><button>자기소개서 쓰기</button></td>
                  </tr>
                  <tr>
                    <td>경력</td>
                    <td>공무직 - 기술지원(전산)</td>
                    <td>2명 작성</td>
                    <td><button>자기소개서 쓰기</button></td>
                  </tr>
                </tbody>
              </table>
            </section>
          </article>
          <article>
            <strong>롯데그룹</strong>
            <h2>예측가능한 채용</h2>
            <p>2026년 6월 2일 10:00 ~ 2026년 6월 23일 23:00</p>
          </article>
        </section>
        <section>
          <h2>채팅방</h2>
          <p>자소설닷컴 추천공고 한국미쓰이물산 SK하이닉스 LG CNS</p>
        </section>
      </main>
    `;
        expect(extractJobPosting(doc, 'https://jasoseol.com/recruit?ec=104470')).toMatchObject({
            companyName: '한국국제협력단(KOICA)',
            positionTitle: '2026년 일반직 및 공무직 채용',
            deadlineLabel: '2026년 6월 23일 11:00',
            roleOptions: [
                '일반직 - 개발협력일반 (일반)',
                '일반직 - 개발협력일반 (비수도권 지역인재)',
                '공무직 - 기술지원(전산)'
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
