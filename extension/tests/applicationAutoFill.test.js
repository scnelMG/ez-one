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
            { title: 'EZ One', summary: 'Job application workspace' }
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
            'EZ One',
            'Job application workspace',
            'https://portfolio.example.com'
        ]));
        expect(values.map((value) => value.value)).not.toContain('This should never be auto-filled.');
    });
});
