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
            deadlineLabel: '2022.01.31',
            roleOptions: ['iOS 개발자', '웹 프론트엔드']
        });
    });
    it('EXT-016: keeps Jasoseol employment type visible in role options from page data', () => {
        const doc = document.implementation.createHTMLDocument('jasoseol-employment-types');
        doc.body.innerHTML = `
      <main>
        <h1>직무별 채용</h1>
        <script id="__NEXT_DATA__" type="application/json">
          {
            "props": {
              "pageProps": {
                "initialEmploymentCompany": {
                  "name": "샘플기업",
                  "end_time": "2026-06-30T23:59:00.000+09:00",
                  "employments": [
                    { "field": "전략기획", "careerType": "신입" },
                    { "field": "전략기획", "careerType": "경력" },
                    { "field": "브랜드마케팅", "employmentType": "신입/경력" }
                  ]
                }
              }
            }
          }
        </script>
      </main>
    `;

        expect(extractJobPosting(doc, 'https://jasoseol.com/recruit?ec=employment')).toMatchObject({
            roleOptions: ['신입 · 전략기획', '경력 · 전략기획', '신입/경력 · 브랜드마케팅']
        });
    });
    it('EXT-016: keeps employment type visible in role options from Jasoseol role rows', async () => {
        const doc = document.implementation.createHTMLDocument('jasoseol-employment-role-row');
        doc.body.innerHTML = `
      <main>
        <h1>삼정KPMG 채용</h1>
        <a href="/company/kpmg">삼정KPMG</a>
        <time datetime="2026-06-30">2026년 6월 30일 23:59</time>
        <section aria-label="모집 직무">
          <table>
            <tbody>
              <tr>
                <td>신입</td>
                <td>SG - Strategy ONE</td>
                <td>12명 작성</td>
                <td><button id="new-essay">나중에 쓸 자기소개서로 추가</button></td>
              </tr>
              <tr>
                <td>경력</td>
                <td>SG - Strategy ONE</td>
                <td>7명 작성</td>
                <td><button id="career-essay">나중에 쓸 자기소개서로 추가</button></td>
              </tr>
            </tbody>
          </table>
        </section>
      </main>
    `;
        doc.getElementById('new-essay').addEventListener('mouseover', () => {
            const layer = doc.createElement('div');
            layer.setAttribute('role', 'dialog');
            layer.textContent = 'SG - Strategy ONE· 1. 신입 지원 동기를 작성해 주십시오.(700자)';
            doc.body.append(layer);
        }, { once: true });

        await expect(extractJobPostingWithInteractions(doc, 'https://jasoseol.com/recruit?ec=kpmg', {
            hoverDelayMs: 0,
            targetRoles: ['신입 · SG - Strategy ONE']
        })).resolves.toMatchObject({
            roleOptions: ['신입 · SG - Strategy ONE', '경력 · SG - Strategy ONE'],
            essayQuestions: [
                { prompt: '신입 지원 동기를 작성해 주십시오.', maxLength: 700 }
            ],
            roleEssayQuestions: {
                '신입 · SG - Strategy ONE': [
                    { prompt: '신입 지원 동기를 작성해 주십시오.', maxLength: 700 }
                ]
            }
        });
    });
    it('EXT-005: reads selected Jasoseol essay questions from an unmarked portal layer', async () => {
        const doc = document.implementation.createHTMLDocument('jasoseol-plain-portal-essay-layer');
        doc.body.innerHTML = `
      <main>
        <h1>삼정KPMG 채용</h1>
        <a href="/company/kpmg">삼정KPMG</a>
        <time datetime="2026-06-30">2026년 6월 30일 23:59</time>
        <section aria-label="모집 직무">
          <table>
            <tbody>
              <tr>
                <td>신입</td>
                <td>SG - Strategy ONE</td>
                <td>12명 작성</td>
                <td><button id="essay">나중에 쓸 자기소개서로 추가</button></td>
              </tr>
            </tbody>
          </table>
        </section>
      </main>
    `;
        doc.getElementById('essay').addEventListener('mouseover', () => {
            const layer = doc.createElement('div');
            layer.textContent = 'SG - Strategy ONE· 1. 본인의 강점 3가지를 해시태그(#)를 사용하여 키워드로 표현해 주십시오.(700자)· 2. 지원 동기를 구체적으로 작성해 주십시오.(700자)';
            doc.body.append(layer);
        }, { once: true });

        await expect(extractJobPostingWithInteractions(doc, 'https://jasoseol.com/recruit?ec=104999', {
            hoverDelayMs: 0,
            targetRoles: ['신입 · SG - Strategy ONE']
        })).resolves.toMatchObject({
            roleOptions: ['신입 · SG - Strategy ONE'],
            essayQuestions: [
                {
                    prompt: '본인의 강점 3가지를 해시태그(#)를 사용하여 키워드로 표현해 주십시오.',
                    maxLength: 700
                },
                {
                    prompt: '지원 동기를 구체적으로 작성해 주십시오.',
                    maxLength: 700
                }
            ],
            roleEssayQuestions: {
                '신입 · SG - Strategy ONE': [
                    {
                        prompt: '본인의 강점 3가지를 해시태그(#)를 사용하여 키워드로 표현해 주십시오.',
                        maxLength: 700
                    },
                    {
                        prompt: '지원 동기를 구체적으로 작성해 주십시오.',
                        maxLength: 700
                    }
                ]
            },
            essayQuestionAvailability: {
                '신입 · SG - Strategy ONE': 'found'
            }
        });
    });
    it('EXT-005: extracts byte-based essay question limits without keeping the limit text in prompts', () => {
        const doc = document.implementation.createHTMLDocument('jasoseol-byte-essay-limits');
        doc.body.innerHTML = `
      <main>
        <h1>삼정KPMG 채용</h1>
        <a href="/company/kpmg">삼정KPMG</a>
        <time datetime="2026-06-30">2026년 6월 30일 23:59</time>
        <section aria-label="자소서 문항">
          <p>문항 1 100자 본인의 강점 3가지를 해시태그(#)를 사용하여 키워드로 표현해 주십시오. (예시: #열정 #존중 #협업) (100byte)</p>
          <p>문항 2 400자 모집분야 중 본인이 가장 해보고 싶은 업무는 무엇인가요? (400byte)</p>
          <p>문항 3 2000자 지원동기 및 입사 후 목표, 경력사항 등의 내용을 자유롭게 작성하여 주시기 바랍니다.(2000byte)</p>
          <p>문항 4 2000자 컨설팅에 필요한 자질은 무엇이라고 생각하며, 본인이 현재 가지고 있는 역량, 앞으로 개발해야 하는 역량은 무엇이라고 생각하나요? (자신의 역량이 잘 발휘된 경험을 포함하여 작성하여 주시기 바랍니다.) (2000byte)</p>
          <p>문항 5 2000자 삼정KPMG 5 values (Integrity, Excellence, Courage, Together, For Better) 중 본인을 가장 잘 표현하는 value 1개를 선택하고, 그 이유와 실천 사례를 함께 작성해 주시기 바랍니다.(2000byte)</p>
        </section>
      </main>
    `;

        expect(extractJobPosting(doc, 'https://jasoseol.com/recruit?ec=kpmg')).toMatchObject({
            essayQuestions: [
                {
                    prompt: '본인의 강점 3가지를 해시태그(#)를 사용하여 키워드로 표현해 주십시오. (예시: #열정 #존중 #협업)',
                    maxLength: 100,
                    maxLengthUnit: 'byte'
                },
                {
                    prompt: '모집분야 중 본인이 가장 해보고 싶은 업무는 무엇인가요?',
                    maxLength: 400,
                    maxLengthUnit: 'byte'
                },
                {
                    prompt: '지원동기 및 입사 후 목표, 경력사항 등의 내용을 자유롭게 작성하여 주시기 바랍니다.',
                    maxLength: 2000,
                    maxLengthUnit: 'byte'
                },
                {
                    prompt: '컨설팅에 필요한 자질은 무엇이라고 생각하며, 본인이 현재 가지고 있는 역량, 앞으로 개발해야 하는 역량은 무엇이라고 생각하나요? (자신의 역량이 잘 발휘된 경험을 포함하여 작성하여 주시기 바랍니다.)',
                    maxLength: 2000,
                    maxLengthUnit: 'byte'
                },
                {
                    prompt: '삼정KPMG 5 values (Integrity, Excellence, Courage, Together, For Better) 중 본인을 가장 잘 표현하는 value 1개를 선택하고, 그 이유와 실천 사례를 함께 작성해 주시기 바랍니다.',
                    maxLength: 2000,
                    maxLengthUnit: 'byte'
                }
            ]
        });
    });
    it('EXT-005: prefers parenthesized byte limits over leading character labels in structured question rows', () => {
        const doc = document.implementation.createHTMLDocument('jasoseol-structured-byte-essay-limits');
        doc.body.innerHTML = `
      <main>
        <h1>삼정KPMG 채용</h1>
        <a href="/company/kpmg">삼정KPMG</a>
        <time datetime="2026-06-30">2026년 6월 30일 23:59</time>
        <section aria-label="자소서 문항">
          <article>
            <h3>본인의 강점 3가지를 해시태그(#)를 사용하여 키워드로 표현해 주십시오. (예시: #열정 #존중 #협업)</h3>
            <small>문항 1</small>
            <span>100자</span>
            <span>(100byte)</span>
          </article>
        </section>
      </main>
    `;

        expect(extractJobPosting(doc, 'https://jasoseol.com/recruit?ec=kpmg')).toMatchObject({
            essayQuestions: [
                {
                    prompt: '본인의 강점 3가지를 해시태그(#)를 사용하여 키워드로 표현해 주십시오. (예시: #열정 #존중 #협업)',
                    maxLength: 100,
                    maxLengthUnit: 'byte'
                }
            ]
        });
    });
    it('EXT-005: parses comma-formatted essay limits without truncating the prompt', () => {
        const doc = document.implementation.createHTMLDocument('jasoseol-comma-essay-limits');
        doc.body.innerHTML = `
      <main>
        <h1>GC녹십자 채용</h1>
        <a href="/company/gc">GC녹십자</a>
        <time datetime="2026-06-30">2026년 6월 30일 23:59</time>
        <section aria-label="자소서 문항">
          <p>문항 1 회사를 선택하는 본인만의 기준 및 GC녹십자에 지원하는 이유에 대해 기재하여 주시기 바랍니다. (1,000자)</p>
          <p>문항 2 자기주도적으로 가장 치열하게 임했던 경험은 무엇이었으며, 본인에게 어떤 의미가 있었는지 설명해 주시기 바랍니다. (1,000자)</p>
          <p>문항 3 지원하신 직무에 필요한 역량을 향상시키기 위해 지원자님 께서 노력 및 경험한 바를 작성해 주시기 바랍니다. (2개 항목 이상) ① 경험: (1,000자)</p>
        </section>
      </main>
    `;

        expect(extractJobPosting(doc, 'https://jasoseol.com/recruit?ec=gc')).toMatchObject({
            essayQuestions: [
                {
                    prompt: '회사를 선택하는 본인만의 기준 및 GC녹십자에 지원하는 이유에 대해 기재하여 주시기 바랍니다.',
                    maxLength: 1000,
                    maxLengthUnit: 'char'
                },
                {
                    prompt: '자기주도적으로 가장 치열하게 임했던 경험은 무엇이었으며, 본인에게 어떤 의미가 있었는지 설명해 주시기 바랍니다.',
                    maxLength: 1000,
                    maxLengthUnit: 'char'
                },
                {
                    prompt: '지원하신 직무에 필요한 역량을 향상시키기 위해 지원자님 께서 노력 및 경험한 바를 작성해 주시기 바랍니다. (2개 항목 이상) ① 경험:',
                    maxLength: 1000,
                    maxLengthUnit: 'char'
                }
            ]
        });
    });
    it('EXT-005: reveals Jasoseol essay questions when only the role row hover opens the layer', async () => {
        const doc = document.implementation.createHTMLDocument('jasoseol-row-hover-only-essay-layer');
        doc.body.innerHTML = `
      <main>
        <h1>신입/경력 수시채용</h1>
        <a href="/company/celltrion">셀트리온제약</a>
        <time datetime="2026-06-22T14:00:00.000+09:00">2026년 6월 22일 14:00</time>
        <section aria-label="모집 직무">
          <table>
            <tbody>
              <tr id="role-row">
                <td>신입</td>
                <td>IT 매매체결시스템</td>
                <td>30명 작성</td>
                <td><button id="essay">자기소개서 쓰기</button></td>
              </tr>
            </tbody>
          </table>
        </section>
      </main>
    `;
        doc.getElementById('role-row').addEventListener('mouseenter', () => {
            const layer = doc.createElement('div');
            layer.textContent = 'IT 매매체결시스템· 1. Why Celltrionpharm?(1000자)· 2. 가장 관심있게 들었던 전공 과목과 해당 과목에서의 본인 장점(1000자)· 3. 희망 직무를 수행하기 위해 준비한 것과 직무와 관련된 본인 역량(1000자)· 4. 기타 자유 기술(1000자)';
            doc.body.append(layer);
        }, { once: true });

        await expect(extractJobPostingWithInteractions(doc, 'https://jasoseol.com/recruit?ec=104573', {
            hoverDelayMs: 0,
            targetRoles: ['신입 · IT 매매체결시스템']
        })).resolves.toMatchObject({
            companyName: '셀트리온제약',
            roleOptions: ['신입 · IT 매매체결시스템'],
            essayQuestions: [
                { prompt: 'Why Celltrionpharm?', maxLength: 1000 },
                { prompt: '가장 관심있게 들었던 전공 과목과 해당 과목에서의 본인 장점', maxLength: 1000 },
                { prompt: '희망 직무를 수행하기 위해 준비한 것과 직무와 관련된 본인 역량', maxLength: 1000 },
                { prompt: '기타 자유 기술', maxLength: 1000 }
            ],
            roleEssayQuestions: {
                '신입 · IT 매매체결시스템': [
                    { prompt: 'Why Celltrionpharm?', maxLength: 1000 },
                    { prompt: '가장 관심있게 들었던 전공 과목과 해당 과목에서의 본인 장점', maxLength: 1000 },
                    { prompt: '희망 직무를 수행하기 위해 준비한 것과 직무와 관련된 본인 역량', maxLength: 1000 },
                    { prompt: '기타 자유 기술', maxLength: 1000 }
                ]
            },
            essayQuestionAvailability: {
                '신입 · IT 매매체결시스템': 'found'
            }
        });
    });
    it('EXT-005: reads Jasoseol essay questions from the nested absolute z-above row layer', async () => {
        const doc = document.implementation.createHTMLDocument('jasoseol-nested-row-essay-layer');
        doc.body.innerHTML = `
      <main>
        <h1>신입/경력 수시채용</h1>
        <a href="/company/celltrion">셀트리온제약</a>
        <time datetime="2026-06-22T14:00:00.000+09:00">2026년 6월 22일 14:00</time>
        <section aria-label="모집 직무">
          <ul>
            <li id="server-row" class="relative flex justify-center false">
              <div>
                <span>경력</span>
                <div>서버/Cloud 엔지니어</div>
                <span>1명 작성</span>
              </div>
              <div><button type="button">자기소개서 쓰기</button></div>
            </li>
          </ul>
        </section>
      </main>
    `;
        doc.getElementById('server-row').addEventListener('mouseenter', (event) => {
            const layer = doc.createElement('div');
            layer.className = 'absolute right-[124px] top-[8px] w-[460px] border border-solid border-gray-200 rounded-b-[16px] rounded-tl-[16px] p-[16px] pb-[5px] bg-white shadow2 z-above';
            layer.innerHTML = `
              <div class="relative">
                <div class="font-normal mb-[8px]">
                  <div class="text-[14px] leading-[21px] text-gray-700 mb-[4px] whitespace-pre-line">· 1. Why Celltrionpharm?</div>
                  <div class="text-[10px] leading-[15px] text-orange-600">(1000자)</div>
                </div>
                <div class="font-normal mb-[8px]">
                  <div class="text-[14px] leading-[21px] text-gray-700 mb-[4px] whitespace-pre-line">· 2. 가장 관심있게 들었던 전공 과목과 해당 과목에서의 본인 장점</div>
                  <div class="text-[10px] leading-[15px] text-orange-600">(1000자)</div>
                </div>
                <div class="font-normal mb-[8px]">
                  <div class="text-[14px] leading-[21px] text-gray-700 mb-[4px] whitespace-pre-line">· 3. 희망 직무를 수행하기 위해 준비한 것과 직무와 관련된 본인 역량</div>
                  <div class="text-[10px] leading-[15px] text-orange-600">(1000자)</div>
                </div>
                <div class="font-normal mb-[8px]">
                  <div class="text-[14px] leading-[21px] text-gray-700 mb-[4px] whitespace-pre-line">· 4. 기타 자유 기술</div>
                  <div class="text-[10px] leading-[15px] text-orange-600">(1000자)</div>
                </div>
                <div>나중에 쓸 자기소개서로 추가</div>
              </div>
            `;
            event.currentTarget.append(layer);
        }, { once: true });

        await expect(extractJobPostingWithInteractions(doc, 'https://jasoseol.com/recruit?ec=104573', {
            hoverDelayMs: 0,
            targetRoles: ['경력 · 서버/Cloud 엔지니어']
        })).resolves.toMatchObject({
            roleOptions: ['경력 · 서버/Cloud 엔지니어'],
            essayQuestions: [
                { prompt: 'Why Celltrionpharm?', maxLength: 1000 },
                { prompt: '가장 관심있게 들었던 전공 과목과 해당 과목에서의 본인 장점', maxLength: 1000 },
                { prompt: '희망 직무를 수행하기 위해 준비한 것과 직무와 관련된 본인 역량', maxLength: 1000 },
                { prompt: '기타 자유 기술', maxLength: 1000 }
            ],
            roleEssayQuestions: {
                '경력 · 서버/Cloud 엔지니어': [
                    { prompt: 'Why Celltrionpharm?', maxLength: 1000 },
                    { prompt: '가장 관심있게 들었던 전공 과목과 해당 과목에서의 본인 장점', maxLength: 1000 },
                    { prompt: '희망 직무를 수행하기 위해 준비한 것과 직무와 관련된 본인 역량', maxLength: 1000 },
                    { prompt: '기타 자유 기술', maxLength: 1000 }
                ]
            },
            essayQuestionAvailability: {
                '경력 · 서버/Cloud 엔지니어': 'found'
            }
        });
    });
    it('EXT-005: keeps Korean middle dots inside an essay prompt instead of splitting them as new questions', async () => {
        const doc = document.implementation.createHTMLDocument('jasoseol-kotra-middle-dot-prompt');
        doc.body.innerHTML = `
      <main>
        <h1>KOTRA 체험형 청년인턴 채용</h1>
        <a href="/company/kotra">KOTRA</a>
        <time datetime="2026-06-30">2026년 6월 30일 23:59</time>
        <section aria-label="모집 직무">
          <ul>
            <li>
              <span>청년인턴</span>
              <span>3명 작성</span>
              <button id="essay">자소서 문항 보기</button>
            </li>
          </ul>
        </section>
      </main>
    `;
        doc.getElementById('essay').addEventListener('mouseover', () => {
            const layer = doc.createElement('div');
            layer.setAttribute('role', 'dialog');
            layer.textContent = '청년인턴· 1. KOTRA 지원 동기에 대해 상세히 기술해주시기 바랍니다.(700자)· 2. 직무와 유관한 본인의 역량을 한 가지 제시하고, 이를 개발하기 위해 노력한 경험ㆍ활동을 기재해 주시기 바랍니다.· 3. 입사 후 포부와 기여 방안을 작성해 주시기 바랍니다.(700자)';
            doc.body.append(layer);
        }, { once: true });

        await expect(extractJobPostingWithInteractions(doc, 'https://jasoseol.com/recruit?ec=kotra', {
            hoverDelayMs: 0,
            targetRoles: ['청년인턴']
        })).resolves.toMatchObject({
            essayQuestions: [
                {
                    prompt: 'KOTRA 지원 동기에 대해 상세히 기술해주시기 바랍니다.',
                    maxLength: 700
                },
                {
                    prompt: '직무와 유관한 본인의 역량을 한 가지 제시하고, 이를 개발하기 위해 노력한 경험ㆍ활동을 기재해 주시기 바랍니다.',
                    maxLength: null
                },
                {
                    prompt: '입사 후 포부와 기여 방안을 작성해 주시기 바랍니다.',
                    maxLength: 700
                }
            ],
            roleEssayQuestions: {
                '청년인턴': [
                    {
                        prompt: 'KOTRA 지원 동기에 대해 상세히 기술해주시기 바랍니다.',
                        maxLength: 700
                    },
                    {
                        prompt: '직무와 유관한 본인의 역량을 한 가지 제시하고, 이를 개발하기 위해 노력한 경험ㆍ활동을 기재해 주시기 바랍니다.',
                        maxLength: null
                    },
                    {
                        prompt: '입사 후 포부와 기여 방안을 작성해 주시기 바랍니다.',
                        maxLength: 700
                    }
                ]
            }
        });
    });
    it('EXT-016: separates compact contract employment type from a glued Jasoseol role label', () => {
        const doc = document.implementation.createHTMLDocument('jasoseol-contract-role-row');
        doc.body.innerHTML = `
      <main>
        <h1>비씨월드제약 채용</h1>
        <a href="/company/bcworld">비씨월드제약</a>
        <section aria-label="모집 직무">
          <ul>
            <li>계약직사업개발본부 - 개발팀12명 작성나중에 쓸 자기소개서로 추가</li>
          </ul>
        </section>
      </main>
    `;

        expect(extractJobPosting(doc, 'https://jasoseol.com/recruit?ec=bcworld')).toMatchObject({
            roleOptions: ['계약직 · 사업개발본부 - 개발팀']
        });
    });
    it('EXT-016: stores only the Jasoseol deadline date from ISO end_time', () => {
        const doc = document.implementation.createHTMLDocument('jasoseol-deadline-date');
        doc.body.innerHTML = `
      <main>
        <h1>2026 상반기 신입/경력 채용</h1>
        <time datetime="2026-06-29T04:00:00.000Z">2026년 6월 29일 04:00</time>
        <script id="__NEXT_DATA__" type="application/json">
          {
            "props": {
              "pageProps": {
                "initialEmploymentCompany": {
                  "name": "인바디",
                  "end_time": "2026-06-29T13:00:00.000+09:00",
                  "employments": [
                    { "field": "GBD" }
                  ]
                }
              }
            }
          }
        </script>
      </main>
    `;

        expect(extractJobPosting(doc, 'https://jasoseol.com/recruit/104574')).toMatchObject({
            deadlineLabel: '2026.06.29'
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
    it('EXT-005: limits essay hover attempts so preview does not stay loading too long', async () => {
        const doc = document.implementation.createHTMLDocument('many-essay-triggers');
        const rows = Array.from({ length: 20 }, (_, index) => `
              <tr>
                <td>신입</td>
                <td>Role ${index + 1}</td>
                <td>${index + 1}명 작성</td>
                <td><button id="essay-${index + 1}">자기소개서 작성</button></td>
              </tr>
        `).join('');
        doc.body.innerHTML = `
      <main>
        <h1>Backend Developer</h1>
        <a href="/company/naver">Naver</a>
        <time datetime="2026-06-30">D-26</time>
        <section aria-label="모집 직무">
          <table><tbody>${rows}</tbody></table>
        </section>
      </main>
    `;
        let hoverCount = 0;
        Array.from(doc.querySelectorAll('button')).forEach((button) => {
            button.addEventListener('mouseover', () => {
                hoverCount += 1;
            });
        });

        await extractJobPostingWithInteractions(doc, 'https://www.jasoseol.com/recruit/1', {
            hoverDelayMs: 0,
            maxEssayTriggers: 3
        });

        expect(hoverCount).toBe(3);
    });
    it('EXT-005: only checks essay questions for the selected role when requested', async () => {
        const doc = document.implementation.createHTMLDocument('selected-role-essay');
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
                <td>1명 작성</td>
                <td><button id="backend-essay">자기소개서 작성</button></td>
              </tr>
              <tr>
                <td>신입</td>
                <td>Platform</td>
                <td>1명 작성</td>
                <td><button id="platform-essay">자기소개서 작성</button></td>
              </tr>
            </tbody>
          </table>
        </section>
      </main>
    `;
        let backendHoverCount = 0;
        let platformHoverCount = 0;
        doc.getElementById('backend-essay').addEventListener('mouseover', () => {
            backendHoverCount += 1;
        });
        doc.getElementById('platform-essay').addEventListener('mouseover', () => {
            platformHoverCount += 1;
        });

        await extractJobPostingWithInteractions(doc, 'https://www.jasoseol.com/recruit/1', {
            hoverDelayMs: 0,
            targetRoles: ['Platform']
        });

        expect(backendHoverCount).toBe(0);
        expect(platformHoverCount).toBe(1);
    });
    it('EXT-005: reveals Jasoseol 자소서 문항 보기 content for the selected 지원부문 row', async () => {
        const doc = document.implementation.createHTMLDocument('jasoseol-short-essay-label');
        doc.body.innerHTML = `
      <main>
        <h1>직원 채용 공고</h1>
        <a href="/company/linde">린데코리아</a>
        <time datetime="2026-04-07">2026년 4월 7일 14:59</time>
        <section aria-label="모집 직무">
          <ul>
            <li id="role-row">
              <span>신입/경력</span>
              <strong>재경기획부문 경영기획부 FP＆A specialist</strong>
              <span>97명 작성</span>
              <button id="essay-trigger">자소서 문항 보기</button>
            </li>
          </ul>
        </section>
      </main>
    `;
        doc.getElementById('essay-trigger').addEventListener('mouseover', () => {
            const layer = doc.createElement('div');
            layer.setAttribute('role', 'dialog');
            layer.setAttribute('aria-label', '자소서 문항');
            layer.innerHTML = `
          <h3>자소서 문항</h3>
          <ul>
            <li><p>지원 동기를 작성해 주세요.</p><span>700자</span></li>
            <li><p>직무 관련 경험을 작성해 주세요.</p><span>1000자</span></li>
          </ul>
        `;
            doc.body.append(layer);
        }, { once: true });

        await expect(extractJobPostingWithInteractions(doc, 'https://jasoseol.com/recruit/103281', {
            hoverDelayMs: 0,
            targetRoles: ['재경기획부문 경영기획부 FP＆A specialist']
        })).resolves.toMatchObject({
            roleOptions: ['신입/경력 · 재경기획부문 경영기획부 FP＆A specialist'],
            essayQuestions: [
                { prompt: '지원 동기를 작성해 주세요.', maxLength: 700 },
                { prompt: '직무 관련 경험을 작성해 주세요.', maxLength: 1000 }
            ],
            roleEssayQuestions: {
                '재경기획부문 경영기획부 FP＆A specialist': [
                    { prompt: '지원 동기를 작성해 주세요.', maxLength: 700 },
                    { prompt: '직무 관련 경험을 작성해 주세요.', maxLength: 1000 }
                ]
            }
        });
    });
    it('EXT-005: splits compact Jasoseol essay tooltip text into clean questions', async () => {
        const doc = document.implementation.createHTMLDocument('jasoseol-compact-essay-tooltip');
        doc.body.innerHTML = `
      <main>
        <h1>2026년 신입 채용</h1>
        <a href="/company/hanwha">한화금융</a>
        <time datetime="2026-06-12">2026년 6월 12일 15:00</time>
        <section aria-label="모집 직무">
          <ul>
            <li id="role-row">
              <span>신입</span>
              <strong>경영기획/지원</strong>
              <span>12명 작성</span>
              <button id="essay-trigger">자소서 문항 보기</button>
            </li>
          </ul>
        </section>
      </main>
    `;
        doc.getElementById('essay-trigger').addEventListener('mouseover', () => {
            const layer = doc.createElement('div');
            layer.setAttribute('role', 'dialog');
            layer.setAttribute('aria-label', '자소서 문항');
            layer.textContent = `자소서 문항
경영기획/지원· 1. 본인이 수행했던 학업, 인턴, 프로젝트 중 목표가 명확하지 않았거나, 성과 기준이 모호했던 과제를 선택해 스스로 목표를 어떻게 정의하고 측정했는지 설명해주세요. 그 과정에서 본인이 결과에 기여한 부분을 구체적으로 기술해주세요.(700자)· 2. 빠르게 변화하는 금융 환경 속에서 새로운 기회를 포착하고 성장하는 것이 중요합니다. 이와 관련하여 대학생활 동안 본인이 가장 집중적으로 발전시켜온 역량은 무엇인가요? 해당 역량을 선택한 이유와, 당사 업무에서 이를 어떻게 발휘할 수 있을 지 작성해주세요.(700자)· 3. 본인이 의도한 방향이나 의견과는 다른 방향으로 일이 진행되었던 경험에 대해 말씀해주세요. 당시 설득, 조율, 수용 중 어떤 방식으로 대응하였고, 그 결과는 어떠하였는지 함께 설명해주세요.(700자)· 4. 지원자님이 가진 강점/기술 중 1) AI가 대체할 수 없는 영역과 2) AI를 활용하여 시너지를 발휘할 수 있는 영역을 구분하여 소개해주세요.(700자)나중에 쓸 자기소개서로 추가`;
            doc.body.append(layer);
        }, { once: true });

        await expect(extractJobPostingWithInteractions(doc, 'https://jasoseol.com/recruit/hanwha', {
            hoverDelayMs: 0,
            targetRoles: ['경영기획/지원']
        })).resolves.toMatchObject({
            roleOptions: ['신입 · 경영기획/지원'],
            essayQuestions: [
                {
                    prompt: '본인이 수행했던 학업, 인턴, 프로젝트 중 목표가 명확하지 않았거나, 성과 기준이 모호했던 과제를 선택해 스스로 목표를 어떻게 정의하고 측정했는지 설명해주세요. 그 과정에서 본인이 결과에 기여한 부분을 구체적으로 기술해주세요.',
                    maxLength: 700
                },
                {
                    prompt: '빠르게 변화하는 금융 환경 속에서 새로운 기회를 포착하고 성장하는 것이 중요합니다. 이와 관련하여 대학생활 동안 본인이 가장 집중적으로 발전시켜온 역량은 무엇인가요? 해당 역량을 선택한 이유와, 당사 업무에서 이를 어떻게 발휘할 수 있을 지 작성해주세요.',
                    maxLength: 700
                },
                {
                    prompt: '본인이 의도한 방향이나 의견과는 다른 방향으로 일이 진행되었던 경험에 대해 말씀해주세요. 당시 설득, 조율, 수용 중 어떤 방식으로 대응하였고, 그 결과는 어떠하였는지 함께 설명해주세요.',
                    maxLength: 700
                },
                {
                    prompt: '지원자님이 가진 강점/기술 중 1) AI가 대체할 수 없는 영역과 2) AI를 활용하여 시너지를 발휘할 수 있는 영역을 구분하여 소개해주세요.',
                    maxLength: 700
                }
            ],
            roleEssayQuestions: {
                '경영기획/지원': [
                    {
                        prompt: '본인이 수행했던 학업, 인턴, 프로젝트 중 목표가 명확하지 않았거나, 성과 기준이 모호했던 과제를 선택해 스스로 목표를 어떻게 정의하고 측정했는지 설명해주세요. 그 과정에서 본인이 결과에 기여한 부분을 구체적으로 기술해주세요.',
                        maxLength: 700
                    },
                    {
                        prompt: '빠르게 변화하는 금융 환경 속에서 새로운 기회를 포착하고 성장하는 것이 중요합니다. 이와 관련하여 대학생활 동안 본인이 가장 집중적으로 발전시켜온 역량은 무엇인가요? 해당 역량을 선택한 이유와, 당사 업무에서 이를 어떻게 발휘할 수 있을 지 작성해주세요.',
                        maxLength: 700
                    },
                    {
                        prompt: '본인이 의도한 방향이나 의견과는 다른 방향으로 일이 진행되었던 경험에 대해 말씀해주세요. 당시 설득, 조율, 수용 중 어떤 방식으로 대응하였고, 그 결과는 어떠하였는지 함께 설명해주세요.',
                        maxLength: 700
                    },
                    {
                        prompt: '지원자님이 가진 강점/기술 중 1) AI가 대체할 수 없는 영역과 2) AI를 활용하여 시너지를 발휘할 수 있는 영역을 구분하여 소개해주세요.',
                        maxLength: 700
                    }
                ]
            }
        });
    });
    it('EXT-005: splits compact essay text even when Jasoseol wraps it in a list item with the role name', async () => {
        const doc = document.implementation.createHTMLDocument('jasoseol-compact-essay-list-item');
        doc.body.innerHTML = `
      <main>
        <h1>공정기술 채용</h1>
        <a href="/company/sample">샘플반도체</a>
        <time datetime="2026-06-30">2026년 6월 30일 23:59</time>
        <section aria-label="모집 직무">
          <ul>
            <li id="role-row">
              <span>신입</span>
              <strong>공정기술 엔지니어</strong>
              <span>36명 작성</span>
              <button id="essay-trigger">자소서 문항 보기</button>
            </li>
          </ul>
        </section>
      </main>
    `;
        doc.getElementById('essay-trigger').addEventListener('mouseover', () => {
            const layer = doc.createElement('div');
            layer.setAttribute('role', 'dialog');
            layer.setAttribute('aria-label', '자소서 문항');
            layer.innerHTML = `
          <h3>자소서 문항</h3>
          <ul>
            <li><strong>공정기술 엔지니어</strong>· 1. 본인이 우리 회사와 희망 직무에 지원한 동기를 구체적으로 작성해 주세요.(700자)</li>
            <li>· 2. 공정 개선 경험과 이를 통해 배운 점을 작성해 주세요.(700자)</li>
          </ul>
        `;
            doc.body.append(layer);
        }, { once: true });

        await expect(extractJobPostingWithInteractions(doc, 'https://jasoseol.com/recruit/process', {
            hoverDelayMs: 0,
            targetRoles: ['공정기술 엔지니어']
        })).resolves.toMatchObject({
            roleOptions: ['신입 · 공정기술 엔지니어'],
            essayQuestions: [
                {
                    prompt: '본인이 우리 회사와 희망 직무에 지원한 동기를 구체적으로 작성해 주세요.',
                    maxLength: 700
                },
                {
                    prompt: '공정 개선 경험과 이를 통해 배운 점을 작성해 주세요.',
                    maxLength: 700
                }
            ],
            roleEssayQuestions: {
                '공정기술 엔지니어': [
                    {
                        prompt: '본인이 우리 회사와 희망 직무에 지원한 동기를 구체적으로 작성해 주세요.',
                        maxLength: 700
                    },
                    {
                        prompt: '공정 개선 경험과 이를 통해 배운 점을 작성해 주세요.',
                        maxLength: 700
                    }
                ]
            }
        });
    });
    it('EXT-005: splits compact essay text even when character limits are not visible yet', async () => {
        const doc = document.implementation.createHTMLDocument('jasoseol-compact-essay-without-limit');
        doc.body.innerHTML = `
      <main>
        <h1>품질보증 채용</h1>
        <a href="/company/sample">샘플제약</a>
        <time datetime="2026-06-30">2026년 6월 30일 23:59</time>
        <section aria-label="모집 직무">
          <ul>
            <li id="role-row">
              <span>신입</span>
              <strong>품질보증 (신입)</strong>
              <span>12명 작성</span>
              <button id="essay-trigger">자소서 문항 보기</button>
            </li>
          </ul>
        </section>
      </main>
    `;
        doc.getElementById('essay-trigger').addEventListener('mouseover', () => {
            const layer = doc.createElement('div');
            layer.setAttribute('role', 'dialog');
            layer.setAttribute('aria-label', '자소서 문항');
            layer.textContent = '품질보증 (신입)· 1. 본인이 우리 회사와 희망 직무에 지원한 동기를 구체적으로 작성해 주세요· 2. 품질보증 업무에서 중요하다고 생각하는 기준을 작성해 주세요';
            doc.body.append(layer);
        }, { once: true });

        await expect(extractJobPostingWithInteractions(doc, 'https://jasoseol.com/recruit/qa', {
            hoverDelayMs: 0,
            targetRoles: ['품질보증 (신입)']
        })).resolves.toMatchObject({
            roleOptions: ['신입 · 품질보증 (신입)'],
            essayQuestions: [
                {
                    prompt: '본인이 우리 회사와 희망 직무에 지원한 동기를 구체적으로 작성해 주세요',
                    maxLength: null
                },
                {
                    prompt: '품질보증 업무에서 중요하다고 생각하는 기준을 작성해 주세요',
                    maxLength: null
                }
            ],
            roleEssayQuestions: {
                '품질보증 (신입)': [
                    {
                        prompt: '본인이 우리 회사와 희망 직무에 지원한 동기를 구체적으로 작성해 주세요',
                        maxLength: null
                    },
                    {
                        prompt: '품질보증 업무에서 중요하다고 생각하는 기준을 작성해 주세요',
                        maxLength: null
                    }
                ]
            }
        });
    });
    it('EXT-016: removes compact employment labels before Jasoseol role names', () => {
        const doc = document.implementation.createHTMLDocument('jasoseol-compact-employment-labels');
        doc.body.innerHTML = `
      <main>
        <h1>직원 채용 공고</h1>
        <a href="/company/sample">샘플기업</a>
        <section aria-label="모집 직무">
          <ul>
            <li>신입/경력기술직12명 작성자소서 문항 보기</li>
            <li>신입/경력행정직7명 작성자소서 문항 보기</li>
          </ul>
        </section>
      </main>
    `;

        expect(extractJobPosting(doc, 'https://jasoseol.com/recruit/compact')).toMatchObject({
            roleOptions: ['신입/경력 · 기술직', '신입/경력 · 행정직']
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
                '신입 · 자동화 기계-로봇 자동화 설계',
                '경력 · 자율주행로봇 알고리즘 개발'
            ],
            essayQuestions: [
                { prompt: '본인의 핵심 직무 능력을 요약하여 기술하세요', maxLength: 300 },
                { prompt: '태웅로직스에 지원한 구체적인 동기는 무엇이며 입사 후 목표에 대해 기술하시오', maxLength: 700 },
                { prompt: '본인이 지금까지 했던 일 중 가장 열정을 가지고 했던 일은 무엇이었는지 기술하시오', maxLength: 700 },
                { prompt: '본인이 지원한 직무를 어떻게 이해하고 있는지 구체적으로 기술하고, 해당직무에 본인이 적합하다고 판단 할 수 있는 근거를 사례 및 경험을 바탕으로 기술하시오', maxLength: 700 },
                { prompt: '최근 태웅로직스에서 발생한 이슈 한가지를 선정하여 해당 이슈에 대한 본인의 생각을 자유롭게 기술하시오', maxLength: 700 }
            ],
            roleEssayQuestions: {
                '신입 · 자동화 기계-로봇 자동화 설계': [
                    { prompt: '본인의 핵심 직무 능력을 요약하여 기술하세요', maxLength: 300 },
                    { prompt: '태웅로직스에 지원한 구체적인 동기는 무엇이며 입사 후 목표에 대해 기술하시오', maxLength: 700 },
                    { prompt: '본인이 지금까지 했던 일 중 가장 열정을 가지고 했던 일은 무엇이었는지 기술하시오', maxLength: 700 },
                    { prompt: '본인이 지원한 직무를 어떻게 이해하고 있는지 구체적으로 기술하고, 해당직무에 본인이 적합하다고 판단 할 수 있는 근거를 사례 및 경험을 바탕으로 기술하시오', maxLength: 700 },
                    { prompt: '최근 태웅로직스에서 발생한 이슈 한가지를 선정하여 해당 이슈에 대한 본인의 생각을 자유롭게 기술하시오', maxLength: 700 }
                ],
                '경력 · 자율주행로봇 알고리즘 개발': [
                    { prompt: '알고리즘 개발 경험을 구체적으로 기술하세요', maxLength: 500 }
                ]
            }
        });
    });
    it('EXT-005: keeps compact tooltip questions out of the Jasoseol role label', async () => {
        const doc = document.implementation.createHTMLDocument('jasoseol-compact-tooltip-real-korean');
        doc.body.innerHTML = `
      <main>
        <h1>2026년 신입 채용</h1>
        <a href="/company/toss">비바리퍼블리카</a>
        <time datetime="2026-06-30">2026년 6월 30일 23:59</time>
        <section aria-label="모집 직무">
          <ul>
            <li>
              <span>금융IT 개발자</span>
              <span>0명 작성</span>
              <button id="essay">자기소개서 작성</button>
            </li>
          </ul>
        </section>
      </main>
    `;
        doc.getElementById('essay').addEventListener('mouseover', () => {
            const layer = doc.createElement('div');
            layer.setAttribute('role', 'dialog');
            layer.textContent = '금융IT 개발자· 어려운 상황속에서도 책임감을 가지고 과업을 수행했던 경험에 대해 서술하십시오. (800자 이내) (어려움을 극복하기 위해 취했던 행동, 수행 결과물, 결과물 도출을 위해 수행했던 노력에 대해 구체적으로 기술)(800자)· 다양한 생각과 입장을 가진 사람들과 의견을 교류하며 합의를 이끌어낸 경험에 대해 서술하십시오. (800자 이내) (자신의 노력이 그룹에 미친 영향을 구체적으로 기술)(800자)· 지원한 직무 분야에 본인이 최적의 지원자라고 생각하는 이유를 서술하십시오. (800자 이내) (지원분야와 관련하여 본인이 갖추어 온 역량을 근거에 기반하여 구체적으로 기술)(800자)나중에 쓸 자기소개서로 추가';
            doc.body.append(layer);
        });

        await expect(extractJobPostingWithInteractions(doc, 'https://jasoseol.com/recruit/toss', {
            hoverDelayMs: 0,
            targetRoles: ['금융IT 개발자']
        })).resolves.toMatchObject({
            roleOptions: ['금융IT 개발자'],
            essayQuestions: [
                {
                    prompt: '어려운 상황속에서도 책임감을 가지고 과업을 수행했던 경험에 대해 서술하십시오. (어려움을 극복하기 위해 취했던 행동, 수행 결과물, 결과물 도출을 위해 수행했던 노력에 대해 구체적으로 기술)',
                    maxLength: 800
                },
                {
                    prompt: '다양한 생각과 입장을 가진 사람들과 의견을 교류하며 합의를 이끌어낸 경험에 대해 서술하십시오. (자신의 노력이 그룹에 미친 영향을 구체적으로 기술)',
                    maxLength: 800
                },
                {
                    prompt: '지원한 직무 분야에 본인이 최적의 지원자라고 생각하는 이유를 서술하십시오. (지원분야와 관련하여 본인이 갖추어 온 역량을 근거에 기반하여 구체적으로 기술)',
                    maxLength: 800
                }
            ],
            roleEssayQuestions: {
                '금융IT 개발자': [
                    {
                        prompt: '어려운 상황속에서도 책임감을 가지고 과업을 수행했던 경험에 대해 서술하십시오. (어려움을 극복하기 위해 취했던 행동, 수행 결과물, 결과물 도출을 위해 수행했던 노력에 대해 구체적으로 기술)',
                        maxLength: 800
                    },
                    {
                        prompt: '다양한 생각과 입장을 가진 사람들과 의견을 교류하며 합의를 이끌어낸 경험에 대해 서술하십시오. (자신의 노력이 그룹에 미친 영향을 구체적으로 기술)',
                        maxLength: 800
                    },
                    {
                        prompt: '지원한 직무 분야에 본인이 최적의 지원자라고 생각하는 이유를 서술하십시오. (지원분야와 관련하여 본인이 갖추어 온 역량을 근거에 기반하여 구체적으로 기술)',
                        maxLength: 800
                    }
                ]
            }
        });
    });
    it('EXT-005: waits for Jasoseol essay tooltip content before falling back to manual input', async () => {
        const doc = document.implementation.createHTMLDocument('jasoseol-delayed-essay-tooltip');
        doc.body.innerHTML = `
      <main>
        <h1>2026년 신입 채용</h1>
        <a href="/company/toss">비바리퍼블리카</a>
        <time datetime="2026-06-30">2026년 6월 30일 23:59</time>
        <section aria-label="모집 직무">
          <ul>
            <li>
              <span>금융IT 개발자</span>
              <span>0명 작성</span>
              <button id="essay">자기소개서 작성</button>
            </li>
          </ul>
        </section>
      </main>
    `;
        doc.getElementById('essay').addEventListener('mouseover', () => {
            setTimeout(() => {
                const layer = doc.createElement('div');
                layer.setAttribute('role', 'dialog');
                layer.textContent = '금융IT 개발자· 어려운 상황속에서도 책임감을 가지고 과업을 수행했던 경험에 대해 서술하십시오.(800자)· 지원한 직무 분야에 본인이 최적의 지원자라고 생각하는 이유를 서술하십시오.(800자)';
                doc.body.append(layer);
            }, 120);
        }, { once: true });

        await expect(extractJobPostingWithInteractions(doc, 'https://jasoseol.com/recruit/toss', {
            hoverDelayMs: 0,
            essayQuestionTimeoutMs: 500,
            targetRoles: ['금융IT 개발자']
        })).resolves.toMatchObject({
            roleOptions: ['금융IT 개발자'],
            essayQuestions: [
                {
                    prompt: '어려운 상황속에서도 책임감을 가지고 과업을 수행했던 경험에 대해 서술하십시오.',
                    maxLength: 800
                },
                {
                    prompt: '지원한 직무 분야에 본인이 최적의 지원자라고 생각하는 이유를 서술하십시오.',
                    maxLength: 800
                }
            ]
        });
    });

    it('EXT-005: does not treat Jasoseol role category text as essay questions', async () => {
        const doc = document.implementation.createHTMLDocument('jasoseol-role-categories-not-essays');
        doc.body.innerHTML = `
      <main>
        <h1>2026 신입 채용</h1>
        <a href="/company/example">Example Labs</a>
        <time datetime="2026-06-30">2026년 6월 30일 23:59</time>
        <section aria-label="모집 직무">
          <ul>
            <li>
              <span>Backend</span>
              <span>0명 작성</span>
            </li>
          </ul>
        </section>
        <section>
          <p>사무마케팅 광고 홍보무역 유통IT 인터넷20생산 제조영업 고객상담건설금융6연구개발 설계디자인미디어전문 특수직</p>
        </section>
        <button id="essay">자소서 문항 보기</button>
      </main>
    `;

        await expect(extractJobPostingWithInteractions(doc, 'https://jasoseol.com/recruit/example', {
            hoverDelayMs: 0,
            essayQuestionTimeoutMs: 50,
            maxEssayTriggers: 1,
            targetRoles: ['Backend']
        })).resolves.toMatchObject({
            essayQuestions: [],
            roleEssayQuestions: {},
            essayQuestionAvailability: {}
        });
    });
    it('EXT-005: matches a full Jasoseol role name to a shorter visible essay trigger row', async () => {
        const doc = document.implementation.createHTMLDocument('jasoseol-luxe-division-role');
        doc.body.innerHTML = `
      <main>
        <h1>2026년 신입 채용</h1>
        <a href="/company/loreal">로레알코리아</a>
        <time datetime="2026-06-30">2026년 6월 30일 23:59</time>
        <script id="__NEXT_DATA__" type="application/json">
          {
            "props": {
              "pageProps": {
                "initialEmploymentCompany": {
                  "name": "로레알코리아",
                  "end_time": "2026-06-30T23:59:00.000+09:00",
                  "employments": [
                    { "field": "[Luxe Division] CRM - Lancôme CRM & Media" }
                  ]
                }
              }
            }
          }
        </script>
        <section aria-label="모집 직무">
          <ul>
            <li>
              <span>CRM - Lancôme CRM & Media</span>
              <span>5명 작성</span>
              <button id="essay">자기소개서 작성</button>
            </li>
          </ul>
        </section>
      </main>
    `;
        doc.getElementById('essay').addEventListener('mouseover', () => {
            const layer = doc.createElement('div');
            layer.setAttribute('role', 'dialog');
            layer.textContent = 'CRM - Lancôme CRM & Media· 지원 동기를 작성해 주세요.(800자)· CRM 캠페인 경험을 작성해 주세요.(800자)';
            doc.body.append(layer);
        }, { once: true });

        await expect(extractJobPostingWithInteractions(doc, 'https://jasoseol.com/recruit?ec=104296', {
            hoverDelayMs: 0,
            targetRoles: ['[Luxe Division] CRM - Lancôme CRM & Media']
        })).resolves.toMatchObject({
            roleOptions: ['[Luxe Division] CRM - Lancôme CRM & Media'],
            essayQuestions: [
                { prompt: '지원 동기를 작성해 주세요.', maxLength: 800 },
                { prompt: 'CRM 캠페인 경험을 작성해 주세요.', maxLength: 800 }
            ],
            roleEssayQuestions: {
                '[Luxe Division] CRM - Lancôme CRM & Media': [
                    { prompt: '지원 동기를 작성해 주세요.', maxLength: 800 },
                    { prompt: 'CRM 캠페인 경험을 작성해 주세요.', maxLength: 800 }
                ]
            },
            essayQuestionAvailability: {
                '[Luxe Division] CRM - Lancôme CRM & Media': 'found'
            }
        });
    });
    it('EXT-005: keeps SG role labels clean when a reloaded Jasoseol row contains compact essay text', async () => {
        const doc = document.implementation.createHTMLDocument('jasoseol-sg-strategy-reloaded-row');
        doc.body.innerHTML = `
      <main>
        <h1>삼정KPMG 채용</h1>
        <a href="/company/kpmg">삼정KPMG</a>
        <time datetime="2026-06-30">2026년 6월 30일 23:59</time>
        <section aria-label="모집 직무">
          <ul>
            <li>
              <span>SG - Strategy ONE· 1. 본인의 강점 3가지를 해시태그(#)를 사용하여 키워드로 표현해 주십시오.</span>
              <span>12명 작성</span>
              <button id="essay">나중에 쓸 자기소개서로 추가</button>
            </li>
          </ul>
        </section>
      </main>
    `;
        doc.getElementById('essay').addEventListener('mouseover', () => {
            const layer = doc.createElement('div');
            layer.setAttribute('role', 'dialog');
            layer.textContent = 'SG - Strategy ONE· 1. 본인의 강점 3가지를 해시태그(#)를 사용하여 키워드로 표현해 주십시오.(700자)· 2. 지원 동기를 구체적으로 작성해 주십시오.(700자)';
            doc.body.append(layer);
        }, { once: true });

        await expect(extractJobPostingWithInteractions(doc, 'https://jasoseol.com/recruit?ec=104999', {
            hoverDelayMs: 0,
            targetRoles: ['SG - Strategy ONE']
        })).resolves.toMatchObject({
            companyName: '삼정KPMG',
            roleOptions: ['SG - Strategy ONE'],
            essayQuestions: [
                {
                    prompt: '본인의 강점 3가지를 해시태그(#)를 사용하여 키워드로 표현해 주십시오.',
                    maxLength: 700
                },
                {
                    prompt: '지원 동기를 구체적으로 작성해 주십시오.',
                    maxLength: 700
                }
            ],
            roleEssayQuestions: {
                'SG - Strategy ONE': [
                    {
                        prompt: '본인의 강점 3가지를 해시태그(#)를 사용하여 키워드로 표현해 주십시오.',
                        maxLength: 700
                    },
                    {
                        prompt: '지원 동기를 구체적으로 작성해 주십시오.',
                        maxLength: 700
                    }
                ]
            }
        });
    });
    it('EXT-005: marks a selected Jasoseol role as having no essay questions when no trigger exists', async () => {
        const doc = document.implementation.createHTMLDocument('jasoseol-no-essay-questions');
        doc.body.innerHTML = `
      <main>
        <h1>수시 채용</h1>
        <a href="/company/sample">샘플기업</a>
        <time datetime="2026-06-30">2026년 6월 30일 23:59</time>
        <script id="__NEXT_DATA__" type="application/json">
          {
            "props": {
              "pageProps": {
                "initialEmploymentCompany": {
                  "name": "샘플기업",
                  "end_time": "2026-06-30T23:59:00.000+09:00",
                  "employments": [
                    { "field": "영업관리" }
                  ]
                }
              }
            }
          }
        </script>
        <section aria-label="모집 직무">
          <ul>
            <li>
              <span>영업관리</span>
              <span>0명 작성</span>
            </li>
          </ul>
        </section>
      </main>
    `;

        await expect(extractJobPostingWithInteractions(doc, 'https://jasoseol.com/recruit?ec=104450', {
            hoverDelayMs: 0,
            targetRoles: ['영업관리']
        })).resolves.toMatchObject({
            roleOptions: ['영업관리'],
            essayQuestions: [],
            roleEssayQuestions: {},
            essayQuestionAvailability: {
                '영업관리': 'none'
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
        expect(extractJobPosting(doc, 'https://jasoseol.com/')).toMatchObject({
            companyName: 'BGF로지스',
            positionTitle: '2026년 하계 채용연계형 인턴 채용',
            sourceUrl: 'https://jasoseol.com/',
            deadlineLabel: '2026년 6월 15일 23:59',
            roleOptions: [
                '인턴 · 물류센터 직군 - 지역거점 물류센터(RDC)',
                '인턴 · 물류센터 직군 - 자동화 물류센터(CDC)'
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
            deadlineLabel: '2026.06.15'
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
            roleOptions: ['인턴 · 재무지원팀 - 회계']
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
                '신입 · 일반직 - 개발협력일반 (일반)',
                '신입 · 일반직 - 개발협력일반 (비수도권 지역인재)',
                '경력 · 공무직 - 기술지원(전산)'
            ]
        });
    });
    it('extracts the selected recruit detail when Jasoseol uses an on-hire deadline and stale page data exists', () => {
        const doc = document.implementation.createHTMLDocument('jasoseol-recruit-on-hire-deadline');
        doc.body.innerHTML = `
      <main>
        <h1>채용공고</h1>
        <script id="__NEXT_DATA__" type="application/json">
          {
            "props": {
              "pageProps": {
                "initialEmploymentCompany": {
                  "name": "면사랑",
                  "end_time": "2026-05-31T23:59:00.000+09:00",
                  "employments": [
                    { "field": "경영기획/지원", "careerType": "신입" },
                    { "field": "디지털", "careerType": "신입" },
                    { "field": "IB", "careerType": "신입" }
                  ]
                }
              }
            }
          }
        </script>
        <section>
          <article>
            <img alt="NHN Cloud 기업 아이콘" />
            <strong>NHN Cloud</strong>
            <h2>AX컨설팅(정규직 전환형 인턴)</h2>
            <p>이 공고는 채용 시 마감되는 공고입니다. 지원을 서두르세요.</p>
            <section aria-label="모집 직무">
              <table>
                <tbody>
                  <tr>
                    <td>인턴</td>
                    <td>AX컨설팅(정규직 전환형 인턴)</td>
                    <td>8명 작성</td>
                    <td><button>자기소개서 쓰기</button></td>
                  </tr>
                </tbody>
              </table>
            </section>
          </article>
        </section>
      </main>
    `;

        expect(extractJobPosting(doc, 'https://jasoseol.com/recruit?ec=104659')).toMatchObject({
            companyName: 'NHN Cloud',
            positionTitle: 'AX컨설팅(정규직 전환형 인턴)',
            deadlineLabel: '채용 시 마감',
            roleOptions: ['인턴 · AX컨설팅(정규직 전환형 인턴)']
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

    it('does not treat the plain Jasoseol recruit listing as a job posting', () => {
        const doc = document.implementation.createHTMLDocument('jasoseol-recruit-list');
        doc.body.innerHTML = `
          <main>
            <h1>채용공고</h1>
            <ul>
              <li>비바리퍼블리카(토스)0명다들 ma 결과 받으셨나요?1</li>
              <li>DN솔루션즈10명최종 배수가 얼마나 될까요...2</li>
            </ul>
          </main>
        `;

        expect(extractJobPosting(doc, 'https://jasoseol.com/recruit')).toMatchObject({
            companyName: null,
            positionTitle: null,
            deadlineLabel: null,
            sourceUrl: 'https://jasoseol.com/recruit',
            roleOptions: [],
            essayQuestions: [],
            roleEssayQuestions: {}
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
