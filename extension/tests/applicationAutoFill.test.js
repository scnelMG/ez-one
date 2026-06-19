import { describe, expect, it } from 'vitest';
import { applyAutoFillPlan, applyAutoFillPlanAsync, buildAutoFillPlan, flattenDocumentProfileValues, previewAutoFillPlan } from '../src/content/applicationAutoFill';

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

    it('EXT-027: exposes saved document values as fallback copy candidates', () => {
        const doc = document.implementation.createHTMLDocument('application');
        doc.body.innerHTML = `
      <form>
        <input placeholder="Email address" />
      </form>
    `;

        const preview = previewAutoFillPlan(buildAutoFillPlan(doc, profile));
        const result = applyAutoFillPlan(buildAutoFillPlan(doc, profile));

        expect(preview.planned).toEqual([
            expect.objectContaining({ fieldKey: 'basicInfo.email', value: 'hong@example.com' })
        ]);
        expect(preview.copyCandidates).toEqual(expect.arrayContaining([
            expect.objectContaining({ key: 'basicInfo.nameKo', value: 'Hong Gil Dong' }),
            expect.objectContaining({ key: 'basicInfo.phone', value: '010-1234-5678' }),
            expect.objectContaining({ key: 'basicInfo.birthdate', value: '1998-01-02' }),
            expect.objectContaining({ key: 'customFields.1', value: 'https://portfolio.example.com' })
        ]));
        expect(preview.copyCandidates.map((item) => item.key)).not.toContain('basicInfo.email');
        expect(result.copyCandidates).toEqual(expect.arrayContaining([
            expect.objectContaining({ key: 'basicInfo.nameKo', value: 'Hong Gil Dong' }),
            expect.objectContaining({ key: 'basicInfo.phone', value: '010-1234-5678' })
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

    it('EXT-013: deduplicates identical planned and filled display items', () => {
        const doc = document.implementation.createHTMLDocument('application');
        doc.body.innerHTML = `
      <form>
        <input aria-label="Address" />
        <input aria-label="Address" />
        <input aria-label="Detail address" />
      </form>
    `;
        const addressProfile = {
            sections: {
                basicInfo: {
                    address: 'Hakha-seoro 121beon-gil 120',
                    addressDetail: 'Sejong Building 302'
                }
            },
            customFields: []
        };
        const plan = buildAutoFillPlan(doc, addressProfile);

        const preview = previewAutoFillPlan(plan);
        const result = applyAutoFillPlan(plan);

        expect(preview.planned.filter((item) => item.fieldKey === 'basicInfo.address')).toHaveLength(1);
        expect(result.filled.filter((item) => item.fieldKey === 'basicInfo.address')).toHaveLength(1);
        expect(preview.plannedCount).toBe(2);
        expect(result.filledCount).toBe(2);
    });

    it('EXT-024: skips service-period shortcut buttons and fills rank/discharge custom selects after dates', async () => {
        const doc = document.implementation.createHTMLDocument('application');
        doc.body.innerHTML = `
      <form>
        <label>\uC785\uB300\uC77C<input id="enlistment-date" /></label>
        <label>\uC81C\uB300\uC77C<input id="discharge-date" /></label>
        <button type="button" data-month="18">18 \uAC1C\uC6D4</button>
        <button type="button" data-month="21">21 \uAC1C\uC6D4</button>
        <button type="button" data-month="24">24 \uAC1C\uC6D4</button>
        <button id="rank" type="button" aria-haspopup="listbox">\uACC4\uAE09\uC744 \uC120\uD0DD\uD574\uC8FC\uC138\uC694.</button>
        <button id="discharge-type" type="button" aria-haspopup="listbox">\uC81C\uB300\uAD6C\uBD84\uC744 \uC120\uD0DD\uD574\uC8FC\uC138\uC694.</button>
      </form>
    `;
        const clickedMonths = [];
        doc.querySelectorAll('[data-month]').forEach((button) => {
            button.addEventListener('click', () => clickedMonths.push(button.dataset.month));
        });
        doc.getElementById('rank').addEventListener('click', () => {
            if (!doc.getElementById('enlistment-date').value || doc.getElementById('rank-option')) return;
            const option = doc.createElement('button');
            option.id = 'rank-option';
            option.type = 'button';
            option.textContent = '\uC774\uBCD1';
            option.addEventListener('click', () => {
                doc.getElementById('rank').textContent = option.textContent;
            });
            doc.body.append(option);
        });
        doc.getElementById('discharge-type').addEventListener('click', () => {
            if (!doc.getElementById('discharge-date').value || doc.getElementById('discharge-option')) return;
            const option = doc.createElement('button');
            option.id = 'discharge-option';
            option.type = 'button';
            option.textContent = '\uC18C\uC9D1\uD574\uC81C';
            option.addEventListener('click', () => {
                doc.getElementById('discharge-type').textContent = option.textContent;
            });
            doc.body.append(option);
        });
        const militaryProfile = {
            sections: {
                military: {
                    military: [{
                        enlistmentDate: '2023-07-31',
                        dischargeDate: '2025-04-30',
                        servicePeriod: '21 \uAC1C\uC6D4',
                        rank: '\uC774\uBCD1',
                        dischargeType: '\uC18C\uC9D1\uD574\uC81C'
                    }]
                }
            },
            customFields: []
        };

        const plan = buildAutoFillPlan(doc, militaryProfile);
        const result = await applyAutoFillPlanAsync(plan);

        expect(plan.fillable.map((item) => item.fieldKey)).not.toContain('military.servicePeriod');
        expect(clickedMonths).toEqual([]);
        expect(result.filled).toEqual(expect.arrayContaining([
            expect.objectContaining({ fieldKey: 'military.enlistmentDate', value: '2023-07-31' }),
            expect.objectContaining({ fieldKey: 'military.dischargeDate', value: '2025-04-30' }),
            expect.objectContaining({ fieldKey: 'military.rank', value: '\uC774\uBCD1' }),
            expect.objectContaining({ fieldKey: 'military.dischargeType', value: '\uC18C\uC9D1\uD574\uC81C' })
        ]));
        expect(doc.getElementById('rank').textContent).toBe('\uC774\uBCD1');
        expect(doc.getElementById('discharge-type').textContent).toBe('\uC18C\uC9D1\uD574\uC81C');
    });

    it('EXT-031: selects design-system military dropdowns that open and choose on mouse events', async () => {
        const doc = document.implementation.createHTMLDocument('application');
        doc.body.innerHTML = `
      <form>
        <label>\uC785\uB300\uC77C<input id="enlistment-date" /></label>
        <label>\uC81C\uB300\uC77C<input id="discharge-date" /></label>
        <div class="remix-css-16v31c6">
          <div class="ats-inline-flex ats-flex-col ats-relative ats-group">
            <button id="rank" type="button" class="remix-css-1hgtg6w">
              <p>\uACC4\uAE09\uC744 \uC120\uD0DD\uD574\uC8FC\uC138\uC694.</p>
            </button>
          </div>
        </div>
        <div class="remix-css-16v31c6">
          <div class="ats-inline-flex ats-flex-col ats-relative ats-group">
            <button id="discharge-type" type="button" class="remix-css-1hgtg6w">
              <p>\uC81C\uB300\uAD6C\uBD84\uC744 \uC120\uD0DD\uD574\uC8FC\uC138\uC694.</p>
            </button>
          </div>
        </div>
      </form>
    `;
        const openDropdown = (trigger, options) => {
            const wrapper = trigger.closest('.ats-inline-flex');
            if (wrapper.querySelector('#dropdown-body')) return;
            const dropdown = doc.createElement('div');
            dropdown.id = 'dropdown-body';
            dropdown.innerHTML = `
          <ul>
            ${options.map((option) => `
              <li><button type="button" value="${option.value}"><span><p>${option.label}</p></span></button></li>
            `).join('')}
          </ul>
        `;
            dropdown.querySelectorAll('button').forEach((optionButton) => {
                optionButton.addEventListener('mousedown', () => {
                    trigger.querySelector('p').textContent = optionButton.textContent.trim();
                    dropdown.remove();
                });
            });
            wrapper.append(dropdown);
        };
        doc.getElementById('rank').addEventListener('mousedown', () => {
            openDropdown(doc.getElementById('rank'), [
                { value: '01', label: '\uC774\uBCD1' },
                { value: '02', label: '\uBCD1\uC7A5' }
            ]);
        });
        doc.getElementById('discharge-type').addEventListener('mousedown', () => {
            openDropdown(doc.getElementById('discharge-type'), [
                { value: '01', label: '\uB9CC\uAE30\uC81C\uB300' },
                { value: '02', label: '\uC18C\uC9D1\uD574\uC81C' }
            ]);
        });
        const militaryProfile = {
            sections: {
                military: {
                    military: [{
                        enlistmentDate: '2023-07-31',
                        dischargeDate: '2025-04-30',
                        rank: '\uC774\uBCD1',
                        dischargeType: '\uC18C\uC9D1\uD574\uC81C'
                    }]
                }
            },
            customFields: []
        };

        const result = await applyAutoFillPlanAsync(buildAutoFillPlan(doc, militaryProfile));

        expect(result.filled).toEqual(expect.arrayContaining([
            expect.objectContaining({ fieldKey: 'military.rank', value: '\uC774\uBCD1' }),
            expect.objectContaining({ fieldKey: 'military.dischargeType', value: '\uC18C\uC9D1\uD574\uC81C' })
        ]));
        expect(doc.getElementById('rank').textContent).toContain('\uC774\uBCD1');
        expect(doc.getElementById('discharge-type').textContent).toContain('\uC18C\uC9D1\uD574\uC81C');
    });

    it('EXT-025: keeps high school and university education fields in their own sections', () => {
        const doc = document.implementation.createHTMLDocument('application');
        doc.body.innerHTML = `
      <form>
        <section aria-label="\uACE0\uB4F1\uD559\uAD50">
          <h3>\uACE0\uB4F1\uD559\uAD50</h3>
          <label>\uD559\uAD50\uC815\uBCF4<input id="high-school-name" /></label>
          <label>\uD559\uAD50 \uC18C\uC7AC\uC9C0<input id="high-school-location" /></label>
          <label>\uACC4\uC5F4<input id="high-school-track" /></label>
          <label>\uC7AC\uD559\uAE30\uAC04<input id="high-school-start" /></label>
          <label>\uC7AC\uD559\uAE30\uAC04<input id="high-school-end" /></label>
        </section>
        <section aria-label="\uB300\uD559\uAD50">
          <h3>\uB300\uD559\uAD50</h3>
          <label>\uD559\uAD50\uC815\uBCF4<input id="university-name" /></label>
          <label>\uD559\uAD50 \uC18C\uC7AC\uC9C0<input id="university-location" /></label>
          <label>\uC7AC\uD559\uAE30\uAC04<input id="university-start" /></label>
          <label>\uC7AC\uD559\uAE30\uAC04<input id="university-end" /></label>
          <label>\uD559\uC5C5\uC131\uC801<input id="university-grade" /></label>
          <label>\uC774\uC218\uD559\uC810<input id="university-credits" /></label>
        </section>
      </form>
    `;
        const educationProfile = {
            sections: {
                education: {
                    highSchool: {
                        schoolName: '\uBD80\uC0B0\uB3D9\uACE0\uB4F1\uD559\uAD50',
                        location: '\uBD80\uC0B0',
                        track: '\uC790\uC5F0\uACC4',
                        admissionDate: '2017-03-02',
                        graduationDate: '2020-02-28'
                    },
                    universities: [{
                        schoolName: '\uBD80\uC0B0\uB300\uD559\uAD50',
                        location: '\uBD80\uC0B0',
                        admissionDate: '2020-03-02',
                        graduationDate: '2026-02-20',
                        grade: '3.93',
                        credits: '149'
                    }]
                }
            },
            customFields: []
        };

        applyAutoFillPlan(buildAutoFillPlan(doc, educationProfile));

        expect(doc.getElementById('high-school-name').value).toBe('\uBD80\uC0B0\uB3D9\uACE0\uB4F1\uD559\uAD50');
        expect(doc.getElementById('high-school-start').value).toBe('2017-03-02');
        expect(doc.getElementById('high-school-end').value).toBe('2020-02-28');
        expect(doc.getElementById('university-name').value).toBe('\uBD80\uC0B0\uB300\uD559\uAD50');
        expect(doc.getElementById('university-start').value).toBe('2020-03-02');
        expect(doc.getElementById('university-end').value).toBe('2026-02-20');
        expect(doc.getElementById('university-grade').value).toBe('3.93');
        expect(doc.getElementById('university-credits').value).toBe('149');
    });

    it('EXT-026: keeps language test score out of acquired date fields', () => {
        const doc = document.implementation.createHTMLDocument('application');
        doc.body.innerHTML = `
      <form>
        <section aria-label="\uACF5\uC778\uC678\uAD6D\uC5B4\uC2DC\uD5D8">
          <h3>\uACF5\uC778\uC678\uAD6D\uC5B4\uC2DC\uD5D8</h3>
          <label>\uC2DC\uD5D8\uBA85<select id="language-test-name"><option value="">\uC120\uD0DD</option><option value="OPIc(영어)">OPIc(\uC601\uC5B4)</option></select></label>
          <label>\uC810\uC218/\uB4F1\uAE09<input id="language-score" /></label>
          <label>\uCDE8\uB4DD\uC77C<input id="language-date" placeholder="YYYY-MM-DD" /></label>
          <label>\uB4F1\uB85D\uBC88\uD638<input id="language-registration" /></label>
        </section>
      </form>
    `;
        const languageProfile = {
            sections: {
                certificates: {
                    languageTests: [{
                        testName: 'OPIc(\uC601\uC5B4)',
                        score: 'IM1',
                        acquiredDate: '2024-06-01',
                        registrationNumber: 'OPIC-2024-001'
                    }]
                }
            },
            customFields: []
        };

        applyAutoFillPlan(buildAutoFillPlan(doc, languageProfile));

        expect(doc.getElementById('language-test-name').value).toBe('OPIc(\uC601\uC5B4)');
        expect(doc.getElementById('language-score').value).toBe('IM1');
        expect(doc.getElementById('language-date').value).toBe('2024-06-01');
        expect(doc.getElementById('language-registration').value).toBe('OPIC-2024-001');
    });

    it('EXT-028: maps repeated certificate rows by row index', () => {
        const doc = document.implementation.createHTMLDocument('application');
        doc.body.innerHTML = `
      <form>
        <section aria-label="\uC790\uACA9\uC99D">
          <h3>\uC790\uACA9\uC99D</h3>
          <label>\uC790\uACA9\uC99D\uBA85<input id="cert-0-name" /></label>
          <label>\uBC1C\uAE09\uAE30\uAD00<input id="cert-0-issuer" /></label>
          <label>\uCDE8\uB4DD\uC77C<input id="cert-0-date" /></label>
          <label>\uB4F1\uB85D\uBC88\uD638<input id="cert-0-registration" /></label>
          <label>\uC790\uACA9\uC99D\uBA85<input id="cert-1-name" /></label>
          <label>\uBC1C\uAE09\uAE30\uAD00<input id="cert-1-issuer" /></label>
          <label>\uCDE8\uB4DD\uC77C<input id="cert-1-date" /></label>
          <label>\uB4F1\uB85D\uBC88\uD638<input id="cert-1-registration" /></label>
        </section>
      </form>
    `;
        const certificateProfile = {
            sections: {
                certificates: {
                    certificates: [
                        {
                            certificateName: 'ADsP(\uB370\uC774\uD130\uBD84\uC11D\uC900\uC804\uBB38\uAC00)',
                            issuer: '\uD55C\uAD6D\uB370\uC774\uD130\uC0B0\uC5C5\uC9C4\uD765\uC6D0',
                            acquiredDate: '2026-06-05',
                            registrationNumber: 'ADSP-001'
                        },
                        {
                            certificateName: '\uC815\uBCF4\uCC98\uB9AC\uAE30\uC0AC',
                            issuer: '\uD55C\uAD6D\uC0B0\uC5C5\uC778\uB825\uACF5\uB2E8',
                            acquiredDate: '2025-09-12',
                            registrationNumber: 'IPE-002'
                        }
                    ]
                }
            },
            customFields: []
        };

        applyAutoFillPlan(buildAutoFillPlan(doc, certificateProfile));

        expect(doc.getElementById('cert-0-name').value).toBe('ADsP(\uB370\uC774\uD130\uBD84\uC11D\uC900\uC804\uBB38\uAC00)');
        expect(doc.getElementById('cert-0-issuer').value).toBe('\uD55C\uAD6D\uB370\uC774\uD130\uC0B0\uC5C5\uC9C4\uD765\uC6D0');
        expect(doc.getElementById('cert-0-date').value).toBe('2026-06-05');
        expect(doc.getElementById('cert-0-registration').value).toBe('ADSP-001');
        expect(doc.getElementById('cert-1-name').value).toBe('\uC815\uBCF4\uCC98\uB9AC\uAE30\uC0AC');
        expect(doc.getElementById('cert-1-issuer').value).toBe('\uD55C\uAD6D\uC0B0\uC5C5\uC778\uB825\uACF5\uB2E8');
        expect(doc.getElementById('cert-1-date').value).toBe('2025-09-12');
        expect(doc.getElementById('cert-1-registration').value).toBe('IPE-002');
    });

    it('EXT-029: selects autocomplete certificate options before filling revealed fields', async () => {
        const doc = document.implementation.createHTMLDocument('application');
        doc.body.innerHTML = `
      <form>
        <section aria-label="\uC790\uACA9\uC99D">
          <h3>\uC790\uACA9\uC99D</h3>
          <label>\uC790\uACA9\uC99D
            <input id="certificate-search" role="combobox" aria-autocomplete="list" aria-controls="certificate-options" />
          </label>
          <div id="certificate-options" role="listbox"></div>
          <div id="certificate-dependent-fields"></div>
        </section>
      </form>
    `;
        const search = doc.getElementById('certificate-search');
        search.addEventListener('input', () => {
            doc.getElementById('certificate-options').innerHTML = `
        <button type="button" role="option">\uC815\uBCF4\uCC98\uB9AC\uAE30\uC0AC</button>
        <button type="button" role="option">\uC815\uBCF4\uCC98\uB9AC\uAE30\uB2A5\uC0AC</button>
      `;
            doc.querySelector('[role="option"]').addEventListener('click', () => {
                search.value = '\uC815\uBCF4\uCC98\uB9AC\uAE30\uC0AC';
                doc.getElementById('certificate-dependent-fields').innerHTML = `
          <label>\uBC1C\uAE09\uAE30\uAD00<input id="certificate-issuer" /></label>
          <label>\uCDE8\uB4DD\uC77C<input id="certificate-date" /></label>
          <label>\uB4F1\uB85D\uBC88\uD638<input id="certificate-registration" /></label>
        `;
            });
        });
        const certificateProfile = {
            sections: {
                certificates: {
                    certificates: [{
                        certificateName: '\uC815\uBCF4\uCC98\uB9AC\uAE30\uC0AC',
                        issuer: '\uD55C\uAD6D\uC0B0\uC5C5\uC778\uB825\uACF5\uB2E8',
                        acquiredDate: '2026-06-05',
                        registrationNumber: 'IPE-2026-001'
                    }]
                }
            },
            customFields: []
        };

        const result = await applyAutoFillPlanAsync(buildAutoFillPlan(doc, certificateProfile));

        expect(search.value).toBe('\uC815\uBCF4\uCC98\uB9AC\uAE30\uC0AC');
        expect(doc.getElementById('certificate-issuer').value).toBe('\uD55C\uAD6D\uC0B0\uC5C5\uC778\uB825\uACF5\uB2E8');
        expect(doc.getElementById('certificate-date').value).toBe('2026-06-05');
        expect(doc.getElementById('certificate-registration').value).toBe('IPE-2026-001');
        expect(result.filled.map((item) => item.fieldKey)).toEqual([
            'certificates.certificates.0.certificateName',
            'certificates.certificates.0.issuer',
            'certificates.certificates.0.acquiredDate',
            'certificates.certificates.0.registrationNumber'
        ]);
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
            expect.objectContaining({ label: '희망연봉', reason: 'unsupported_profile_field' })
        ]);
        expect(result.copyCandidates).toEqual(expect.arrayContaining([
            expect.objectContaining({ key: 'basicInfo.email', value: 'hong@example.com' }),
            expect.objectContaining({ key: 'basicInfo.phone', value: '010-1234-5678' })
        ]));
    });

    it('EXT-013: fills common application defaults and reusable profile fields', () => {
        const doc = document.implementation.createHTMLDocument('application');
        doc.body.innerHTML = `
      <form>
        <section>
          <p>신입/경력</p>
          <button type="button" data-option="newcomer">신입</button>
          <button type="button" data-option="experienced">경력</button>
          <label>지원경로<input id="application-source" /></label>
        </section>
        <section>
          <label>복무기간<select id="service-period"><option value="">선택</option><option value="21">21 개월</option></select></label>
          <label>장애등록번호<input id="disability-number" /></label>
          <label>장애 유형<input id="disability-type" /></label>
        </section>
        <section>
          <label>계열<input id="high-school-track" /></label>
          <label>학교 소재지<input id="university-location" /></label>
          <label>본교/분교<select id="campus-type"><option value="">선택</option><option value="main">본교</option><option value="branch">분교</option></select></label>
          <label>학과계열<input id="major-category" /></label>
        </section>
      </form>
    `;
        const profileWithApplicationDefaults = {
            sections: {
                basicInfo: {
                    applicationCareerType: '신입',
                    applicationSource: '채용 사이트'
                },
                military: {
                    military: [{
                        servicePeriod: '21 개월',
                        disabilityRegistrationNumber: '12-3456789',
                        disabilityType: '지체'
                    }]
                },
                education: {
                    highSchool: {
                        track: '인문계'
                    },
                    universities: [{
                        location: '부산',
                        campusType: '본교',
                        majorCategory: '공학계열'
                    }]
                }
            },
            customFields: []
        };
        const clickedOptions = [];
        doc.querySelectorAll('button').forEach((button) => {
            button.addEventListener('click', () => clickedOptions.push(button.dataset.option));
        });

        const result = applyAutoFillPlan(buildAutoFillPlan(doc, profileWithApplicationDefaults));

        expect(result.filled).toEqual(expect.arrayContaining([
            expect.objectContaining({ fieldKey: 'basicInfo.applicationCareerType', value: '신입' }),
            expect.objectContaining({ fieldKey: 'basicInfo.applicationSource', value: '채용 사이트' }),
            expect.objectContaining({ fieldKey: 'military.servicePeriod', value: '21 개월' }),
            expect.objectContaining({ fieldKey: 'military.disabilityRegistrationNumber', value: '12-3456789' }),
            expect.objectContaining({ fieldKey: 'military.disabilityType', value: '지체' }),
            expect.objectContaining({ fieldKey: 'education.highSchool.track', value: '인문계' }),
            expect.objectContaining({ fieldKey: 'education.universities.0.location', value: '부산' }),
            expect.objectContaining({ fieldKey: 'education.universities.0.campusType', value: '본교' }),
            expect.objectContaining({ fieldKey: 'education.universities.0.majorCategory', value: '공학계열' })
        ]));
        expect(clickedOptions).toEqual(['newcomer']);
        expect(doc.getElementById('application-source').value).toBe('채용 사이트');
        expect(doc.getElementById('service-period').value).toBe('21');
        expect(doc.getElementById('disability-number').value).toBe('12-3456789');
        expect(doc.getElementById('disability-type').value).toBe('지체');
        expect(doc.getElementById('high-school-track').value).toBe('인문계');
        expect(doc.getElementById('university-location').value).toBe('부산');
        expect(doc.getElementById('campus-type').value).toBe('main');
        expect(doc.getElementById('major-category').value).toBe('공학계열');
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

    it('EXT-030: offers activity copy helpers instead of auto-filling tailored activity fields', () => {
        const doc = document.implementation.createHTMLDocument('application');
        doc.body.innerHTML = `
      <form>
        <section aria-label="\uD559\uB0B4\uC678\uD65C\uB3D9 1">
          <h3>\uD559\uB0B4\uC678\uD65C\uB3D9 1</h3>
          <label>\uD65C\uB3D9\uAD6C\uBD84<input id="activity-type" placeholder="\uD65C\uB3D9 \uAD6C\uBD84\uC744 \uC120\uD0DD\uD574\uC8FC\uC138\uC694" /></label>
          <label>\uAE30\uAD00 \uBC0F \uC870\uC9C1\uBA85<input id="activity-organization" placeholder="\uAE30\uAD00 \uBC0F \uC870\uC9C1\uBA85\uC744 \uC785\uB825\uD574\uC8FC\uC138\uC694." /></label>
          <label>\uD65C\uB3D9\uAE30\uAC04<input id="activity-start" /></label>
          <label>\uD65C\uB3D9\uAE30\uAC04<input id="activity-end" /></label>
          <label>\uC5ED\uD560<input id="activity-role" placeholder="\uC9C1\uC704 \uB610\uB294 \uC5ED\uD560\uC744 \uC785\uB825\uD574\uC8FC\uC138\uC694" /></label>
          <label>\uC0C1\uC138 \uB0B4\uC6A9<textarea id="activity-description" placeholder="\uD65C\uB3D9 \uB0B4\uC6A9\uC744 \uC0C1\uC138\uD788 \uC785\uB825\uD574\uC8FC\uC138\uC694."></textarea></label>
        </section>
      </form>
    `;
        const activityProfile = {
            sections: {
                other: {
                    activities: [{
                        activityType: '\uB3D9\uC544\uB9AC',
                        activityName: '\uD540\uD14C\uD06C \uC5F0\uAD6C\uD68C',
                        organization: '\uBD80\uC0B0\uB300\uD559\uAD50 \uD540\uD14C\uD06C\uC735\uD569\uC804\uACF5',
                        role: '\uD300\uC7A5',
                        startDate: '2023-03-01',
                        endDate: '2023-12-31',
                        description: '\uAE08\uC735 \uB370\uC774\uD130 \uBD84\uC11D \uC2A4\uD130\uB514\uB97C \uAE30\uD68D\uD558\uACE0 \uC6B4\uC601',
                        outcome: '\uC5F0\uAD6C \uBC1C\uD45C\uD68C \uB300\uC0C1'
                    }]
                }
            },
            customFields: []
        };

        const result = applyAutoFillPlan(buildAutoFillPlan(doc, activityProfile));

        expect(result.filledCount).toBe(0);
        expect(doc.getElementById('activity-organization').value).toBe('');
        expect(doc.getElementById('activity-description').value).toBe('');
        expect(result.failed).toEqual([
            expect.objectContaining({
                fieldKey: 'activities.assist',
                label: '\uD559\uB0B4\uC678\uD65C\uB3D9',
                reason: 'tailored_activity_required'
            })
        ]);
        expect(result.copyCandidates).toEqual(expect.arrayContaining([
            expect.objectContaining({ key: 'activities.0.organization', label: '\uD65C\uB3D9 1 \uAE30\uAD00/\uC870\uC9C1', value: '\uBD80\uC0B0\uB300\uD559\uAD50 \uD540\uD14C\uD06C\uC735\uD569\uC804\uACF5' }),
            expect.objectContaining({ key: 'activities.0.period', label: '\uD65C\uB3D9 1 \uD65C\uB3D9\uAE30\uAC04', value: '2023-03-01 ~ 2023-12-31' }),
            expect.objectContaining({ key: 'activities.0.role', label: '\uD65C\uB3D9 1 \uC5ED\uD560', value: '\uD300\uC7A5' }),
            expect.objectContaining({ key: 'activities.0.description', label: '\uD65C\uB3D9 1 \uC0C1\uC138 \uB0B4\uC6A9', value: '\uAE08\uC735 \uB370\uC774\uD130 \uBD84\uC11D \uC2A4\uD130\uB514\uB97C \uAE30\uD68D\uD558\uACE0 \uC6B4\uC601' })
        ]));
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
