import { describe, expect, it } from 'vitest';
import { applyAutoFillPlan, buildAutoFillPlan, flattenDocumentProfileValues } from '../src/content/applicationAutoFill';

const profile = {
    sections: {
        basicInfo: {
            nameKo: 'Hong Gil Dong',
            email: 'hong@example.com',
            phone: '010-1234-5678',
            birthdate: '1998-01-02',
            address: 'Seoul'
        },
        education: [
            { title: 'Korea University', summary: 'Computer Science' }
        ],
        projects: [
            { title: 'EZ-ONE', summary: 'Job application workspace' }
        ],
        essays: [
            { title: 'Do not use me', summary: 'This should never be auto-filled.' }
        ]
    },
    customFields: [
        { id: 1, label: 'Portfolio URL', value: 'https://portfolio.example.com' }
    ]
};

describe('applicationAutoFill', () => {
    it('EXT-013: matches label, placeholder, name/id, table header, and nearby text controls', () => {
        const doc = document.implementation.createHTMLDocument('application');
        doc.body.innerHTML = `
      <form>
        <label for="applicant-name">Name</label>
        <input id="applicant-name" />
        <input placeholder="Email address" />
        <input name="phoneNumber" />
        <table><tr><th>Birthdate</th><td><input id="birth" /></td></tr></table>
        <div class="field"><span>Address</span><input /></div>
        <label>Portfolio <input /></label>
      </form>
    `;

        const result = applyAutoFillPlan(buildAutoFillPlan(doc, profile));

        expect(result.filled).toEqual(expect.arrayContaining([
            expect.objectContaining({ fieldKey: 'basicInfo.nameKo', value: 'Hong Gil Dong' }),
            expect.objectContaining({ fieldKey: 'basicInfo.email', value: 'hong@example.com' }),
            expect.objectContaining({ fieldKey: 'basicInfo.phone', value: '010-1234-5678' }),
            expect.objectContaining({ fieldKey: 'basicInfo.birthdate', value: '1998-01-02' }),
            expect.objectContaining({ fieldKey: 'basicInfo.address', value: 'Seoul' }),
            expect.objectContaining({ fieldKey: 'customFields.1', value: 'https://portfolio.example.com' })
        ]));
    });

    it('EXT-013: prefers specific Korean document labels over generic name matches', () => {
        const doc = document.implementation.createHTMLDocument('application');
        doc.body.innerHTML = `
      <form>
        <label for="name-ko">이름</label>
        <input id="name-ko" />
        <label for="name-en">영문 이름</label>
        <input id="name-en" />
      </form>
    `;
        const koreanProfile = {
            sections: {
                basicInfo: {
                    nameKo: '홍길동',
                    nameEn: 'Hong Gil Dong'
                }
            },
            customFields: []
        };

        const result = applyAutoFillPlan(buildAutoFillPlan(doc, koreanProfile));

        expect(result.filled).toEqual(expect.arrayContaining([
            expect.objectContaining({ fieldKey: 'basicInfo.nameKo', label: '이름', value: '홍길동' }),
            expect.objectContaining({ fieldKey: 'basicInfo.nameEn', label: '영문 이름', value: 'Hong Gil Dong' })
        ]));
        expect(doc.getElementById('name-ko').value).toBe('홍길동');
        expect(doc.getElementById('name-en').value).toBe('Hong Gil Dong');
    });

    it('EXT-013: only reports select fields as filled when an option is actually selected', () => {
        const doc = document.implementation.createHTMLDocument('application');
        doc.body.innerHTML = `
      <form>
        <label for="gender">성별</label>
        <select id="gender">
          <option value="">선택</option>
          <option value="M">남성</option>
          <option value="F">여성</option>
        </select>
        <label for="unmatched-gender">성별</label>
        <select id="unmatched-gender">
          <option value="">선택</option>
          <option value="X">응답 안 함</option>
        </select>
      </form>
    `;
        const koreanProfile = {
            sections: {
                basicInfo: {
                    gender: '남성'
                }
            },
            customFields: []
        };

        const result = applyAutoFillPlan(buildAutoFillPlan(doc, koreanProfile));

        expect(result.filled).toEqual([
            expect.objectContaining({ fieldKey: 'basicInfo.gender', label: '성별', value: '남성' })
        ]);
        expect(doc.getElementById('gender').value).toBe('M');
        expect(doc.getElementById('unmatched-gender').value).toBe('');
        expect(result.failed).toEqual([
            expect.objectContaining({ label: '성별', reason: 'select_option_not_found' })
        ]);
    });

    it('EXT-013: fills split phone number controls by segment instead of repeating the whole number', () => {
        const doc = document.implementation.createHTMLDocument('application');
        doc.body.innerHTML = `
      <form>
        <label>휴대폰
          <input id="phone-1" maxlength="3" />
          <input id="phone-2" maxlength="4" />
          <input id="phone-3" maxlength="4" />
        </label>
      </form>
    `;
        const koreanProfile = {
            sections: {
                basicInfo: {
                    phone: '010-1234-5678'
                }
            },
            customFields: []
        };

        const result = applyAutoFillPlan(buildAutoFillPlan(doc, koreanProfile));

        expect(result.filled.map((item) => item.value)).toEqual(['010', '1234', '5678']);
        expect(doc.getElementById('phone-1').value).toBe('010');
        expect(doc.getElementById('phone-2').value).toBe('1234');
        expect(doc.getElementById('phone-3').value).toBe('5678');
    });

    it('EXT-022: reports unmatched fields without blocking filled fields', () => {
        const doc = document.implementation.createHTMLDocument('application');
        doc.body.innerHTML = `
      <form>
        <input aria-label="Name" />
        <input aria-label="Expected salary" />
      </form>
    `;

        const result = applyAutoFillPlan(buildAutoFillPlan(doc, profile));

        expect(result.filledCount).toBe(1);
        expect(result.failed).toEqual([
            expect.objectContaining({ label: 'Expected salary', reason: 'no_match' })
        ]);
        expect(result.copyCandidates.length).toBeGreaterThan(0);
    });

    it('EXT-023: skips essay and motivation textarea fields for manual review', () => {
        const doc = document.implementation.createHTMLDocument('application');
        doc.body.innerHTML = `
      <form>
        <textarea aria-label="Motivation essay"></textarea>
      </form>
    `;

        const result = applyAutoFillPlan(buildAutoFillPlan(doc, profile));

        expect(result.filledCount).toBe(0);
        expect(result.failed).toEqual([
            expect.objectContaining({ label: 'Motivation essay', reason: 'essay_or_long_text' })
        ]);
    });

    it('PROFILE-026: flattens reusable document values while excluding essays', () => {
        const values = flattenDocumentProfileValues(profile);

        expect(values.map((value) => value.value)).toEqual(expect.arrayContaining([
            'Hong Gil Dong',
            'Korea University',
            'Computer Science',
            'EZ-ONE',
            'Job application workspace',
            'https://portfolio.example.com'
        ]));
        expect(values.map((value) => value.value)).not.toContain('This should never be auto-filled.');
    });
});
