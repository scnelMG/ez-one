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

    it('EXT-031: executes auto-fill in visible DOM order instead of collection pass order', async () => {
        const doc = document.implementation.createHTMLDocument('application');
        doc.body.innerHTML = `
      <form>
        <label>\uC774\uB984<input id="name" /></label>
        <button id="gender" type="button">\uB0A8\uC131</button>
      </form>
    `;
        const events = [];
        doc.getElementById('name').addEventListener('input', () => events.push('name'));
        doc.getElementById('gender').addEventListener('click', () => events.push('gender'));
        const orderProfile = {
            sections: {
                basicInfo: {
                    nameKo: '\uBC15\uBBFC\uADDC',
                    gender: '\uB0A8\uC131'
                }
            },
            customFields: []
        };

        const result = await applyAutoFillPlanAsync(buildAutoFillPlan(doc, orderProfile));

        expect(result.failed).toEqual([]);
        expect(events).toEqual(['name', 'gender']);
        expect(result.filled.map((item) => item.fieldKey)).toEqual(['basicInfo.nameKo', 'basicInfo.gender']);
    });

    it('TC-EXT-DOC-PHOTO-001: attaches the saved profile photo to a photo file input', async () => {
        const doc = document.implementation.createHTMLDocument('application');
        doc.body.innerHTML = `
      <form>
        <label>\uC9C0\uC6D0\uC11C \uC0AC\uC9C4
          <input id="photo" type="file" accept="image/png,image/jpeg" />
        </label>
      </form>
    `;
        let changeCount = 0;
        doc.getElementById('photo').addEventListener('change', () => {
            changeCount += 1;
        });
        const photoProfile = {
            sections: {
                basicInfo: {
                    profilePhoto: {
                        name: 'resume-photo.png',
                        type: 'image/png',
                        size: 4,
                        dataUrl: 'data:image/png;base64,dGVzdA=='
                    }
                }
            },
            customFields: []
        };

        const result = await applyAutoFillPlanAsync(buildAutoFillPlan(doc, photoProfile));
        const input = doc.getElementById('photo');

        expect(result.failed).toEqual([]);
        expect(result.filled).toEqual([
            expect.objectContaining({
                fieldKey: 'basicInfo.profilePhoto',
                label: expect.stringContaining('\uC0AC\uC9C4'),
                value: 'resume-photo.png'
            })
        ]);
        expect(input.files).toHaveLength(1);
        expect(input.files[0].name).toBe('resume-photo.png');
        expect(input.files[0].type).toBe('image/png');
        expect(changeCount).toBe(1);
    });

    it('TC-EXT-DOC-PHOTO-002: leaves ambiguous image file inputs manual', () => {
        const doc = document.implementation.createHTMLDocument('application');
        doc.body.innerHTML = `
      <form>
        <label>\uC0AC\uC9C4 1<input id="photo-one" type="file" accept="image/*" /></label>
        <label>\uC0AC\uC9C4 2<input id="photo-two" type="file" accept="image/*" /></label>
      </form>
    `;
        const photoProfile = {
            sections: {
                basicInfo: {
                    profilePhoto: {
                        name: 'resume-photo.png',
                        type: 'image/png',
                        dataUrl: 'data:image/png;base64,dGVzdA=='
                    }
                }
            },
            customFields: []
        };

        const result = applyAutoFillPlan(buildAutoFillPlan(doc, photoProfile));

        expect(result.fillable).toEqual(undefined);
        expect(result.filled).toEqual([]);
        expect(doc.getElementById('photo-one').files).toHaveLength(0);
        expect(doc.getElementById('photo-two').files).toHaveLength(0);
    });

    it('EXT-013: matches Midas row labels outside the input wrapper', () => {
        const doc = document.implementation.createHTMLDocument('application');
        doc.body.innerHTML = `
      <form>
        <div class="remix-css-t25awl">
          <div class="remix-css-ke50n9">
            <p>생년월일</p>
          </div>
          <div class="remix-css-3btwcy">
            <div>
              <div>
                <input placeholder="YYYY.MM.DD" type="text" />
              </div>
            </div>
          </div>
        </div>
      </form>
    `;

        const result = applyAutoFillPlan(buildAutoFillPlan(doc, profile));

        expect(result.filled).toEqual([
            expect.objectContaining({ fieldKey: 'basicInfo.birthdate', label: '생년월일', value: '1998.01.02' })
        ]);
        expect(doc.querySelector('input').value).toBe('1998.01.02');
    });

    it('EXT-013: matches Midas radio options from wrapping label text', () => {
        const doc = document.implementation.createHTMLDocument('application');
        doc.body.innerHTML = `
      <form>
        <div class="remix-css-t25awl">
          <div class="remix-css-ke50n9"><p>\uC131\uBCC4</p></div>
          <div class="remix-css-3btwcy">
            <fieldset>
              <label><input id="gender-male" type="radio" name="gender" /><p>\uB0A8</p></label>
              <label><input id="gender-female" type="radio" name="gender" /><p>\uC5EC</p></label>
            </fieldset>
          </div>
        </div>
      </form>
    `;
        const genderProfile = {
            sections: {
                basicInfo: {
                    gender: '\uB0A8\uC131'
                }
            },
            customFields: []
        };

        const result = applyAutoFillPlan(buildAutoFillPlan(doc, genderProfile));

        expect(result.filled).toEqual([
            expect.objectContaining({ fieldKey: 'basicInfo.gender', label: '\uC131\uBCC4', value: '\uB0A8' })
        ]);
        expect(doc.getElementById('gender-male').checked).toBe(true);
        expect(doc.getElementById('gender-female').checked).toBe(false);
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

    it('EXT-027: narrows copy candidates to visible Midas first-page fields', () => {
        const doc = document.implementation.createHTMLDocument('application');
        doc.body.innerHTML = `
      <form>
        <div class="remix-css-t25awl">
          <div class="remix-css-ke50n9"><p>\uC774\uB984</p></div>
          <div class="remix-css-3btwcy"><input readonly name="basicInfoGroupAnswers.name" /></div>
        </div>
        <div class="remix-css-t25awl">
          <div class="remix-css-ke50n9"><p>\uD578\uB4DC\uD3F0\uBC88\uD638</p></div>
          <div class="remix-css-3btwcy"><input readonly name="basicInfoGroupAnswers.mobilePhone" /></div>
        </div>
        <div class="remix-css-t25awl">
          <div class="remix-css-ke50n9"><p>\uC774\uBA54\uC77C\uC8FC\uC18C</p></div>
          <div class="remix-css-3btwcy"><input readonly name="basicInfoGroupAnswers.email" /></div>
        </div>
        <div class="remix-css-t25awl">
          <div class="remix-css-ke50n9"><p>\uC0DD\uB144\uC6D4\uC77C</p></div>
          <div class="remix-css-3btwcy"><input placeholder="YYYY.MM.DD" /></div>
        </div>
        <div class="remix-css-t25awl">
          <div class="remix-css-ke50n9"><p>\uC131\uBCC4</p></div>
          <div class="remix-css-3btwcy">
            <label><input type="radio" name="gender" /><p>\uB0A8</p></label>
            <label><input type="radio" name="gender" /><p>\uC5EC</p></label>
          </div>
        </div>
        <div class="remix-css-t25awl">
          <div class="remix-css-ke50n9"><p>\uC8FC\uC18C</p></div>
          <div class="remix-css-3btwcy"><input readonly name="addressGroupResumeItemAnswers.currentAddress.address" /></div>
        </div>
        <label>\uC0C1\uC138\uC8FC\uC18C<input /></label>
      </form>
    `;
        const firstPageProfile = {
            sections: {
                basicInfo: {
                    nameKo: '\uBC15\uBBFC\uADDC',
                    phone: '010-5464-9945',
                    email: 'qkralsrb4407@naver.com',
                    birthdate: '2001-03-28',
                    gender: '\uB0A8\uC131',
                    address: '\uD559\uD558\uC11C\uB85C 121\uBC88\uAE38 120',
                    addressDetail: '\uC138\uC885\uBE4C\uB529 302\uD638'
                },
                education: [
                    { schoolName: '\uBD80\uC0B0\uB3D9\uACE0\uB4F1\uD559\uAD50' }
                ],
                projects: [
                    { title: 'EZ-ONE', summary: 'Job application workspace' }
                ]
            },
            customFields: [
                { id: 7, label: 'Portfolio URL', value: 'https://portfolio.example.com' }
            ]
        };

        const preview = previewAutoFillPlan(buildAutoFillPlan(doc, firstPageProfile));
        const candidateKeys = preview.copyCandidates.map((item) => item.key);

        expect(preview.planned).toEqual(expect.arrayContaining([
            expect.objectContaining({ fieldKey: 'basicInfo.birthdate' }),
            expect.objectContaining({ fieldKey: 'basicInfo.gender' }),
            expect.objectContaining({ fieldKey: 'basicInfo.addressDetail' })
        ]));
        expect(preview.failed).toEqual(expect.arrayContaining([
            expect.objectContaining({ fieldKey: 'basicInfo.address', reason: 'disabled_control' })
        ]));
        expect(candidateKeys).toEqual(expect.arrayContaining([
            'basicInfo.nameKo',
            'basicInfo.phone',
            'basicInfo.email',
            'basicInfo.address'
        ]));
        expect(candidateKeys).not.toContain('education.0.schoolName');
        expect(candidateKeys).not.toContain('projects.0.title');
        expect(candidateKeys).not.toContain('customFields.7');
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

    it('EXT-027: keeps address and detail address copyable when an address search dialog detail field is visible', () => {
        const doc = document.implementation.createHTMLDocument('application');
        doc.body.innerHTML = `
      <form>
        <div role="dialog" aria-label="\uC8FC\uC18C\uC785\uB825">
          <input value="\uD559\uD558\uC11C\uB85C 121\uBC88\uAE38 120" readonly />
          <label>\uAE30\uBCF8\uC8FC\uC18C<input readonly value="\uB300\uC804\uAD11\uC5ED\uC2DC \uC720\uC131\uAD6C \uD559\uD558\uC11C\uB85C121\uBC88\uAE38 120" /></label>
          <label>\uC0C1\uC138\uC8FC\uC18C<input id="address-detail" placeholder="\uC0C1\uC138\uC8FC\uC18C\uB97C \uC785\uB825\uD558\uC138\uC694." /></label>
        </div>
      </form>
    `;
        const addressProfile = {
            sections: {
                basicInfo: {
                    address: '\uD559\uD558\uC11C\uB85C 121\uBC88\uAE38 120',
                    addressDetail: '\uC138\uC885\uBE4C\uB529 302\uD638'
                }
            },
            customFields: []
        };

        const preview = previewAutoFillPlan(buildAutoFillPlan(doc, addressProfile));

        expect(preview.planned).toEqual(expect.arrayContaining([
            expect.objectContaining({ fieldKey: 'basicInfo.addressDetail', value: '\uC138\uC885\uBE4C\uB529 302\uD638' })
        ]));
        expect(preview.copyCandidates).toEqual(expect.arrayContaining([
            expect.objectContaining({ key: 'basicInfo.address', value: '\uD559\uD558\uC11C\uB85C 121\uBC88\uAE38 120' }),
            expect.objectContaining({ key: 'basicInfo.addressDetail', value: '\uC138\uC885\uBE4C\uB529 302\uD638' })
        ]));
    });

    it('EXT-013: keeps application source copyable when site select options do not match profile value', () => {
        const doc = document.implementation.createHTMLDocument('application');
        doc.body.innerHTML = `
      <form>
        <label>\uC9C0\uC6D0\uACBD\uB85C
          <select id="application-source">
            <option value="">\uC120\uD0DD</option>
            <option value="employee">\uC9C1\uC6D0\uCD94\uCC9C</option>
          </select>
        </label>
      </form>
    `;
        const sourceProfile = {
            sections: {
                basicInfo: {
                    applicationSource: '\uCC44\uC6A9 \uC0AC\uC774\uD2B8'
                }
            },
            customFields: []
        };

        const result = applyAutoFillPlan(buildAutoFillPlan(doc, sourceProfile));

        expect(result.failed).toEqual(expect.arrayContaining([
            expect.objectContaining({ fieldKey: 'basicInfo.applicationSource', reason: 'select_option_not_found' })
        ]));
        expect(result.copyCandidates).toEqual(expect.arrayContaining([
            expect.objectContaining({ key: 'basicInfo.applicationSource', value: '\uCC44\uC6A9 \uC0AC\uC774\uD2B8' })
        ]));
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

    it('EXT-031: clicks Midas parent choices before filling dependent dropdowns', async () => {
        const doc = document.implementation.createHTMLDocument('application');
        doc.body.innerHTML = `
      <form>
        <div class="remix-css-re11db">
          <div class="remix-css-ke50n9"><p>병역</p></div>
          <div class="remix-css-3btwcy">
            <li><button id="military-none" type="button"><p>비대상</p></button></li>
            <li><button id="military-completed" type="button"><p>군필</p></button></li>
            <li><button type="button"><p>미필</p></button></li>
          </div>
        </div>
        <label>입대일<input id="enlistment-date" /></label>
        <label>제대일<input id="discharge-date" /></label>
        <button id="rank" type="button" aria-haspopup="listbox" disabled><p>계급을 선택해주세요.</p></button>
        <button id="discharge-type" type="button" aria-haspopup="listbox" disabled><p>제대구분을 선택해주세요.</p></button>
        <div class="remix-css-re11db">
          <div class="remix-css-ke50n9"><p>보훈여부</p></div>
          <div class="remix-css-3btwcy">
            <li><button id="veteran-no" type="button"><p>비대상</p></button></li>
            <li><button id="veteran-yes" type="button"><p>대상</p></button></li>
            <button id="veteran-ratio" type="button" aria-haspopup="listbox" disabled><p>보훈비율을 선택해주세요.</p></button>
          </div>
        </div>
      </form>
    `;
        doc.getElementById('military-completed').addEventListener('click', () => {
            doc.getElementById('rank').disabled = false;
            doc.getElementById('discharge-type').disabled = false;
        });
        const openDropdown = (trigger, options) => {
            if (trigger.disabled || doc.getElementById(`${trigger.id}-options`)) return;
            const dropdown = doc.createElement('div');
            dropdown.id = `${trigger.id}-options`;
            dropdown.innerHTML = options.map((option) => `<button type="button">${option}</button>`).join('');
            dropdown.querySelectorAll('button').forEach((optionButton) => {
                optionButton.addEventListener('mousedown', () => {
                    trigger.querySelector('p').textContent = optionButton.textContent.trim();
                    dropdown.remove();
                });
            });
            doc.body.append(dropdown);
        };
        doc.getElementById('rank').addEventListener('mousedown', () => openDropdown(doc.getElementById('rank'), ['이병', '병장']));
        doc.getElementById('discharge-type').addEventListener('mousedown', () => openDropdown(doc.getElementById('discharge-type'), ['만기제대', '소집해제']));
        const militaryProfile = {
            sections: {
                military: {
                    military: [{
                        status: '군필',
                        enlistmentDate: '2023-07-31',
                        dischargeDate: '2025-04-30',
                        rank: '이병',
                        dischargeType: '소집해제',
                        isVeteran: false
                    }]
                }
            },
            customFields: []
        };

        const result = await applyAutoFillPlanAsync(buildAutoFillPlan(doc, militaryProfile));

        expect(result.failed).toEqual([]);
        expect(result.filled).toEqual(expect.arrayContaining([
            expect.objectContaining({ fieldKey: 'military.status', value: '군필' }),
            expect.objectContaining({ fieldKey: 'military.rank', value: '이병' }),
            expect.objectContaining({ fieldKey: 'military.dischargeType', value: '소집해제' }),
            expect.objectContaining({ fieldKey: 'military.isVeteran', value: '비대상' })
        ]));
        expect(doc.getElementById('rank').textContent).toContain('이병');
        expect(doc.getElementById('discharge-type').textContent).toContain('소집해제');
    });

    it('EXT-031: plans and fills military dates that appear after selecting completed service', async () => {
        const doc = document.implementation.createHTMLDocument('application');
        doc.body.innerHTML = `
      <form>
        <div class="remix-css-re11db">
          <div class="remix-css-ke50n9"><p>\uBCD1\uC5ED</p></div>
          <div class="remix-css-3btwcy">
            <li><button id="military-none" type="button"><p>\uBE44\uB300\uC0C1</p></button></li>
            <li><button id="military-completed" type="button"><p>\uAD70\uD544</p></button></li>
          </div>
        </div>
        <div id="military-detail"></div>
      </form>
    `;
        doc.getElementById('military-completed').addEventListener('click', () => {
            if (doc.getElementById('enlistment-date')) return;
            doc.getElementById('military-detail').innerHTML = `
          <label>\uC785\uB300\uC77C<input id="enlistment-date" placeholder="\uC785\uB300\uC77C" /></label>
          <label>\uC81C\uB300\uC77C<input id="discharge-date" placeholder="\uC81C\uB300\uC77C" /></label>
        `;
        });
        const militaryProfile = {
            sections: {
                military: {
                    military: [{
                        status: '\uAD70\uD544',
                        enlistmentDate: '2023-07-31',
                        dischargeDate: '2025-04-30'
                    }]
                }
            },
            customFields: []
        };

        const plan = buildAutoFillPlan(doc, militaryProfile);
        const result = await applyAutoFillPlanAsync(plan);

        expect(plan.fillable).toEqual(expect.arrayContaining([
            expect.objectContaining({ fieldKey: 'military.status', value: '\uAD70\uD544' }),
            expect.objectContaining({ fieldKey: 'military.enlistmentDate', value: '2023-07-31' }),
            expect.objectContaining({ fieldKey: 'military.dischargeDate', value: '2025-04-30' })
        ]));
        expect(result.failed).toEqual([]);
        expect(result.filled).toEqual(expect.arrayContaining([
            expect.objectContaining({ fieldKey: 'military.enlistmentDate', value: '2023-07-31' }),
            expect.objectContaining({ fieldKey: 'military.dischargeDate', value: '2025-04-30' })
        ]));
        expect(doc.getElementById('enlistment-date').value).toBe('2023-07-31');
        expect(doc.getElementById('discharge-date').value).toBe('2025-04-30');
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

    it('EXT-031: opens Midas education sections before filling fields that render later', async () => {
        const doc = document.implementation.createHTMLDocument('application');
        doc.body.innerHTML = `
      <form>
        <div>
          <h5>\uD559\uB825\uC0AC\uD56D</h5>
          <div id="high-school-section">
            <button id="open-high-school" type="button"><p>\uACE0\uB4F1\uD559\uAD50 *</p></button>
          </div>
          <div id="university-section">
            <button id="open-university" type="button"><p>\uB300\uD559\uAD50 *</p></button>
          </div>
        </div>
      </form>
    `;
        doc.getElementById('open-high-school').addEventListener('click', () => {
            if (doc.getElementById('high-school-name')) return;
            doc.getElementById('high-school-section').insertAdjacentHTML('beforeend', `
          <section aria-label="\uACE0\uB4F1\uD559\uAD50">
            <h3>\uACE0\uB4F1\uD559\uAD50</h3>
            <label>\uD559\uAD50\uC815\uBCF4<input id="high-school-name" /></label>
            <label>\uC7AC\uD559\uAE30\uAC04<input id="high-school-start" placeholder="\uC785\uD559\uC77C" /></label>
            <label>\uC7AC\uD559\uAE30\uAC04<input id="high-school-end" placeholder="\uC878\uC5C5\uC77C" /></label>
          </section>
        `);
        });
        doc.getElementById('open-university').addEventListener('click', () => {
            if (doc.getElementById('university-name')) return;
            doc.getElementById('university-section').insertAdjacentHTML('beforeend', `
          <section aria-label="\uB300\uD559\uAD50">
            <h3>\uB300\uD559\uAD50</h3>
            <label>\uD559\uAD50\uC815\uBCF4<input id="university-name" /></label>
            <label>\uC7AC\uD559\uAE30\uAC04<input id="university-start" placeholder="\uC785\uD559\uC77C" /></label>
            <label>\uC7AC\uD559\uAE30\uAC04<input id="university-end" placeholder="\uC878\uC5C5\uC77C" /></label>
            <label>\uD559\uC5C5\uC131\uC801<input id="university-grade" /></label>
          </section>
        `);
        });
        const educationProfile = {
            sections: {
                education: {
                    highSchool: {
                        schoolName: '\uBD80\uC0B0\uB3D9\uACE0\uB4F1\uD559\uAD50',
                        admissionDate: '2017-03-02',
                        graduationDate: '2020-02-28'
                    },
                    universities: [{
                        schoolName: '\uBD80\uC0B0\uB300\uD559\uAD50',
                        admissionDate: '2020-03-02',
                        graduationDate: '2026-02-20',
                        grade: '3.93'
                    }]
                },
                projects: [
                    { title: 'EZ-ONE', summary: 'Job application workspace' }
                ]
            },
            customFields: [
                { id: 7, label: 'Portfolio URL', value: 'https://portfolio.example.com' }
            ]
        };

        const plan = buildAutoFillPlan(doc, educationProfile);
        const preview = previewAutoFillPlan(plan);
        const result = await applyAutoFillPlanAsync(plan);

        expect(preview.planned).toEqual(expect.arrayContaining([
            expect.objectContaining({ fieldKey: 'education.highSchool.open', sectionOpenControl: true }),
            expect.objectContaining({ fieldKey: 'education.highSchool.schoolName' }),
            expect.objectContaining({ fieldKey: 'education.universities.0.open', sectionOpenControl: true }),
            expect.objectContaining({ fieldKey: 'education.universities.0.schoolName' })
        ]));
        expect(preview.copyCandidates.map((item) => item.key)).not.toContain('projects.0.title');
        expect(preview.copyCandidates.map((item) => item.key)).not.toContain('customFields.7');
        expect(result.failed).toEqual([]);
        expect(doc.getElementById('high-school-name').value).toBe('\uBD80\uC0B0\uB3D9\uACE0\uB4F1\uD559\uAD50');
        expect(doc.getElementById('high-school-start').value).toBe('2017.03.02');
        expect(doc.getElementById('high-school-end').value).toBe('2020.02.28');
        expect(doc.getElementById('university-name').value).toBe('\uBD80\uC0B0\uB300\uD559\uAD50');
        expect(doc.getElementById('university-start').value).toBe('2020.03.02');
        expect(doc.getElementById('university-end').value).toBe('2026.02.20');
        expect(doc.getElementById('university-grade').value).toBe('3.93');
    });

    it('EXT-031: selects school autocomplete options for fields created by section openers', async () => {
        const doc = document.implementation.createHTMLDocument('application');
        doc.body.innerHTML = `
      <form>
        <div id="high-school-section">
          <button id="open-high-school" type="button"><p>\uACE0\uB4F1\uD559\uAD50 *</p></button>
        </div>
      </form>
    `;
        doc.getElementById('open-high-school').addEventListener('click', () => {
            if (doc.getElementById('high-school-name')) return;
            doc.getElementById('high-school-section').insertAdjacentHTML('beforeend', `
          <section aria-label="\uACE0\uB4F1\uD559\uAD50">
            <h3>\uACE0\uB4F1\uD559\uAD50</h3>
            <label>\uD559\uAD50\uC815\uBCF4<input id="high-school-name" placeholder="\uD559\uAD50\uBA85\uC744 \uAC80\uC0C9\uD574\uC8FC\uC138\uC694." /></label>
            <div id="high-school-detail"></div>
          </section>
        `);
            doc.getElementById('high-school-name').addEventListener('input', () => {
                if (doc.getElementById('high-school-name-option')) return;
                const option = doc.createElement('button');
                option.id = 'high-school-name-option';
                option.type = 'button';
                option.textContent = '\uBD80\uC0B0\uB3D9\uACE0\uB4F1\uD559\uAD50';
                option.addEventListener('mousedown', () => {
                    doc.getElementById('high-school-name').value = option.textContent;
                    option.remove();
                    doc.getElementById('high-school-detail').innerHTML = `
              <label>\uC878\uC5C5\uC77C<input id="high-school-graduation-date" placeholder="YYYY.MM.DD" /></label>
            `;
                });
                doc.body.append(option);
            });
        });
        const educationProfile = {
            sections: {
                education: {
                    highSchool: {
                        schoolName: '\uBD80\uC0B0\uB3D9\uACE0\uB4F1\uD559\uAD50',
                        graduationDate: '2020-02-28'
                    }
                }
            },
            customFields: []
        };

        const result = await applyAutoFillPlanAsync(buildAutoFillPlan(doc, educationProfile));
        expect(result.failed).toEqual([]);
        expect(doc.getElementById('high-school-name-option')).toBeNull();
        expect(doc.getElementById('high-school-name').value).toBe('\uBD80\uC0B0\uB3D9\uACE0\uB4F1\uD559\uAD50');
        expect(doc.getElementById('high-school-graduation-date').value).toBe('2020.02.28');
    });

    it('EXT-031: waits long enough to select delayed school autocomplete options before period fields render', async () => {
        const doc = document.implementation.createHTMLDocument('application');
        doc.body.innerHTML = `
      <form>
        <section aria-label="\uB300\uD559\uAD50">
          <h3>\uB300\uD559\uAD50</h3>
          <label>\uD559\uAD50\uC815\uBCF4<input id="university-name" placeholder="\uD559\uAD50\uBA85\uC744 \uAC80\uC0C9\uD574\uC8FC\uC138\uC694." /></label>
          <div id="university-detail"></div>
        </section>
      </form>
    `;
        doc.getElementById('university-name').addEventListener('input', () => {
            if (doc.getElementById('university-name-option')) return;
            setTimeout(() => {
                const option = doc.createElement('div');
                option.id = 'university-name-option';
                option.setAttribute('role', 'option');
                option.setAttribute('tabindex', '0');
                option.textContent = '\uBD80\uC0B0\uB300\uD559\uAD50';
                option.addEventListener('mousedown', () => {
                    doc.getElementById('university-name').value = option.textContent;
                    option.remove();
                    doc.getElementById('university-detail').innerHTML = `
              <div class="period-row">
                <p>\uC7AC\uD559\uAE30\uAC04 *</p>
                <span>\uC785\uD559\uC77C</span>
                <input id="university-start" placeholder="YYYY.MM.DD" />
                <span>\uC878\uC5C5\uC77C</span>
                <input id="university-end" placeholder="YYYY.MM.DD" />
              </div>
              <p>\uC804\uACF5 *</p>
              <button id="add-major" type="button"><p>\uCD94\uAC00\uD558\uAE30</p></button>
              <div id="major-container"></div>
            `;
                    doc.getElementById('add-major').addEventListener('click', () => {
                        if (doc.getElementById('university-major')) return;
                        doc.getElementById('major-container').innerHTML = `
                  <label>\uC804\uACF5\uBA85<input id="university-major" placeholder="\uC804\uACF5\uBA85\uC744 \uAC80\uC0C9\uD574\uC8FC\uC138\uC694." /></label>
                `;
                    });
                });
                doc.body.append(option);
            }, 1100);
        });
        const educationProfile = {
            sections: {
                education: {
                    universities: [{
                        schoolName: '\uBD80\uC0B0\uB300\uD559\uAD50',
                        admissionDate: '2020-03-02',
                        graduationDate: '2026-02-20',
                        majors: [{
                            major: '\uC0B0\uC5C5\uACF5\uD559\uACFC'
                        }]
                    }]
                }
            },
            customFields: []
        };

        const result = await applyAutoFillPlanAsync(buildAutoFillPlan(doc, educationProfile));

        expect(result.failed).toEqual([]);
        expect(doc.getElementById('university-name-option')).toBeNull();
        expect(doc.getElementById('university-start').value).toBe('2020.03.02');
        expect(doc.getElementById('university-end').value).toBe('2026.02.20');
        expect(doc.getElementById('university-major').value).toBe('\uC0B0\uC5C5\uACF5\uD559\uACFC');
    });

    it('EXT-031: does not open major rows as a duplicate side effect when they are already planned', async () => {
        const doc = document.implementation.createHTMLDocument('application');
        doc.body.innerHTML = `
      <form>
        <section aria-label="\uB300\uD559\uAD50">
          <h3>\uB300\uD559\uAD50</h3>
          <label>\uD559\uAD50\uC815\uBCF4<input id="university-name" placeholder="\uD559\uAD50\uBA85\uC744 \uAC80\uC0C9\uD574\uC8FC\uC138\uC694." /></label>
          <label>\uC7AC\uD559\uAE30\uAC04 <input id="university-start" placeholder="\uC785\uD559\uC77C" /></label>
          <div class="remix-css-re11db">
            <div class="remix-css-ke50n9"><p>\uC804\uACF5</p><span>*</span></div>
            <div class="remix-css-3btwcy">
              <button id="add-major" type="button">\uCD94\uAC00\uD558\uAE30</button>
            </div>
          </div>
          <div id="major-container"></div>
        </section>
      </form>
    `;
        const schoolInput = doc.getElementById('university-name');
        schoolInput.addEventListener('input', () => {
            if (doc.getElementById('university-name-option')) return;
            const option = doc.createElement('button');
            option.id = 'university-name-option';
            option.type = 'button';
            option.textContent = '\uBD80\uC0B0\uB300\uD559\uAD50';
            option.addEventListener('mousedown', () => {
                schoolInput.value = option.textContent;
                option.remove();
            });
            doc.body.append(option);
        });
        doc.getElementById('add-major').addEventListener('click', () => {
            doc.getElementById('major-container').innerHTML = '<input id="university-major" placeholder="\uC804\uACF5\uBA85\uC744 \uAC80\uC0C9\uD574\uC8FC\uC138\uC694." />';
        });
        const educationProfile = {
            sections: {
                education: {
                    universities: [{
                        schoolName: '\uBD80\uC0B0\uB300\uD559\uAD50',
                        admissionDate: '2020-03-02',
                        majors: [{
                            major: '\uC0B0\uC5C5\uACF5\uD559\uACFC'
                        }]
                    }]
                }
            },
            customFields: []
        };

        const plan = buildAutoFillPlan(doc, educationProfile);
        const schoolNameItem = plan.fillable.find((item) => item.fieldKey === 'education.universities.0.schoolName');
        const result = await applyAutoFillPlanAsync({
            fillable: schoolNameItem ? [schoolNameItem] : [],
            failed: [],
            skipped: [],
            copyCandidates: []
        });

        expect(result.failed).toEqual([]);
        expect(doc.getElementById('university-name').value).toBe('\uBD80\uC0B0\uB300\uD559\uAD50');
        expect(doc.getElementById('university-start').value).toBe('');
        expect(doc.getElementById('university-major')).toBeNull();
    });

    it('EXT-031: still clicks delayed Midas school autocomplete result when date fields are already ready', async () => {
        const doc = document.implementation.createHTMLDocument('application');
        doc.body.innerHTML = `
      <form>
        <section aria-label="\uB300\uD559\uAD50">
          <h3>\uB300\uD559\uAD50</h3>
          <label>\uD559\uAD50\uC815\uBCF4
            <div class="ats-inline-flex ats-flex-col ats-relative ats-group">
              <input id="university-school" placeholder="\uD559\uAD50\uBA85\uC744 \uAC80\uC0C9\uD574\uC8FC\uC138\uC694." />
            </div>
          </label>
          <label>\uC7AC\uD559\uAE30\uAC04 <input id="university-start" placeholder="\uC785\uD559\uC77C" /></label>
          <label>\uC7AC\uD559\uAE30\uAC04 <input id="university-end" placeholder="\uC878\uC5C5\uC77C" /></label>
        </section>
      </form>
    `;
        let schoolOptionClicked = false;
        const schoolInput = doc.getElementById('university-school');
        schoolInput.addEventListener('input', () => {
            setTimeout(() => {
                if (doc.getElementById('university-school-option')) return;
                const option = doc.createElement('button');
                option.id = 'university-school-option';
                option.type = 'button';
                option.textContent = '\uBD80\uC0B0\uB300\uD559\uAD50';
                option.addEventListener('mousedown', () => {
                    schoolOptionClicked = true;
                    schoolInput.value = option.textContent;
                    option.remove();
                });
                doc.body.append(option);
            }, 120);
        });
        const educationProfile = {
            sections: {
                education: {
                    universities: [{
                        schoolName: '\uBD80\uC0B0\uB300\uD559\uAD50',
                        admissionDate: '2020-03-02',
                        graduationDate: '2026-02-20'
                    }]
                }
            },
            customFields: []
        };

        const result = await applyAutoFillPlanAsync(buildAutoFillPlan(doc, educationProfile));

        expect(result.failed).toEqual([]);
        expect(schoolOptionClicked).toBe(true);
        expect(doc.getElementById('university-school').value).toBe('\uBD80\uC0B0\uB300\uD559\uAD50');
        expect(doc.getElementById('university-start').value).toBe('2020.03.02');
        expect(doc.getElementById('university-end').value).toBe('2026.02.20');
    });

    it('EXT-031: moves on quickly after high school autocomplete when no related controls are visible yet', async () => {
        const doc = document.implementation.createHTMLDocument('application');
        doc.body.innerHTML = `
      <form>
        <section aria-label="\uACE0\uB4F1\uD559\uAD50">
          <h3>\uACE0\uB4F1\uD559\uAD50</h3>
          <label>\uD559\uAD50\uC815\uBCF4
            <div class="ats-inline-flex ats-flex-col ats-relative ats-group">
              <input id="high-school-name" placeholder="\uD559\uAD50\uBA85\uC744 \uAC80\uC0C9\uD574\uC8FC\uC138\uC694." />
            </div>
          </label>
        </section>
        <section aria-label="\uB300\uD559\uAD50">
          <h3>\uB300\uD559\uAD50</h3>
          <label>\uD559\uC5C5\uC131\uC801<input id="university-grade" /></label>
        </section>
      </form>
    `;
        const highSchoolInput = doc.getElementById('high-school-name');
        highSchoolInput.addEventListener('input', () => {
            if (doc.getElementById('high-school-option')) return;
            const option = doc.createElement('button');
            option.id = 'high-school-option';
            option.type = 'button';
            option.textContent = '\uBD80\uC0B0\uB3D9\uACE0\uB4F1\uD559\uAD50';
            option.addEventListener('mousedown', () => {
                highSchoolInput.value = option.textContent;
                option.remove();
            });
            doc.body.append(option);
        });
        const educationProfile = {
            sections: {
                education: {
                    highSchool: {
                        schoolName: '\uBD80\uC0B0\uB3D9\uACE0\uB4F1\uD559\uAD50',
                        graduationDate: '2020-02-28'
                    },
                    universities: [{
                        grade: '3.93'
                    }]
                }
            },
            customFields: []
        };

        const startedAt = Date.now();
        const result = await applyAutoFillPlanAsync(buildAutoFillPlan(doc, educationProfile));
        const elapsedMs = Date.now() - startedAt;

        expect(doc.getElementById('high-school-name').value).toBe('\uBD80\uC0B0\uB3D9\uACE0\uB4F1\uD559\uAD50');
        expect(doc.getElementById('university-grade').value).toBe('3.93');
        expect(result.failed).toEqual([]);
        expect(elapsedMs).toBeLessThan(1500);
    });

    it('EXT-031: moves on quickly after university autocomplete when multiple related controls stay hidden', async () => {
        const doc = document.implementation.createHTMLDocument('application');
        doc.body.innerHTML = `
      <form>
        <section aria-label="\uB300\uD559\uAD50">
          <h3>\uB300\uD559\uAD50</h3>
          <label>\uD559\uAD50\uC815\uBCF4
            <div class="ats-inline-flex ats-flex-col ats-relative ats-group">
              <input id="university-name" placeholder="\uD559\uAD50\uBA85\uC744 \uAC80\uC0C9\uD574\uC8FC\uC138\uC694." />
            </div>
          </label>
          <label>\uD559\uC5C5\uC131\uC801<input id="university-grade" /></label>
        </section>
      </form>
    `;
        const universityInput = doc.getElementById('university-name');
        universityInput.addEventListener('input', () => {
            if (doc.getElementById('university-option')) return;
            const option = doc.createElement('button');
            option.id = 'university-option';
            option.type = 'button';
            option.textContent = '\uBD80\uC0B0\uB300\uD559\uAD50';
            option.addEventListener('mousedown', () => {
                universityInput.value = option.textContent;
                option.remove();
            });
            doc.body.append(option);
        });
        const educationProfile = {
            sections: {
                education: {
                    universities: [{
                        schoolName: '\uBD80\uC0B0\uB300\uD559\uAD50',
                        location: '\uBD80\uC0B0',
                        campusType: '\uBCF8\uAD50',
                        graduationStatus: '\uC878\uC5C5',
                        grade: '3.93'
                    }]
                }
            },
            customFields: []
        };

        const startedAt = Date.now();
        const result = await applyAutoFillPlanAsync(buildAutoFillPlan(doc, educationProfile));
        const elapsedMs = Date.now() - startedAt;

        expect(doc.getElementById('university-name').value).toBe('\uBD80\uC0B0\uB300\uD559\uAD50');
        expect(doc.getElementById('university-grade').value).toBe('3.93');
        expect(result.filled).toEqual(expect.arrayContaining([
            expect.objectContaining({ fieldKey: 'education.universities.0.schoolName' }),
            expect.objectContaining({ fieldKey: 'education.universities.0.grade' })
        ]));
        expect(elapsedMs).toBeLessThan(1000);
    });

    it('EXT-031: reuses repeated document form scans while building a plan', () => {
        const doc = document.implementation.createHTMLDocument('application');
        doc.body.innerHTML = `
      <form>
        <section aria-label="\uB300\uD559\uAD50">
          <h3>\uB300\uD559\uAD50</h3>
          ${Array.from({ length: 30 }, (_, index) => `<label>\uC784\uC2DC${index}<input id="tmp-${index}" /></label>`).join('')}
          <label>\uD559\uAD50\uC815\uBCF4<input id="school" placeholder="\uD559\uAD50\uBA85\uC744 \uAC80\uC0C9\uD574\uC8FC\uC138\uC694." /></label>
          <button type="button">\uC878\uC5C5</button>
          <button type="button" aria-haspopup="listbox"><p>\uD559\uAD50 \uC18C\uC7AC\uC9C0\uB97C \uC120\uD0DD\uD574\uC8FC\uC138\uC694.</p></button>
          <button type="button">+ \uCD94\uAC00\uD558\uAE30</button>
        </section>
      </form>
    `;
        let documentQueryCount = 0;
        const originalQuerySelectorAll = doc.querySelectorAll.bind(doc);
        doc.querySelectorAll = (...args) => {
            documentQueryCount += 1;
            return originalQuerySelectorAll(...args);
        };
        const educationProfile = {
            sections: {
                education: {
                    universities: [{
                        schoolName: '\uBD80\uC0B0\uB300\uD559\uAD50',
                        location: '\uBD80\uC0B0',
                        graduationStatus: '\uC878\uC5C5'
                    }]
                }
            },
            customFields: []
        };

        buildAutoFillPlan(doc, educationProfile);

        expect(documentQueryCount).toBeLessThan(8);
    });

    it('EXT-031: fills Midas education period, school location, grade scale, credits, and added major fields', async () => {
        const doc = document.implementation.createHTMLDocument('application');
        doc.body.innerHTML = `
      <form>
        <section aria-label="\uACE0\uB4F1\uD559\uAD50">
          <h3>\uACE0\uB4F1\uD559\uAD50</h3>
          <div class="period-row">
            <p>\uC7AC\uD559\uAE30\uAC04 *</p>
            <span>\uC785\uD559\uC77C</span>
            <input id="high-school-start" placeholder="YYYY.MM.DD" />
            <span>\uC878\uC5C5\uC77C</span>
            <input id="high-school-end" placeholder="YYYY.MM.DD" />
          </div>
        </section>
        <section aria-label="\uB300\uD559\uAD50">
          <h3>\uB300\uD559\uAD50</h3>
          <p>\uD559\uAD50\uC815\uBCF4</p>
          <button id="university-location" type="button" aria-haspopup="listbox"><p>\uD559\uAD50 \uC18C\uC7AC\uC9C0\uB97C \uC120\uD0DD\uD574\uC8FC\uC138\uC694.</p></button>
          <div class="period-row">
            <p>\uC7AC\uD559\uAE30\uAC04 *</p>
            <span>\uC785\uD559\uC77C</span>
            <input id="university-start" placeholder="YYYY.MM.DD" />
            <span>\uC878\uC5C5\uC77C</span>
            <input id="university-end" placeholder="YYYY.MM.DD" />
          </div>
          <p>\uD559\uC5C5\uC131\uC801 *</p>
          <input id="university-grade" />
          <span>/</span>
          <button id="university-grade-scale" type="button" aria-haspopup="listbox"><p>\uB9CC\uC810\uAE30\uC900</p></button>
          <p>\uC774\uC218\uD559\uC810 *</p>
          <input id="university-credits" />
          <p>\uC804\uACF5 *</p>
          <button id="add-major" type="button"><p>\uCD94\uAC00\uD558\uAE30</p></button>
          <div id="major-container"></div>
        </section>
      </form>
    `;
        const clickedMajorChoices = [];
        const addSelectBehavior = (trigger, options) => {
            trigger.addEventListener('mousedown', () => {
                if (doc.getElementById(`${trigger.id}-options`)) return;
                const menu = doc.createElement('div');
                menu.id = `${trigger.id}-options`;
                menu.innerHTML = options.map((option) => `<button type="button"><p>${option}</p></button>`).join('');
                menu.querySelectorAll('button').forEach((optionButton) => {
                    optionButton.addEventListener('mousedown', () => {
                        trigger.querySelector('p').textContent = optionButton.textContent.trim();
                        menu.remove();
                    });
                });
                doc.body.append(menu);
            });
        };
        addSelectBehavior(doc.getElementById('university-location'), ['\uC11C\uC6B8', '\uBD80\uC0B0']);
        addSelectBehavior(doc.getElementById('university-grade-scale'), ['4.3', '4.5']);
        let majorRowCount = 0;
        doc.getElementById('add-major').addEventListener('click', () => {
            const majorIndex = majorRowCount;
            majorRowCount += 1;
            doc.getElementById('major-container').insertAdjacentHTML('beforeend', `
              <div class="major-row">
              <label>\uC804\uACF5\uBA85<input id="university-major-${majorIndex}" /></label>
              <div>
                <p>\uC804\uACF5\uAD6C\uBD84</p>
                <button type="button" data-choice="majorType">\uC8FC\uC804\uACF5</button>
                <button type="button" data-choice="majorType">\uC5F0\uACC4\uC804\uACF5</button>
                <button type="button" data-choice="majorType">\uBCF5\uC218\uC804\uACF5</button>
              </div>
              <button id="university-major-category-${majorIndex}" type="button" aria-haspopup="listbox"><p>\uC804\uACF5\uACC4\uC5F4\uC744 \uC120\uD0DD\uD574\uC8FC\uC138\uC694.</p></button>
              <div>
                <p>\uC8FC\uAC04/\uC57C\uAC04</p>
                <button type="button" data-choice="dayNight">\uC8FC\uAC04</button>
                <button type="button" data-choice="dayNight">\uC57C\uAC04</button>
              </div>
              </div>
            `);
            addSelectBehavior(doc.getElementById(`university-major-category-${majorIndex}`), [
                '\uACF5\uD559\uACC4\uC5F4(\uC0B0\uC5C5)',
                '\uACF5\uD559\uACC4\uC5F4(\uCEF4\uD4E8\uD130\u00B7\uD1B5\uC2E0)'
            ]);
            doc.querySelectorAll(`#major-container .major-row:nth-child(${majorIndex + 1}) button[data-choice]`).forEach((button) => {
                button.addEventListener('click', () => clickedMajorChoices.push(button.textContent.trim()));
            });
        });
        const educationProfile = {
            sections: {
                education: {
                    highSchool: {
                        admissionDate: '2017-03-02',
                        graduationDate: '2020-02-28'
                    },
                    universities: [{
                        schoolName: '\uBD80\uC0B0\uB300\uD559\uAD50',
                        admissionDate: '2020-03-02',
                        graduationDate: '2026-02-20',
                        location: '\uBD80\uC0B0',
                        grade: '3.93',
                        gradeScale: '4.5',
                        completedCredits: '149',
                        majors: [{
                            major: '\uAE30\uACC4\uACF5\uD559',
                            majorType: '\uC8FC\uC804\uACF5',
                            majorCategory: '\uACF5\uD559\uACC4\uC5F4(\uC0B0\uC5C5)',
                            dayNight: '\uC8FC\uAC04'
                        }, {
                            major: '\uBE45\uB370\uC774\uD130\uC5F0\uACC4\uC804\uACF5',
                            majorType: '\uC5F0\uACC4\uC804\uACF5',
                            majorCategory: '\uACF5\uD559\uACC4\uC5F4(\uCEF4\uD4E8\uD130\u00B7\uD1B5\uC2E0)',
                            dayNight: '\uC8FC\uAC04'
                        }]
                    }]
                }
            },
            customFields: []
        };

        const result = await applyAutoFillPlanAsync(buildAutoFillPlan(doc, educationProfile));

        expect(result.failed).toEqual([]);
        expect(doc.getElementById('high-school-start').value).toBe('2017.03.02');
        expect(doc.getElementById('high-school-end').value).toBe('2020.02.28');
        expect(doc.getElementById('university-location').textContent).toContain('\uBD80\uC0B0');
        expect(doc.getElementById('university-start').value).toBe('2020.03.02');
        expect(doc.getElementById('university-end').value).toBe('2026.02.20');
        expect(doc.getElementById('university-grade').value).toBe('3.93');
        expect(doc.getElementById('university-grade-scale').textContent).toContain('4.5');
        expect(doc.getElementById('university-credits').value).toBe('149');
        expect(doc.getElementById('university-major-0').value).toBe('\uAE30\uACC4\uACF5\uD559');
        expect(doc.getElementById('university-major-category-0').textContent).toContain('\uACF5\uD559\uACC4\uC5F4(\uC0B0\uC5C5)');
        expect(doc.getElementById('university-major-1').value).toBe('\uBE45\uB370\uC774\uD130\uC5F0\uACC4\uC804\uACF5');
        expect(doc.getElementById('university-major-category-1').textContent).toContain('\uACF5\uD559\uACC4\uC5F4(\uCEF4\uD4E8\uD130\u00B7\uD1B5\uC2E0)');
        expect(clickedMajorChoices).toEqual(['\uC8FC\uC804\uACF5', '\uC8FC\uAC04', '\uC5F0\uACC4\uC804\uACF5', '\uC8FC\uAC04']);
    }, 10000);

    it('EXT-031: maps Midas education period start and end inputs by row order', () => {
        const doc = document.implementation.createHTMLDocument('application');
        doc.body.innerHTML = `
      <form>
        <div class="remix-css-1iyoj2o">
          <div class="remix-css-uf1ume"><p>- \uACE0\uB4F1\uD559\uAD50 *</p></div>
          <div class="remix-css-t25awl">
            <div class="remix-css-ke50n9"><p>\uC7AC\uD559\uAE30\uAC04</p><span>*</span></div>
            <div class="remix-css-3btwcy">
              <div class="period-control"><span>\uC785\uD559\uC77C</span><input id="high-school-start" placeholder="\uC785\uD559\uC77C" /></div>
              <div class="period-control"><span>\uC878\uC5C5\uC77C</span><input id="high-school-end" placeholder="\uC878\uC5C5\uC77C" /></div>
            </div>
          </div>
        </div>
        <div class="remix-css-1iyoj2o">
          <div class="remix-css-uf1ume"><p>- \uB300\uD559\uAD50 *</p></div>
          <div class="remix-css-t25awl">
            <div class="remix-css-ke50n9"><p>\uC7AC\uD559\uAE30\uAC04</p><span>*</span></div>
            <div class="remix-css-3btwcy">
              <div class="period-control"><span>\uC785\uD559\uC77C</span><input id="university-start" placeholder="\uC785\uD559\uC77C" /></div>
              <div class="period-control"><span>\uC878\uC5C5\uC77C</span><input id="university-end" placeholder="\uC878\uC5C5\uC77C" /></div>
            </div>
          </div>
        </div>
      </form>
    `;
        const educationProfile = {
            sections: {
                education: {
                    highSchool: {
                        entranceDate: '2017-03-02',
                        graduationDate: '2020-02-28'
                    },
                    universities: [{
                        entranceDate: '2020-03-02',
                        graduationDate: '2026-02-20'
                    }]
                }
            },
            customFields: []
        };

        const preview = previewAutoFillPlan(buildAutoFillPlan(doc, educationProfile));

        expect(preview.failed).toEqual([]);
        expect(preview.planned).toEqual(expect.arrayContaining([
            expect.objectContaining({ fieldKey: 'education.highSchool.admissionDate', value: '2017.03.02' }),
            expect.objectContaining({ fieldKey: 'education.highSchool.graduationDate', value: '2020.02.28' }),
            expect.objectContaining({ fieldKey: 'education.universities.0.admissionDate', value: '2020.03.02' }),
            expect.objectContaining({ fieldKey: 'education.universities.0.graduationDate', value: '2026.02.20' })
        ]));
    });

    it('EXT-031: formats Midas Korean education period placeholders with dotted dates', async () => {
        const doc = document.implementation.createHTMLDocument('application');
        doc.body.innerHTML = `
      <form>
        <div class="remix-css-1iyoj2o">
          <div class="remix-css-uf1ume"><p>- \uACE0\uB4F1\uD559\uAD50 *</p></div>
          <div class="remix-css-t25awl">
            <div class="remix-css-ke50n9"><p>\uC7AC\uD559\uAE30\uAC04</p><span>*</span></div>
            <div class="remix-css-3btwcy">
              <div class="period-control"><input id="high-school-start" placeholder="\uC785\uD559\uC77C" /></div>
              <div class="period-control"><input id="high-school-end" placeholder="\uC878\uC5C5\uC77C" /></div>
            </div>
          </div>
        </div>
      </form>
    `;
        const educationProfile = {
            sections: {
                education: {
                    highSchool: {
                        entranceDate: '2017-03-02',
                        graduationDate: '2020-02-28'
                    }
                }
            },
            customFields: []
        };

        const result = await applyAutoFillPlanAsync(buildAutoFillPlan(doc, educationProfile));

        expect(result.failed).toEqual([]);
        expect(doc.getElementById('high-school-start').value).toBe('2017.03.02');
        expect(doc.getElementById('high-school-end').value).toBe('2020.02.28');
    });

    it('EXT-031: maps Midas education period inputs without inline date labels by section order', () => {
        const doc = document.implementation.createHTMLDocument('application');
        doc.body.innerHTML = `
      <form>
        <div class="remix-css-1iyoj2o">
          <div class="remix-css-uf1ume"><p>- \uACE0\uB4F1\uD559\uAD50 </p></div>
          <div class="remix-css-re11db">
            <div class="remix-css-ke50n9"><p>\uC7AC\uD559\uAE30\uAC04</p><span>*</span></div>
            <div class="remix-css-3btwcy">
              <div><div><input id="period-start-0" placeholder="\uC785\uD559\uC77C" /></div></div>
              <div><div><input id="period-end-0" placeholder="\uC878\uC5C5\uC77C" /></div></div>
            </div>
          </div>
        </div>
        <div class="remix-css-1iyoj2o">
          <div class="remix-css-uf1ume"><p>- \uB300\uD559\uAD50 </p></div>
          <div class="remix-css-re11db">
            <div class="remix-css-ke50n9"><p>\uC7AC\uD559\uAE30\uAC04</p><span>*</span></div>
            <div class="remix-css-3btwcy">
              <div><div><input id="period-start-1" placeholder="\uC785\uD559\uC77C" /></div></div>
              <div><div><input id="period-end-1" placeholder="\uC878\uC5C5\uC77C" /></div></div>
            </div>
          </div>
        </div>
      </form>
    `;
        const educationProfile = {
            sections: {
                education: {
                    highSchool: {
                        entranceDate: '2017-03-02',
                        graduationDate: '2020-02-28'
                    },
                    universities: [{
                        entranceDate: '2020-03-02',
                        graduationDate: '2026-02-20'
                    }]
                }
            },
            customFields: []
        };

        const preview = previewAutoFillPlan(buildAutoFillPlan(doc, educationProfile));

        expect(preview.failed).toEqual([]);
        expect(preview.planned).toEqual(expect.arrayContaining([
            expect.objectContaining({ fieldKey: 'education.highSchool.admissionDate', value: '2017.03.02' }),
            expect.objectContaining({ fieldKey: 'education.highSchool.graduationDate', value: '2020.02.28' }),
            expect.objectContaining({ fieldKey: 'education.universities.0.admissionDate', value: '2020.03.02' }),
            expect.objectContaining({ fieldKey: 'education.universities.0.graduationDate', value: '2026.02.20' })
        ]));
    });

    it('EXT-031: does not refill education fields already handled after school autocomplete', async () => {
        const doc = document.implementation.createHTMLDocument('application');
        doc.body.innerHTML = `
      <form>
        <div id="high-school-section">
          <button id="open-high-school" type="button"><p>\uACE0\uB4F1\uD559\uAD50 *</p></button>
        </div>
      </form>
    `;
        let graduationDateInputCount = 0;
        doc.getElementById('open-high-school').addEventListener('click', () => {
            if (doc.getElementById('high-school-name')) return;
            doc.getElementById('high-school-section').insertAdjacentHTML('beforeend', `
          <section aria-label="\uACE0\uB4F1\uD559\uAD50">
            <label>\uD559\uAD50\uC815\uBCF4<input id="high-school-name" placeholder="\uD559\uAD50\uBA85\uC744 \uAC80\uC0C9\uD574\uC8FC\uC138\uC694." /></label>
            <div id="high-school-detail"></div>
          </section>
        `);
            doc.getElementById('high-school-name').addEventListener('input', () => {
                if (doc.getElementById('high-school-name-option')) return;
                const option = doc.createElement('button');
                option.id = 'high-school-name-option';
                option.type = 'button';
                option.textContent = '\uBD80\uC0B0\uB3D9\uACE0\uB4F1\uD559\uAD50';
                option.addEventListener('mousedown', () => {
                    doc.getElementById('high-school-name').value = option.textContent;
                    option.remove();
                    doc.getElementById('high-school-detail').innerHTML = `
                <label>\uC878\uC5C5\uC77C<input id="high-school-graduation-date" placeholder="YYYY.MM.DD" /></label>
              `;
                    doc.getElementById('high-school-graduation-date').addEventListener('input', () => {
                        graduationDateInputCount += 1;
                    });
                });
                doc.body.append(option);
            });
        });
        const educationProfile = {
            sections: {
                education: {
                    highSchool: {
                        schoolName: '\uBD80\uC0B0\uB3D9\uACE0\uB4F1\uD559\uAD50',
                        graduationDate: '2020-02-28'
                    }
                }
            },
            customFields: []
        };

        const result = await applyAutoFillPlanAsync(buildAutoFillPlan(doc, educationProfile));

        expect(result.failed).toEqual([]);
        expect(doc.getElementById('high-school-graduation-date').value).toBe('2020.02.28');
        expect(graduationDateInputCount).toBe(1);
    });

    it('EXT-031: fills newly opened Midas education dates and select fields in one run', async () => {
        const doc = document.implementation.createHTMLDocument('application');
        doc.body.innerHTML = `
      <form>
        <div id="high-school-section">
          <button id="open-high-school" type="button"><p>\uACE0\uB4F1\uD559\uAD50 *</p></button>
        </div>
        <div id="university-section">
          <button id="open-university" type="button"><p>\uB300\uD559\uAD50 *</p></button>
        </div>
      </form>
    `;
        const addSelectBehavior = (trigger, options) => {
            trigger.addEventListener('mousedown', () => {
                if (doc.getElementById(`${trigger.id}-options`)) return;
                const menu = doc.createElement('div');
                menu.id = `${trigger.id}-options`;
                menu.innerHTML = options.map((option) => `<button type="button"><p>${option}</p></button>`).join('');
                menu.querySelectorAll('button').forEach((optionButton) => {
                    optionButton.addEventListener('mousedown', () => {
                        trigger.querySelector('p').textContent = optionButton.textContent.trim();
                        menu.remove();
                    });
                });
                doc.body.append(menu);
            });
        };
        doc.getElementById('open-high-school').addEventListener('click', () => {
            if (doc.getElementById('high-school-graduation-date')) return;
            doc.getElementById('high-school-section').insertAdjacentHTML('beforeend', `
          <section aria-label="\uACE0\uB4F1\uD559\uAD50">
            <h3>\uACE0\uB4F1\uD559\uAD50</h3>
            <label>\uC878\uC5C5\uC77C<input id="high-school-graduation-date" name="highSchoolGroupAnswers.graduationDate" placeholder="YYYY.MM.DD" /></label>
            <button id="high-school-graduation-status" type="button" aria-haspopup="listbox"><p>\uC878\uC5C5\uAD6C\uBD84\uC744 \uC120\uD0DD\uD574\uC8FC\uC138\uC694.</p></button>
            <button id="high-school-location" type="button" aria-haspopup="listbox"><p>\uD559\uAD50 \uC18C\uC7AC\uC9C0\uB97C \uC120\uD0DD\uD574\uC8FC\uC138\uC694.</p></button>
          </section>
        `);
            addSelectBehavior(doc.getElementById('high-school-graduation-status'), ['\uC878\uC5C5', '\uC878\uC5C5\uC608\uC815']);
            addSelectBehavior(doc.getElementById('high-school-location'), ['\uC11C\uC6B8', '\uBD80\uC0B0']);
        });
        doc.getElementById('open-university').addEventListener('click', () => {
            if (doc.getElementById('university-graduation-date')) return;
            doc.getElementById('university-section').insertAdjacentHTML('beforeend', `
          <section aria-label="\uB300\uD559\uAD50">
            <h3>\uB300\uD559\uAD50</h3>
            <label>\uC878\uC5C5\uC77C<input id="university-graduation-date" name="collegeGroupAnswers.0.graduationDate" placeholder="YYYY.MM.DD" /></label>
            <button id="university-graduation-status" type="button" aria-haspopup="listbox"><p>\uC878\uC5C5\uAD6C\uBD84\uC744 \uC120\uD0DD\uD574\uC8FC\uC138\uC694.</p></button>
            <button id="university-degree-type" type="button" aria-haspopup="listbox"><p>\uD559\uC704\uAD6C\uBD84\uC744 \uC120\uD0DD\uD574\uC8FC\uC138\uC694.</p></button>
            <button id="university-location" type="button" aria-haspopup="listbox"><p>\uD559\uAD50 \uC18C\uC7AC\uC9C0\uB97C \uC120\uD0DD\uD574\uC8FC\uC138\uC694.</p></button>
            <button id="university-campus-type" type="button" aria-haspopup="listbox"><p>\uBCF8\uAD50/\uBD84\uAD50\uB97C \uC120\uD0DD\uD574\uC8FC\uC138\uC694.</p></button>
          </section>
        `);
            addSelectBehavior(doc.getElementById('university-graduation-status'), ['\uC878\uC5C5', '\uC878\uC5C5\uC608\uC815']);
            addSelectBehavior(doc.getElementById('university-degree-type'), ['\uD559\uC0AC', '\uC11D\uC0AC']);
            addSelectBehavior(doc.getElementById('university-location'), ['\uC11C\uC6B8', '\uBD80\uC0B0']);
            addSelectBehavior(doc.getElementById('university-campus-type'), ['\uBCF8\uAD50', '\uBD84\uAD50']);
        });
        const educationProfile = {
            sections: {
                education: {
                    highSchool: {
                        graduationDate: '2020-02-28',
                        graduationStatus: '\uC878\uC5C5',
                        location: '\uBD80\uC0B0'
                    },
                    universities: [{
                        graduationDate: '2026-02-20',
                        graduationStatus: '\uC878\uC5C5',
                        degreeType: '\uD559\uC0AC',
                        location: '\uBD80\uC0B0',
                        campusType: '\uBCF8\uAD50'
                    }]
                }
            },
            customFields: []
        };

        const result = await applyAutoFillPlanAsync(buildAutoFillPlan(doc, educationProfile));

        expect(result.failed).toEqual([]);
        expect(doc.getElementById('high-school-graduation-date').value).toBe('2020.02.28');
        expect(doc.getElementById('high-school-graduation-status').textContent).toContain('\uC878\uC5C5');
        expect(doc.getElementById('high-school-location').textContent).toContain('\uBD80\uC0B0');
        expect(doc.getElementById('university-graduation-date').value).toBe('2026.02.20');
        expect(doc.getElementById('university-graduation-status').textContent).toContain('\uC878\uC5C5');
        expect(doc.getElementById('university-degree-type').textContent).toContain('\uD559\uC0AC');
        expect(doc.getElementById('university-location').textContent).toContain('\uBD80\uC0B0');
        expect(doc.getElementById('university-campus-type').textContent).toContain('\uBCF8\uAD50');
    });

    it('EXT-031: recognizes Midas segmented education choice groups with outer labels', async () => {
        const doc = document.implementation.createHTMLDocument('application');
        doc.body.innerHTML = `
      <form>
        <section aria-label="\uACE0\uB4F1\uD559\uAD50">
          <h3>\uACE0\uB4F1\uD559\uAD50</h3>
          <div class="remix-css-re11db">
            <div class="remix-css-ke50n9"><p>\uC878\uC5C5\uAD6C\uBD84</p></div>
            <div class="remix-css-3btwcy">
              <div class="remix-css-19nvx8u">
                <li><button type="button">\uC878\uC5C5</button></li>
                <li><button type="button">\uC878\uC5C5\uC608\uC815</button></li>
                <li><button type="button">\uC911\uD1F4</button></li>
              </div>
            </div>
          </div>
        </section>
        <section aria-label="\uB300\uD559\uAD50">
          <h3>\uB300\uD559\uAD50</h3>
          <div class="remix-css-re11db">
            <div class="remix-css-ke50n9"><p>\uD559\uC704\uAD6C\uBD84</p></div>
            <div class="remix-css-3btwcy">
              <div class="remix-css-19nvx8u">
                <li><button type="button">\uD559\uC0AC</button></li>
                <li><button type="button">\uC804\uBB38\uD559\uC0AC</button></li>
              </div>
            </div>
          </div>
          <div class="remix-css-re11db">
            <div class="remix-css-ke50n9"><p>\uD559\uAD50\uC815\uBCF4</p></div>
            <div class="remix-css-3btwcy">
              <div class="remix-css-19nvx8u">
                <li><button type="button">\uBCF8\uAD50</button></li>
                <li><button type="button">\uBD84\uAD50</button></li>
              </div>
            </div>
          </div>
          <div class="remix-css-re11db">
            <div class="remix-css-ke50n9"><p>\uC878\uC5C5\uAD6C\uBD84</p></div>
            <div class="remix-css-3btwcy">
              <div class="remix-css-19nvx8u">
                <li><button type="button">\uC878\uC5C5</button></li>
                <li><button type="button">\uC878\uC5C5\uC608\uC815</button></li>
                <li><button type="button">\uC218\uB8CC</button></li>
              </div>
            </div>
          </div>
        </section>
      </form>
    `;
        const clicked = [];
        doc.querySelectorAll('button').forEach((button) => {
            button.addEventListener('click', () => clicked.push(button.textContent.trim()));
        });
        const educationProfile = {
            sections: {
                education: {
                    highSchool: {
                        graduationStatus: '\uC878\uC5C5'
                    },
                    universities: [{
                        graduationStatus: '\uC878\uC5C5',
                        degreeType: '\uD559\uC0AC',
                        campusType: '\uBCF8\uAD50'
                    }]
                }
            },
            customFields: []
        };

        const preview = previewAutoFillPlan(buildAutoFillPlan(doc, educationProfile));
        const result = await applyAutoFillPlanAsync(buildAutoFillPlan(doc, educationProfile));

        expect(preview.failed).toEqual([]);
        expect(preview.planned).toEqual(expect.arrayContaining([
            expect.objectContaining({ fieldKey: 'education.highSchool.graduationStatus', value: '\uC878\uC5C5' }),
            expect.objectContaining({ fieldKey: 'education.universities.0.degreeType', value: '\uD559\uC0AC' }),
            expect.objectContaining({ fieldKey: 'education.universities.0.campusType', value: '\uBCF8\uAD50' }),
            expect.objectContaining({ fieldKey: 'education.universities.0.graduationStatus', value: '\uC878\uC5C5' })
        ]));
        expect(result.failed).toEqual([]);
        expect(clicked).toEqual(expect.arrayContaining(['\uC878\uC5C5', '\uD559\uC0AC', '\uBCF8\uAD50']));
        expect(clicked.filter((value) => value === '\uC878\uC5C5')).toHaveLength(2);
        expect(clicked).toHaveLength(4);
    });

    it('EXT-031: selects Midas custom select options rendered as plain menu rows', async () => {
        const doc = document.implementation.createHTMLDocument('application');
        doc.body.innerHTML = `
      <form>
        <section aria-label="\uACE0\uB4F1\uD559\uAD50">
          <p>\uD559\uAD50\uC815\uBCF4</p>
          <button id="high-school-location" type="button" aria-haspopup="listbox"><p>\uD559\uAD50 \uC18C\uC7AC\uC9C0\uB97C \uC120\uD0DD\uD574\uC8FC\uC138\uC694.</p></button>
        </section>
      </form>
    `;
        const trigger = doc.getElementById('high-school-location');
        trigger.addEventListener('mousedown', () => {
            if (doc.getElementById('location-menu')) return;
            const menu = doc.createElement('div');
            menu.id = 'location-menu';
            menu.innerHTML = ['\uC120\uD0DD\uC548\uD568', '\uC11C\uC6B8', '\uBD80\uC0B0', '\uB300\uAD6C'].map((option) => (
                `<div class="menu-row"><p>${option}</p></div>`
            )).join('');
            menu.querySelectorAll('.menu-row').forEach((optionRow) => {
                optionRow.addEventListener('mousedown', () => {
                    trigger.querySelector('p').textContent = optionRow.textContent.trim();
                    menu.remove();
                });
            });
            doc.body.append(menu);
        });
        const educationProfile = {
            sections: {
                education: {
                    highSchool: {
                        location: '\uBD80\uC0B0'
                    }
                }
            },
            customFields: []
        };

        const result = await applyAutoFillPlanAsync(buildAutoFillPlan(doc, educationProfile));

        expect(result.failed).toEqual([]);
        expect(doc.getElementById('high-school-location').textContent).toContain('\uBD80\uC0B0');
        expect(doc.getElementById('location-menu')).toBeNull();
    });

    it('EXT-031: ignores stale major-name autocomplete options while selecting department and major categories', async () => {
        const doc = document.implementation.createHTMLDocument('application');
        doc.body.innerHTML = `
      <form>
        <section aria-label="\uB300\uD559\uAD50">
          <h3>\uB300\uD559\uAD50</h3>
          <div class="department-row">
            <p>\uD559\uACFC\uACC4\uC5F4 *</p>
            <button id="department-category" type="button" aria-haspopup="listbox"><p>\uD559\uACFC\uACC4\uC5F4\uC744 \uC120\uD0DD\uD574\uC8FC\uC138\uC694.</p></button>
          </div>
          <p>\uC804\uACF5 *</p>
          <div class="major-row">
            <div class="ats-inline-flex ats-flex-col ats-relative ats-group">
              <input id="major-name" placeholder="\uC804\uACF5\uBA85\uC744 \uAC80\uC0C9\uD574\uC8FC\uC138\uC694." value="\uC0B0\uC5C5\uACF5\uD559\uACFC" />
              <div id="dropdown-body">
                <button id="stale-major-option" type="button">\uC0B0\uC5C5\uACF5\uD559\uACFC</button>
              </div>
            </div>
            <button id="major-category" type="button" aria-haspopup="listbox"><p>\uC804\uACF5\uACC4\uC5F4\uC744 \uC120\uD0DD\uD574\uC8FC\uC138\uC694.</p></button>
          </div>
        </section>
      </form>
    `;
        const openMenu = (trigger, options) => {
            trigger.addEventListener('mousedown', () => {
                if (doc.getElementById(`${trigger.id}-menu`)) return;
                const menu = doc.createElement('div');
                menu.id = `${trigger.id}-menu`;
                menu.innerHTML = `
          <div id="design-system-scroll-container">
            ${options.map((option) => `<button type="button"><p>${option}</p></button>`).join('')}
          </div>
        `;
                menu.querySelectorAll('button').forEach((optionButton) => {
                    optionButton.addEventListener('mousedown', () => {
                        trigger.querySelector('p').textContent = optionButton.textContent.trim();
                        menu.remove();
                    });
                });
                doc.body.append(menu);
            });
        };
        openMenu(doc.getElementById('department-category'), ['\uC778\uBB38', '\uACF5\uD559']);
        openMenu(doc.getElementById('major-category'), ['\uACF5\uD559\uACC4\uC5F4(\uC0B0\uC5C5)', '\uACF5\uD559\uACC4\uC5F4(\uCEF4\uD4E8\uD130\u00B7\uD1B5\uC2E0)']);
        const educationProfile = {
            sections: {
                education: {
                    universities: [{
                        majorCategory: '\uACF5\uD559',
                        majors: [{
                            major: '\uC0B0\uC5C5\uACF5\uD559\uACFC',
                            majorCategory: '\uACF5\uD559\uACC4\uC5F4(\uC0B0\uC5C5)'
                        }]
                    }]
                }
            },
            customFields: []
        };

        const result = await applyAutoFillPlanAsync(buildAutoFillPlan(doc, educationProfile));

        expect(result.failed).toEqual([]);
        expect(doc.getElementById('department-category').textContent).toContain('\uACF5\uD559');
        expect(doc.getElementById('department-category').textContent).not.toContain('\uC0B0\uC5C5\uACF5\uD559\uACFC');
        expect(doc.getElementById('major-category').textContent).toContain('\uACF5\uD559\uACC4\uC5F4(\uC0B0\uC5C5)');
    });

    it('EXT-031: does not partially match a major-name autocomplete option as the university department category', async () => {
        const doc = document.implementation.createHTMLDocument('application');
        doc.body.innerHTML = `
      <form>
        <section aria-label="\uB300\uD559\uAD50">
          <h3>\uB300\uD559\uAD50</h3>
          <div class="department-row">
            <p>\uD559\uACFC\uACC4\uC5F4 *</p>
            <button id="department-category" type="button" aria-haspopup="listbox"><p>\uD559\uACFC\uACC4\uC5F4\uC744 \uC120\uD0DD\uD574\uC8FC\uC138\uC694.</p></button>
          </div>
          <p>\uC804\uACF5 *</p>
          <div class="major-row">
            <div class="ats-inline-flex ats-flex-col ats-relative ats-group">
              <input id="major-name" placeholder="\uC804\uACF5\uBA85\uC744 \uAC80\uC0C9\uD574\uC8FC\uC138\uC694." value="\uC0B0\uC5C5\uACF5\uD559\uACFC" />
              <div id="dropdown-body">
                <button id="stale-major-option" type="button">\uC0B0\uC5C5\uACF5\uD559\uACFC</button>
              </div>
            </div>
          </div>
        </section>
      </form>
    `;
        doc.getElementById('department-category').addEventListener('mousedown', () => {
            const menu = doc.createElement('div');
            menu.id = 'department-category-menu';
            menu.innerHTML = '<div id="design-system-scroll-container"><button type="button"><p>\uC778\uBB38</p></button></div>';
            doc.body.append(menu);
        });
        const educationProfile = {
            sections: {
                education: {
                    universities: [{
                        majorCategory: '\uACF5\uD559',
                        majors: [{ major: '\uC0B0\uC5C5\uACF5\uD559\uACFC' }]
                    }]
                }
            },
            customFields: []
        };

        const result = await applyAutoFillPlanAsync(buildAutoFillPlan(doc, educationProfile));

        expect(doc.getElementById('department-category').textContent).toContain('\uD559\uACFC\uACC4\uC5F4\uC744 \uC120\uD0DD\uD574\uC8FC\uC138\uC694.');
        expect(doc.getElementById('department-category').textContent).not.toContain('\uC0B0\uC5C5\uACF5\uD559\uACFC');
        expect(result.filled).not.toEqual(expect.arrayContaining([
            expect.objectContaining({ fieldKey: 'education.universities.0.majorCategory', value: '\uC0B0\uC5C5\uACF5\uD559\uACFC' })
        ]));
    });

    it('EXT-031: searches inside Midas design-system custom select menus before choosing major category', async () => {
        const doc = document.implementation.createHTMLDocument('application');
        doc.body.innerHTML = `
      <form>
        <section aria-label="\uB300\uD559\uAD50">
          <h3>\uB300\uD559\uAD50</h3>
          <div class="major-row">
            <label>\uC804\uACF5\uBA85<input id="major-name" value="\uC0B0\uC5C5\uACF5\uD559\uACFC" /></label>
            <button id="major-category" type="button"><p>\uC804\uACF5\uACC4\uC5F4\uC744 \uC120\uD0DD\uD574\uC8FC\uC138\uC694.</p></button>
          </div>
        </section>
      </form>
    `;
        const trigger = doc.getElementById('major-category');
        trigger.addEventListener('mousedown', () => {
            if (doc.getElementById('design-system-scroll-container')) return;
            const menu = doc.createElement('div');
            menu.id = 'design-system-scroll-container';
            menu.innerHTML = `
          <div>
            <input id="major-category-search" type="text" value="" />
            <ul>
              <li><button type="button" value="\uC120\uD0DD\uC548\uD568_\uC635\uC158"><p>\uC120\uD0DD\uC548\uD568</p></button></li>
            </ul>
          </div>
        `;
            const search = menu.querySelector('#major-category-search');
            search.addEventListener('input', () => {
                const list = menu.querySelector('ul');
                list.innerHTML = search.value.includes('\uC0B0\uC5C5')
                    ? '<li><button id="industrial-option" type="button" value="119"><p>\uACF5\uD559\uACC4\uC5F4(\uC0B0\uC5C5)</p></button></li>'
                    : '<li><button type="button" value="\uC120\uD0DD\uC548\uD568_\uC635\uC158"><p>\uC120\uD0DD\uC548\uD568</p></button></li>';
                list.querySelectorAll('button').forEach((button) => {
                    button.addEventListener('mousedown', () => {
                        trigger.querySelector('p').textContent = button.textContent.trim();
                        menu.remove();
                    });
                });
            });
            doc.body.append(menu);
        });
        const educationProfile = {
            sections: {
                education: {
                    universities: [{
                        majors: [{
                            major: '\uC0B0\uC5C5\uACF5\uD559\uACFC',
                            majorCategory: '\uACF5\uD559\uACC4\uC5F4(\uC0B0\uC5C5)'
                        }]
                    }]
                }
            },
            customFields: []
        };

        const result = await applyAutoFillPlanAsync(buildAutoFillPlan(doc, educationProfile));

        expect(result.failed).toEqual([]);
        expect(doc.getElementById('major-category').textContent).toContain('\uACF5\uD559\uACC4\uC5F4(\uC0B0\uC5C5)');
        expect(doc.getElementById('design-system-scroll-container')).toBeNull();
    });

    it('EXT-031: fills nested Midas major categories instead of the university department category', async () => {
        const doc = document.implementation.createHTMLDocument('application');
        doc.body.innerHTML = `
      <form>
        <section aria-label="\uB300\uD559\uAD50">
          <h3>\uB300\uD559\uAD50</h3>
          <div class="department-row">
            <p>\uD559\uACFC\uACC4\uC5F4</p>
            <button id="university-major-category" type="button"><p>\uD559\uACFC\uACC4\uC5F4\uC744 \uC120\uD0DD\uD574\uC8FC\uC138\uC694.</p></button>
          </div>
          <p>\uC804\uACF5 *</p>
          <div class="major-row" data-row="0">
            <div class="remix-css-zezw7x"><p>\uBE45\uB370\uC774\uD130</p></div>
            <div class="major-types">
              <button type="button">\uC8FC\uC804\uACF5</button>
              <button type="button">\uC5F0\uACC4\uC804\uACF5</button>
            </div>
            <button id="major-category-0" type="button"><p>\uC804\uACF5\uACC4\uC5F4\uC744 \uC120\uD0DD\uD574\uC8FC\uC138\uC694.</p></button>
            <div class="major-day-night">
              <button type="button">\uC8FC\uAC04</button>
              <button type="button">\uC57C\uAC04</button>
            </div>
          </div>
          <div class="major-row" data-row="1">
            <div class="remix-css-zezw7x"><p>\uC0B0\uC5C5\uACF5\uD559\uACFC</p></div>
            <div class="major-types">
              <button type="button">\uC8FC\uC804\uACF5</button>
              <button type="button">\uC5F0\uACC4\uC804\uACF5</button>
            </div>
            <button id="major-category-1" type="button"><p>\uC804\uACF5\uACC4\uC5F4\uC744 \uC120\uD0DD\uD574\uC8FC\uC138\uC694.</p></button>
            <div class="major-day-night">
              <button type="button">\uC8FC\uAC04</button>
              <button type="button">\uC57C\uAC04</button>
            </div>
          </div>
        </section>
      </form>
    `;
        doc.querySelectorAll('#university-major-category, #major-category-0, #major-category-1').forEach((trigger) => {
            trigger.addEventListener('mousedown', () => {
                if (doc.getElementById('major-category-menu')) return;
                const menu = doc.createElement('div');
                menu.id = 'major-category-menu';
                menu.innerHTML = `
            <div id="design-system-scroll-container">
              <button type="button" value="118"><p>\uACF5\uD559\uACC4\uC5F4(\uCEF4\uD4E8\uD130\u00B7\uD1B5\uC2E0)</p></button>
              <button type="button" value="119"><p>\uACF5\uD559\uACC4\uC5F4(\uC0B0\uC5C5)</p></button>
            </div>
          `;
                menu.querySelectorAll('button').forEach((option) => {
                    option.addEventListener('mousedown', () => {
                        trigger.querySelector('p').textContent = option.textContent.trim();
                        menu.remove();
                    });
                });
                doc.body.append(menu);
            });
        });
        const educationProfile = {
            sections: {
                education: {
                    universities: [{
                        majorCategory: '\uACF5\uD559',
                        majors: [{
                            major: '\uBE45\uB370\uC774\uD130',
                            majorCategory: '\uACF5\uD559\uACC4\uC5F4(\uCEF4\uD4E8\uD130\u00B7\uD1B5\uC2E0)'
                        }, {
                            major: '\uC0B0\uC5C5\uACF5\uD559\uACFC',
                            majorCategory: '\uACF5\uD559\uACC4\uC5F4(\uC0B0\uC5C5)'
                        }]
                    }]
                }
            },
            customFields: []
        };

        const result = await applyAutoFillPlanAsync(buildAutoFillPlan(doc, educationProfile));

        expect(result.failed).toEqual([]);
        expect(doc.getElementById('university-major-category').textContent).toContain('\uACF5\uD559');
        expect(doc.getElementById('major-category-0').textContent).toContain('\uACF5\uD559\uACC4\uC5F4(\uCEF4\uD4E8\uD130\u00B7\uD1B5\uC2E0)');
        expect(doc.getElementById('major-category-1').textContent).toContain('\uACF5\uD559\uACC4\uC5F4(\uC0B0\uC5C5)');
    });

    it('EXT-031: does not let university department controls shift Midas major row indexes', async () => {
        const doc = document.implementation.createHTMLDocument('application');
        doc.body.innerHTML = `
      <form>
        <section aria-label="\uB300\uD559\uAD50">
          <h3>\uB300\uD559\uAD50</h3>
          <div class="university-detail-wrapper">
            <div class="department-row">
              <p>\uD559\uACFC\uACC4\uC5F4</p>
              <button id="university-major-category" type="button"><p>\uD559\uACFC\uACC4\uC5F4\uC744 \uC120\uD0DD\uD574\uC8FC\uC138\uC694.</p></button>
            </div>
            <p>\uC804\uACF5 *</p>
            <div class="major-row" data-row="0">
              <div class="ats-inline-flex ats-flex-col ats-relative ats-group">
                <input id="major-name-0" placeholder="\uC804\uACF5\uBA85\uC744 \uAC80\uC0C9\uD574\uC8FC\uC138\uC694." />
              </div>
              <div class="major-types">
                <button type="button" data-row="0">\uC8FC\uC804\uACF5</button>
                <button type="button" data-row="0">\uC5F0\uACC4\uC804\uACF5</button>
              </div>
              <button id="major-category-0" type="button"><p>\uC804\uACF5\uACC4\uC5F4\uC744 \uC120\uD0DD\uD574\uC8FC\uC138\uC694.</p></button>
              <div class="major-day-night">
                <button type="button" data-row="0">\uC8FC\uAC04</button>
                <button type="button" data-row="0">\uC57C\uAC04</button>
              </div>
            </div>
            <div class="major-row" data-row="1">
              <div class="ats-inline-flex ats-flex-col ats-relative ats-group">
                <input id="major-name-1" placeholder="\uC804\uACF5\uBA85\uC744 \uAC80\uC0C9\uD574\uC8FC\uC138\uC694." />
              </div>
              <div class="major-types">
                <button type="button" data-row="1">\uC8FC\uC804\uACF5</button>
                <button type="button" data-row="1">\uC5F0\uACC4\uC804\uACF5</button>
              </div>
              <button id="major-category-1" type="button"><p>\uC804\uACF5\uACC4\uC5F4\uC744 \uC120\uD0DD\uD574\uC8FC\uC138\uC694.</p></button>
              <div class="major-day-night">
                <button type="button" data-row="1">\uC8FC\uAC04</button>
                <button type="button" data-row="1">\uC57C\uAC04</button>
              </div>
            </div>
          </div>
        </section>
      </form>
    `;
        const clicked = [];
        doc.querySelectorAll('input').forEach((input) => {
            input.addEventListener('input', () => {
                if (doc.getElementById(`${input.id}-option`)) return;
                const option = doc.createElement('button');
                option.id = `${input.id}-option`;
                option.type = 'button';
                option.textContent = input.value;
                option.addEventListener('mousedown', () => {
                    input.value = option.textContent;
                    option.remove();
                });
                input.parentElement.append(option);
            });
        });
        doc.querySelectorAll('button[data-row]').forEach((button) => {
            button.addEventListener('click', () => clicked.push(`${button.dataset.row}:${button.textContent.trim()}`));
        });
        doc.querySelectorAll('#university-major-category, #major-category-0, #major-category-1').forEach((trigger) => {
            trigger.addEventListener('mousedown', () => {
                if (doc.getElementById('major-category-menu')) return;
                const menu = doc.createElement('div');
                menu.id = 'major-category-menu';
                menu.innerHTML = `
            <div id="design-system-scroll-container">
              <button type="button"><p>\uACF5\uD559</p></button>
              <button type="button"><p>\uACF5\uD559\uACC4\uC5F4(\uCEF4\uD4E8\uD130\u00B7\uD1B5\uC2E0)</p></button>
              <button type="button"><p>\uACF5\uD559\uACC4\uC5F4(\uC0B0\uC5C5)</p></button>
            </div>
          `;
                menu.querySelectorAll('button').forEach((option) => {
                    option.addEventListener('mousedown', () => {
                        trigger.querySelector('p').textContent = option.textContent.trim();
                        menu.remove();
                    });
                });
                doc.body.append(menu);
            });
        });
        const educationProfile = {
            sections: {
                education: {
                    universities: [{
                        majorCategory: '\uACF5\uD559',
                        majors: [{
                            major: '\uBE45\uB370\uC774\uD130',
                            majorType: '\uC5F0\uACC4\uC804\uACF5',
                            majorCategory: '\uACF5\uD559\uACC4\uC5F4(\uCEF4\uD4E8\uD130\u00B7\uD1B5\uC2E0)',
                            dayNight: '\uC8FC\uAC04'
                        }, {
                            major: '\uC0B0\uC5C5\uACF5\uD559\uACFC',
                            majorType: '\uC8FC\uC804\uACF5',
                            majorCategory: '\uACF5\uD559\uACC4\uC5F4(\uC0B0\uC5C5)',
                            dayNight: '\uC8FC\uAC04'
                        }]
                    }]
                }
            },
            customFields: []
        };

        const result = await applyAutoFillPlanAsync(buildAutoFillPlan(doc, educationProfile));

        expect(result.failed).toEqual([]);
        expect(doc.getElementById('university-major-category').textContent).toContain('\uACF5\uD559');
        expect(doc.getElementById('major-name-0').value).toBe('\uC0B0\uC5C5\uACF5\uD559\uACFC');
        expect(doc.getElementById('major-category-0').textContent).toContain('\uACF5\uD559\uACC4\uC5F4(\uC0B0\uC5C5)');
        expect(doc.getElementById('major-name-1').value).toBe('\uBE45\uB370\uC774\uD130');
        expect(doc.getElementById('major-category-1').textContent).toContain('\uACF5\uD559\uACC4\uC5F4(\uCEF4\uD4E8\uD130\u00B7\uD1B5\uC2E0)');
        expect(clicked).toEqual(expect.arrayContaining(['0:\uC8FC\uC804\uACF5', '0:\uC8FC\uAC04', '1:\uC5F0\uACC4\uC804\uACF5', '1:\uC8FC\uAC04']));
    });

    it('EXT-031: infers detailed Midas major categories from broad engineering values and the major name', async () => {
        const doc = document.implementation.createHTMLDocument('application');
        doc.body.innerHTML = `
      <form>
        <section aria-label="\uB300\uD559\uAD50">
          <h3>\uB300\uD559\uAD50</h3>
          <p>\uC804\uACF5 *</p>
          <div class="major-row">
            <div class="remix-css-zezw7x"><p>\uC0B0\uC5C5\uACF5\uD559\uACFC</p></div>
            <button id="major-category-0" type="button"><p>\uC804\uACF5\uACC4\uC5F4\uC744 \uC120\uD0DD\uD574\uC8FC\uC138\uC694.</p></button>
            <div class="major-day-night">
              <button type="button">\uC8FC\uAC04</button>
              <button type="button">\uC57C\uAC04</button>
            </div>
          </div>
        </section>
      </form>
    `;
        const trigger = doc.getElementById('major-category-0');
        trigger.addEventListener('mousedown', () => {
            if (doc.getElementById('major-category-menu')) return;
            const menu = doc.createElement('div');
            menu.id = 'major-category-menu';
            menu.innerHTML = `
          <div id="design-system-scroll-container">
            <button type="button"><p>\uACF5\uD559\uACC4\uC5F4(\uAC74\uCD95)</p></button>
            <button type="button"><p>\uACF5\uD559\uACC4\uC5F4(\uC0B0\uC5C5)</p></button>
          </div>
        `;
            menu.querySelectorAll('button').forEach((option) => {
                option.addEventListener('mousedown', () => {
                    trigger.querySelector('p').textContent = option.textContent.trim();
                    menu.remove();
                });
            });
            doc.body.append(menu);
        });
        const educationProfile = {
            sections: {
                education: {
                    universities: [{
                        majors: [{
                            major: '\uC0B0\uC5C5\uACF5\uD559\uACFC',
                            majorCategory: '\uACF5\uD559'
                        }]
                    }]
                }
            },
            customFields: []
        };

        const result = await applyAutoFillPlanAsync(buildAutoFillPlan(doc, educationProfile));

        expect(result.failed).toEqual([]);
        expect(trigger.textContent).toContain('\uACF5\uD559\uACC4\uC5F4(\uC0B0\uC5C5)');
    });

    it('EXT-031: selects Midas major type after major category so rerenders keep the primary major', async () => {
        const doc = document.implementation.createHTMLDocument('application');
        doc.body.innerHTML = `
      <form>
        <section aria-label="\uB300\uD559\uAD50">
          <h3>\uB300\uD559\uAD50</h3>
          <p>\uC804\uACF5 *</p>
          <div class="major-row">
            <div class="remix-css-zezw7x"><p>\uC0B0\uC5C5\uACF5\uD559\uACFC</p></div>
            <div class="major-types">
              <button id="primary-major" type="button">\uC8FC\uC804\uACF5</button>
              <button type="button">\uC5F0\uACC4\uC804\uACF5</button>
            </div>
            <button id="major-category-0" type="button"><p>\uC804\uACF5\uACC4\uC5F4\uC744 \uC120\uD0DD\uD574\uC8FC\uC138\uC694.</p></button>
            <div class="major-day-night">
              <button type="button">\uC8FC\uAC04</button>
              <button type="button">\uC57C\uAC04</button>
            </div>
          </div>
        </section>
      </form>
    `;
        let selectedMajorType = null;
        doc.querySelectorAll('.major-types button').forEach((button) => {
            button.addEventListener('click', () => {
                selectedMajorType = button.textContent.trim();
            });
        });
        const trigger = doc.getElementById('major-category-0');
        trigger.addEventListener('mousedown', () => {
            if (doc.getElementById('major-category-menu')) return;
            const menu = doc.createElement('div');
            menu.id = 'major-category-menu';
            menu.innerHTML = `
          <div id="design-system-scroll-container">
            <button type="button"><p>\uACF5\uD559\uACC4\uC5F4(\uC0B0\uC5C5)</p></button>
          </div>
        `;
            menu.querySelector('button').addEventListener('mousedown', () => {
                selectedMajorType = null;
                trigger.querySelector('p').textContent = '\uACF5\uD559\uACC4\uC5F4(\uC0B0\uC5C5)';
                menu.remove();
            });
            doc.body.append(menu);
        });
        const educationProfile = {
            sections: {
                education: {
                    universities: [{
                        majors: [{
                            major: '\uC0B0\uC5C5\uACF5\uD559\uACFC',
                            majorType: '\uC8FC\uC804\uACF5',
                            majorCategory: '\uACF5\uD559\uACC4\uC5F4(\uC0B0\uC5C5)',
                            dayNight: '\uC8FC\uAC04'
                        }]
                    }]
                }
            },
            customFields: []
        };

        const result = await applyAutoFillPlanAsync(buildAutoFillPlan(doc, educationProfile));

        expect(result.failed).toEqual([]);
        expect(trigger.textContent).toContain('\uACF5\uD559\uACC4\uC5F4(\uC0B0\uC5C5)');
        expect(selectedMajorType).toBe('\uC8FC\uC804\uACF5');
    });

    it('EXT-031: adds a second Midas major row before filling linked major details', async () => {
        const doc = document.implementation.createHTMLDocument('application');
        doc.body.innerHTML = `
      <form>
        <section aria-label="\uB300\uD559\uAD50">
          <h3>\uB300\uD559\uAD50</h3>
          <p>\uC804\uACF5 *</p>
          <div id="major-container">
            <div class="major-row" data-row="0">
              <div class="ats-inline-flex ats-flex-col ats-relative ats-group">
                <input id="major-name-0" placeholder="\uC804\uACF5\uBA85\uC744 \uAC80\uC0C9\uD574\uC8FC\uC138\uC694." />
              </div>
              <div class="major-types">
                <button type="button" data-row="0">\uC8FC\uC804\uACF5</button>
                <button type="button" data-row="0">\uC5F0\uACC4\uC804\uACF5</button>
              </div>
              <button id="major-category-0" type="button"><p>\uC804\uACF5\uACC4\uC5F4\uC744 \uC120\uD0DD\uD574\uC8FC\uC138\uC694.</p></button>
              <div class="major-day-night">
                <button type="button" data-row="0">\uC8FC\uAC04</button>
                <button type="button" data-row="0">\uC57C\uAC04</button>
              </div>
            </div>
          </div>
          <button id="add-major" type="button">+ \uCD94\uAC00\uD558\uAE30</button>
        </section>
      </form>
    `;
        const selectedTypes = {};
        const installRowBehavior = (row) => {
            const input = row.querySelector('input');
            input.addEventListener('input', () => {
                if (row.querySelector(`#${input.id}-option`)) return;
                const option = doc.createElement('button');
                option.id = `${input.id}-option`;
                option.type = 'button';
                option.textContent = input.value;
                option.addEventListener('mousedown', () => {
                    input.value = option.textContent;
                    option.remove();
                });
                input.parentElement.append(option);
            });
            row.querySelectorAll('.major-types button').forEach((button) => {
                button.addEventListener('click', () => {
                    selectedTypes[row.dataset.row] = button.textContent.trim();
                });
            });
            const category = row.querySelector('[id^="major-category-"]');
            category.addEventListener('mousedown', () => {
                if (doc.getElementById('major-category-menu')) return;
                const menu = doc.createElement('div');
                menu.id = 'major-category-menu';
                menu.innerHTML = `
            <div id="design-system-scroll-container">
              <button type="button"><p>\uACF5\uD559\uACC4\uC5F4(\uC0B0\uC5C5)</p></button>
              <button type="button"><p>\uACF5\uD559\uACC4\uC5F4(\uCEF4\uD4E8\uD130\u00B7\uD1B5\uC2E0)</p></button>
            </div>
          `;
                menu.querySelectorAll('button').forEach((option) => {
                    option.addEventListener('mousedown', () => {
                        category.querySelector('p').textContent = option.textContent.trim();
                        menu.remove();
                    });
                });
                doc.body.append(menu);
            });
        };
        installRowBehavior(doc.querySelector('.major-row'));
        doc.getElementById('add-major').addEventListener('click', () => {
            const index = doc.querySelectorAll('.major-row').length;
            doc.getElementById('major-container').insertAdjacentHTML('beforeend', `
          <div class="major-row" data-row="${index}">
            <div class="ats-inline-flex ats-flex-col ats-relative ats-group">
              <input id="major-name-${index}" placeholder="\uC804\uACF5\uBA85\uC744 \uAC80\uC0C9\uD574\uC8FC\uC138\uC694." />
            </div>
            <div class="major-types">
              <button type="button" data-row="${index}">\uC8FC\uC804\uACF5</button>
              <button type="button" data-row="${index}">\uC5F0\uACC4\uC804\uACF5</button>
            </div>
            <button id="major-category-${index}" type="button"><p>\uC804\uACF5\uACC4\uC5F4\uC744 \uC120\uD0DD\uD574\uC8FC\uC138\uC694.</p></button>
            <div class="major-day-night">
              <button type="button" data-row="${index}">\uC8FC\uAC04</button>
              <button type="button" data-row="${index}">\uC57C\uAC04</button>
            </div>
          </div>
        `);
            installRowBehavior(doc.querySelectorAll('.major-row')[index]);
        });
        const educationProfile = {
            sections: {
                education: {
                    universities: [{
                        majors: [{
                            major: '\uBE45\uB370\uC774\uD130',
                            majorType: '\uC5F0\uACC4\uC804\uACF5',
                            majorCategory: '\uACF5',
                            dayNight: '\uC8FC\uAC04'
                        }, {
                            major: '\uC0B0\uC5C5\uACF5\uD559\uACFC',
                            majorType: '\uC8FC\uC804\uACF5',
                            majorCategory: '\uACF5',
                            dayNight: '\uC8FC\uAC04'
                        }]
                    }]
                }
            },
            customFields: []
        };

        const result = await applyAutoFillPlanAsync(buildAutoFillPlan(doc, educationProfile));

        expect(result.failed).toEqual([]);
        expect(doc.querySelectorAll('.major-row').length).toBeGreaterThanOrEqual(2);
        expect(doc.getElementById('major-name-0').value).toBe('\uC0B0\uC5C5\uACF5\uD559\uACFC');
        expect(doc.getElementById('major-category-0').textContent).toContain('\uACF5\uD559\uACC4\uC5F4(\uC0B0\uC5C5)');
        expect(selectedTypes[0]).toBe('\uC8FC\uC804\uACF5');
        expect(doc.getElementById('major-name-1').value).toBe('\uBE45\uB370\uC774\uD130');
        expect(doc.getElementById('major-category-1').textContent).toContain('\uACF5\uD559\uACC4\uC5F4(\uCEF4\uD4E8\uD130\u00B7\uD1B5\uC2E0)');
        expect(selectedTypes[1]).toBe('\uC5F0\uACC4\uC804\uACF5');
    });

    it('EXT-031: clicks a plain add button below existing Midas major rows', async () => {
        const doc = document.implementation.createHTMLDocument('application');
        doc.body.innerHTML = `
      <form>
        <section aria-label="\uB300\uD559\uAD50">
          <h3>\uB300\uD559\uAD50</h3>
          <div id="major-container">
            <div class="major-row" data-row="0">
              <div class="ats-inline-flex ats-flex-col ats-relative ats-group">
                <input id="major-name-0" placeholder="\uC804\uACF5\uBA85\uC744 \uAC80\uC0C9\uD574\uC8FC\uC138\uC694." />
              </div>
              <button type="button" data-row="0">\uC8FC\uC804\uACF5</button>
            </div>
          </div>
          <div><button id="plain-add-major" type="button">+ \uCD94\uAC00\uD558\uAE30</button></div>
        </section>
      </form>
    `;
        let addClicked = false;
        const installAutocomplete = (row) => {
            const input = row.querySelector('input');
            input.addEventListener('input', () => {
                if (row.querySelector(`#${input.id}-option`)) return;
                const option = doc.createElement('button');
                option.id = `${input.id}-option`;
                option.type = 'button';
                option.textContent = input.value;
                option.addEventListener('mousedown', () => {
                    input.value = option.textContent;
                    option.remove();
                });
                input.parentElement.append(option);
            });
        };
        installAutocomplete(doc.querySelector('.major-row'));
        doc.getElementById('plain-add-major').addEventListener('click', () => {
            addClicked = true;
            doc.getElementById('major-container').insertAdjacentHTML('beforeend', `
          <div class="major-row" data-row="1">
            <div class="ats-inline-flex ats-flex-col ats-relative ats-group">
              <input id="major-name-1" placeholder="\uC804\uACF5\uBA85\uC744 \uAC80\uC0C9\uD574\uC8FC\uC138\uC694." />
            </div>
            <button type="button" data-row="1">\uC5F0\uACC4\uC804\uACF5</button>
          </div>
        `);
            installAutocomplete(doc.querySelector('[data-row="1"]'));
        });
        const educationProfile = {
            sections: {
                education: {
                    universities: [{
                        majors: [{
                            major: '\uBE45\uB370\uC774\uD130',
                            majorType: '\uC5F0\uACC4\uC804\uACF5'
                        }, {
                            major: '\uC0B0\uC5C5\uACF5\uD559\uACFC',
                            majorType: '\uC8FC\uC804\uACF5'
                        }]
                    }]
                }
            },
            customFields: []
        };

        const preview = previewAutoFillPlan(buildAutoFillPlan(doc, educationProfile));
        const result = await applyAutoFillPlanAsync(buildAutoFillPlan(doc, educationProfile));

        expect(preview.planned).toEqual(expect.arrayContaining([
            expect.objectContaining({ fieldKey: 'education.universities.0.majors.1.majorName.open' })
        ]));
        expect(result.failed).toEqual([]);
        expect(addClicked).toBe(true);
        expect(doc.querySelectorAll('.major-row')).toHaveLength(2);
    });

    it('EXT-031: clicks a plain Midas major add button when only the major label gives context', async () => {
        const doc = document.implementation.createHTMLDocument('application');
        doc.body.innerHTML = `
      <form>
        <div class="remix-css-re11db">
          <div class="remix-css-ke50n9">
            <p>\uC804\uACF5</p>
            <div><span>*</span></div>
          </div>
          <div class="remix-css-3btwcy">
            <div direction="column" class="remix-css-1uo98h9">
              <div class="remix-css-161k9a0"></div>
              <button id="add-major" type="button">
                <svg></svg>
                \uCD94\uAC00\uD558\uAE30
              </button>
            </div>
          </div>
        </div>
        <div id="major-container"></div>
      </form>
    `;
        let addClicked = false;
        doc.getElementById('add-major').addEventListener('click', () => {
            addClicked = true;
            doc.getElementById('major-container').innerHTML = `
          <div class="major-row">
            <input id="major-name-0" placeholder="\uC804\uACF5\uBA85\uC744 \uAC80\uC0C9\uD574\uC8FC\uC138\uC694." />
            <button type="button">\uC8FC\uC804\uACF5</button>
          </div>
        `;
        });
        const educationProfile = {
            sections: {
                education: {
                    universities: [{
                        majors: [{
                            major: '\uC0B0\uC5C5\uACF5\uD559\uACFC',
                            majorType: '\uC8FC\uC804\uACF5'
                        }]
                    }]
                }
            },
            customFields: []
        };

        const plan = buildAutoFillPlan(doc, educationProfile);
        const openItem = plan.fillable.find((item) => item.fieldKey === 'education.universities.0.majors.0.majorName.open');
        const result = await applyAutoFillPlanAsync({
            fillable: openItem ? [openItem] : [],
            failed: [],
            skipped: [],
            copyCandidates: []
        });

        expect(plan.fillable).toEqual(expect.arrayContaining([
            expect.objectContaining({ fieldKey: 'education.universities.0.majors.0.majorName.open' })
        ]));
        expect(result.failed).toEqual([]);
        expect(addClicked).toBe(true);
        expect(doc.getElementById('major-name-0')).not.toBeNull();
    });

    it('EXT-031: adds a Midas major only after the university school is selected', async () => {
        const doc = document.implementation.createHTMLDocument('application');
        doc.body.innerHTML = `
      <form>
        <section aria-label="\uB300\uD559\uAD50">
          <div class="remix-css-re11db">
            <div class="remix-css-ke50n9"><p>\uD559\uAD50\uC815\uBCF4</p><div><span>*</span></div></div>
            <div class="remix-css-3btwcy">
              <input id="university-name" name="collegeGroupAnswers.0.schoolName" placeholder="\uD559\uAD50\uBA85" />
            </div>
          </div>
          <div class="remix-css-re11db">
            <div class="remix-css-ke50n9"><p>\uC804\uACF5</p><div><span>*</span></div></div>
            <div class="remix-css-3btwcy">
              <div direction="column" class="remix-css-1uo98h9">
                <div class="remix-css-161k9a0"></div>
                <button id="add-major" type="button" disabled>
                  <svg></svg>
                  \uCD94\uAC00\uD558\uAE30
                </button>
              </div>
            </div>
          </div>
          <div id="major-container"></div>
        </section>
      </form>
    `;
        const schoolInput = doc.getElementById('university-name');
        const addButton = doc.getElementById('add-major');
        schoolInput.addEventListener('input', () => {
            if (schoolInput.value === '\uBD80\uC0B0\uB300\uD559\uAD50') {
                const option = doc.createElement('button');
                option.type = 'button';
                option.id = 'university-option';
                option.textContent = '\uBD80\uC0B0\uB300\uD559\uAD50';
                option.addEventListener('click', () => {
                    addButton.disabled = false;
                });
                doc.body.append(option);
            }
        });
        addButton.addEventListener('click', () => {
            if (addButton.disabled) return;
            doc.getElementById('major-container').innerHTML = `
          <div class="major-row">
            <input id="major-name-0" placeholder="\uC804\uACF5\uBA85\uC744 \uAC80\uC0C9\uD574\uC8FC\uC138\uC694." />
            <button type="button">\uC8FC\uC804\uACF5</button>
          </div>
        `;
        });
        const educationProfile = {
            sections: {
                education: {
                    universities: [{
                        schoolName: '\uBD80\uC0B0\uB300\uD559\uAD50',
                        majors: [{
                            major: '\uC0B0\uC5C5\uACF5\uD559\uACFC',
                            majorType: '\uC8FC\uC804\uACF5'
                        }]
                    }]
                }
            },
            customFields: []
        };

        const plan = buildAutoFillPlan(doc, educationProfile);
        const schoolIndex = plan.fillable.findIndex((item) => item.fieldKey === 'education.universities.0.schoolName');
        const majorOpenIndex = plan.fillable.findIndex((item) => item.fieldKey === 'education.universities.0.majors.0.majorName.open');
        const result = await applyAutoFillPlanAsync(plan);

        expect(schoolIndex).toBeGreaterThanOrEqual(0);
        expect(majorOpenIndex).toBeGreaterThan(schoolIndex);
        expect(result.failed).toEqual([]);
        expect(doc.getElementById('major-name-0')).not.toBeNull();
    });

    it('EXT-031: waits for a Midas major add wrapper to become enabled after school selection', async () => {
        const doc = document.implementation.createHTMLDocument('application');
        doc.body.innerHTML = `
      <form>
        <section aria-label="\uB300\uD559\uAD50">
          <div class="remix-css-re11db">
            <div class="remix-css-ke50n9"><p>\uD559\uAD50\uC815\uBCF4</p><div><span>*</span></div></div>
            <div class="remix-css-3btwcy">
              <input id="university-name" name="collegeGroupAnswers.0.schoolName" placeholder="\uD559\uAD50\uBA85" />
            </div>
          </div>
          <div class="remix-css-re11db">
            <div class="remix-css-ke50n9"><p>\uC804\uACF5</p><div><span>*</span></div></div>
            <div class="remix-css-3btwcy">
              <div id="major-add-wrapper" disabled direction="column" class="remix-css-1uo98h9">
                <div class="remix-css-161k9a0"></div>
                <button id="add-major" type="button">
                  <svg></svg>
                  \uCD94\uAC00\uD558\uAE30
                </button>
              </div>
            </div>
          </div>
          <div id="major-container"></div>
        </section>
      </form>
    `;
        const schoolInput = doc.getElementById('university-name');
        const addWrapper = doc.getElementById('major-add-wrapper');
        schoolInput.addEventListener('input', () => {
            if (schoolInput.value !== '\uBD80\uC0B0\uB300\uD559\uAD50' || doc.getElementById('university-option')) return;
            const option = doc.createElement('button');
            option.type = 'button';
            option.id = 'university-option';
            option.textContent = '\uBD80\uC0B0\uB300\uD559\uAD50';
            option.addEventListener('click', () => {
                setTimeout(() => addWrapper.removeAttribute('disabled'), 650);
            });
            doc.body.append(option);
        });
        doc.getElementById('add-major').addEventListener('click', (event) => {
            if (event.currentTarget.closest('[disabled]')) return;
            doc.getElementById('major-container').innerHTML = `
          <div class="major-row">
            <input id="major-name-0" placeholder="\uC804\uACF5\uBA85\uC744 \uAC80\uC0C9\uD574\uC8FC\uC138\uC694." />
            <button type="button">\uC8FC\uC804\uACF5</button>
          </div>
        `;
        });
        const educationProfile = {
            sections: {
                education: {
                    universities: [{
                        schoolName: '\uBD80\uC0B0\uB300\uD559\uAD50',
                        majors: [{
                            major: '\uC0B0\uC5C5\uACF5\uD559\uACFC',
                            majorType: '\uC8FC\uC804\uACF5'
                        }]
                    }]
                }
            },
            customFields: []
        };

        const result = await applyAutoFillPlanAsync(buildAutoFillPlan(doc, educationProfile));

        expect(result.failed).toEqual([]);
        expect(doc.getElementById('major-name-0')).not.toBeNull();
    });

    it('EXT-031: closes an open Midas department category menu before adding major rows', async () => {
        const doc = document.implementation.createHTMLDocument('application');
        doc.body.innerHTML = `
      <form>
        <section aria-label="\uB300\uD559\uAD50">
          <div class="remix-css-p9ewyl">
            <div class="remix-css-ke50n9"><p>\uD559\uACFC\uACC4\uC5F4</p><div><span>*</span></div></div>
            <div class="remix-css-3btwcy">
              <div class="ats-inline-flex ats-flex-col ats-relative ats-group">
                <button id="department-category" type="button" aria-haspopup="listbox"><p>\uD559\uACFC\uACC4\uC5F4\uC744 \uC120\uD0DD\uD574\uC8FC\uC138\uC694.</p></button>
              </div>
            </div>
          </div>
          <div class="remix-css-re11db">
            <div class="remix-css-ke50n9"><p>\uC804\uACF5</p><div><span>*</span></div></div>
            <div class="remix-css-3btwcy">
              <div direction="column" class="remix-css-1uo98h9">
                <div class="remix-css-161k9a0"></div>
                <button id="add-major" type="button">
                  <svg></svg>
                  \uCD94\uAC00\uD558\uAE30
                </button>
              </div>
            </div>
          </div>
          <div id="major-container"></div>
        </section>
      </form>
    `;
        const category = doc.getElementById('department-category');
        category.addEventListener('mousedown', () => {
            if (doc.getElementById('dropdown-body')) return;
            const menu = doc.createElement('div');
            menu.id = 'dropdown-body';
            menu.innerHTML = `
          <input type="text" />
          <button type="button"><p>\uACF5\uD559</p></button>
        `;
            menu.querySelector('button').addEventListener('mousedown', () => {
                category.querySelector('p').textContent = '\uACF5\uD559';
            });
            category.parentElement.append(menu);
        });
        doc.body.addEventListener('keydown', (event) => {
            if (event.key === 'Escape') doc.getElementById('dropdown-body')?.remove();
        });
        doc.getElementById('add-major').addEventListener('click', () => {
            if (doc.getElementById('dropdown-body')) return;
            doc.getElementById('major-container').innerHTML = `
          <div class="major-row">
            <input id="major-name-0" placeholder="\uC804\uACF5\uBA85\uC744 \uAC80\uC0C9\uD574\uC8FC\uC138\uC694." />
            <button type="button">\uC8FC\uC804\uACF5</button>
          </div>
        `;
        });
        const educationProfile = {
            sections: {
                education: {
                    universities: [{
                        majorCategory: '\uACF5\uD559',
                        majors: [{
                            major: '\uC0B0\uC5C5\uACF5\uD559\uACFC',
                            majorType: '\uC8FC\uC804\uACF5'
                        }]
                    }]
                }
            },
            customFields: []
        };

        const result = await applyAutoFillPlanAsync(buildAutoFillPlan(doc, educationProfile));

        expect(result.failed).toEqual([]);
        expect(doc.getElementById('dropdown-body')).toBeNull();
        expect(doc.getElementById('major-name-0')).not.toBeNull();
    });

    it('EXT-031: opens the Midas major row when filling a nested major field directly', async () => {
        const doc = document.implementation.createHTMLDocument('application');
        doc.body.innerHTML = `
      <form>
        <section aria-label="\uB300\uD559\uAD50">
          <div class="remix-css-re11db">
            <div class="remix-css-ke50n9"><p>\uC804\uACF5</p><div><span>*</span></div></div>
            <div class="remix-css-3btwcy">
              <div direction="column" class="remix-css-1uo98h9">
                <div class="remix-css-161k9a0"></div>
                <button id="add-major" type="button">
                  <svg></svg>
                  \uCD94\uAC00\uD558\uAE30
                </button>
              </div>
            </div>
          </div>
          <div id="major-container"></div>
        </section>
      </form>
    `;
        doc.getElementById('add-major').addEventListener('click', () => {
            doc.getElementById('major-container').innerHTML = `
          <div class="major-row">
            <input id="major-name-0" placeholder="\uC804\uACF5\uBA85\uC744 \uAC80\uC0C9\uD574\uC8FC\uC138\uC694." />
            <button type="button">\uC8FC\uC804\uACF5</button>
          </div>
        `;
        });

        const result = await applyAutoFillPlanAsync({
            fillable: [{
                element: doc.body,
                fieldKey: 'education.universities.0.majors.0.majorName',
                label: '\uB300\uD559\uAD50 \uC804\uACF5 1 \uC804\uACF5\uBA85',
                value: '\uC0B0\uC5C5\uACF5\uD559\uACFC',
                waitForControlBeforeFill: true
            }],
            failed: [],
            skipped: [],
            copyCandidates: []
        });

        expect(result.failed).toEqual([]);
        expect(doc.getElementById('major-name-0').value).toBe('\uC0B0\uC5C5\uACF5\uD559\uACFC');
    });

    it('EXT-031: selects visible Midas department category options before typing in menu search', async () => {
        const doc = document.implementation.createHTMLDocument('application');
        doc.body.innerHTML = `
      <form>
        <section aria-label="\uB300\uD559\uAD50">
          <div class="remix-css-p9ewyl">
            <div class="remix-css-ke50n9"><p>\uD559\uACFC\uACC4\uC5F4</p><div><span>*</span></div></div>
            <div class="remix-css-3btwcy">
              <button id="department-category" type="button" aria-haspopup="listbox"><p>\uD559\uACFC\uACC4\uC5F4\uC744 \uC120\uD0DD\uD574\uC8FC\uC138\uC694.</p></button>
            </div>
          </div>
        </section>
      </form>
    `;
        const category = doc.getElementById('department-category');
        category.addEventListener('mousedown', () => {
            if (doc.getElementById('department-category-menu')) return;
            const menu = doc.createElement('div');
            menu.id = 'department-category-menu';
            menu.innerHTML = `
          <input id="department-category-search" type="search" />
          <button type="button"><p>\uC778\uBB38</p></button>
          <button type="button"><p>\uACF5\uD559</p></button>
        `;
            menu.querySelectorAll('button').forEach((optionButton) => {
                optionButton.addEventListener('mousedown', () => {
                    category.querySelector('p').textContent = optionButton.textContent.trim();
                });
            });
            doc.body.append(menu);
        });
        const educationProfile = {
            sections: {
                education: {
                    universities: [{
                        majorCategory: '\uACF5\uD559'
                    }]
                }
            },
            customFields: []
        };

        const result = await applyAutoFillPlanAsync(buildAutoFillPlan(doc, educationProfile));

        expect(result.failed).toEqual([]);
        expect(category.textContent).toContain('\uACF5\uD559');
        expect(doc.getElementById('department-category-search').value).toBe('');
    });

    it('EXT-031: waits for opened Midas custom select options instead of matching existing page text', async () => {
        const doc = document.implementation.createHTMLDocument('application');
        doc.body.innerHTML = `
      <form>
        <section aria-label="\uACE0\uB4F1\uD559\uAD50">
          <p id="existing-school-text">\uBD80\uC0B0\uB3D9\uACE0\uB4F1\uD559\uAD50</p>
          <button id="high-school-location" type="button" aria-haspopup="listbox"><p>\uD559\uAD50 \uC18C\uC7AC\uC9C0\uB97C \uC120\uD0DD\uD574\uC8FC\uC138\uC694.</p></button>
        </section>
        <section aria-label="\uB300\uD559\uAD50">
          <p id="existing-university-text">\uBD80\uC0B0\uB300\uD559\uAD50</p>
        </section>
      </form>
    `;
        let staleTextClicked = false;
        doc.getElementById('existing-school-text').addEventListener('mousedown', () => {
            staleTextClicked = true;
        });
        doc.getElementById('existing-university-text').addEventListener('mousedown', () => {
            staleTextClicked = true;
        });
        const trigger = doc.getElementById('high-school-location');
        trigger.addEventListener('mousedown', () => {
            if (doc.getElementById('location-menu')) return;
            setTimeout(() => {
                const menu = doc.createElement('div');
                menu.id = 'location-menu';
                menu.innerHTML = ['\uC120\uD0DD\uC548\uD568', '\uC11C\uC6B8', '\uBD80\uC0B0', '\uB300\uAD6C'].map((option) => (
                    `<div class="menu-row"><p>${option}</p></div>`
                )).join('');
                menu.querySelectorAll('.menu-row').forEach((optionRow) => {
                    optionRow.addEventListener('mousedown', () => {
                        trigger.querySelector('p').textContent = optionRow.textContent.trim();
                        menu.remove();
                    });
                });
                doc.body.append(menu);
            }, 80);
        });
        const educationProfile = {
            sections: {
                education: {
                    highSchool: {
                        location: '\uBD80\uC0B0'
                    }
                }
            },
            customFields: []
        };

        const result = await applyAutoFillPlanAsync(buildAutoFillPlan(doc, educationProfile));

        expect(result.failed).toEqual([]);
        expect(staleTextClicked).toBe(false);
        expect(doc.getElementById('high-school-location').textContent).toBe('\uBD80\uC0B0');
    });

    it('EXT-031: selects Midas university location button without aria-haspopup', async () => {
        const doc = document.implementation.createHTMLDocument('application');
        doc.body.innerHTML = `
      <form>
        <div class="remix-css-1iyoj2o">
          <div class="remix-css-uf1ume"><p>- \uB300\uD559\uAD50 *</p></div>
          <div class="remix-css-re11db">
            <div class="remix-css-ke50n9"><p>\uD559\uAD50\uC815\uBCF4</p></div>
            <div class="remix-css-3btwcy">
              <button id="university-location" type="button"><p>\uD559\uAD50 \uC18C\uC7AC\uC9C0\uB97C \uC120\uD0DD\uD574\uC8FC\uC138\uC694.</p></button>
            </div>
          </div>
        </div>
      </form>
    `;
        const trigger = doc.getElementById('university-location');
        trigger.addEventListener('mousedown', () => {
            if (doc.getElementById('university-location-options')) return;
            const menu = doc.createElement('div');
            menu.id = 'university-location-options';
            menu.innerHTML = ['\uC11C\uC6B8', '\uBD80\uC0B0', '\uB300\uAD6C'].map((option) => `<button type="button"><p>${option}</p></button>`).join('');
            menu.querySelectorAll('button').forEach((optionButton) => {
                optionButton.addEventListener('mousedown', () => {
                    trigger.querySelector('p').textContent = optionButton.textContent.trim();
                    menu.remove();
                });
            });
            doc.body.append(menu);
        });
        const educationProfile = {
            sections: {
                education: {
                    universities: [{
                        location: '\uBD80\uC0B0'
                    }]
                }
            },
            customFields: []
        };

        const result = await applyAutoFillPlanAsync(buildAutoFillPlan(doc, educationProfile));

        expect(result.failed).toEqual([]);
        expect(doc.getElementById('university-location').textContent).toContain('\uBD80\uC0B0');
    });

    it('EXT-031: fills Midas university location after clicking the school autocomplete result', async () => {
        const doc = document.implementation.createHTMLDocument('application');
        doc.body.innerHTML = `
      <form>
        <div class="remix-css-1iyoj2o">
          <div class="remix-css-uf1ume"><p>- \uB300\uD559\uAD50 *</p></div>
          <div class="remix-css-re11db">
            <div class="remix-css-ke50n9"><p>\uD559\uAD50\uC815\uBCF4</p></div>
            <div class="ats-inline-flex ats-flex-col ats-relative ats-group">
              <input id="university-school" placeholder="\uD559\uAD50\uBA85\uC744 \uAC80\uC0C9\uD574\uC8FC\uC138\uC694." />
            </div>
            <button id="university-location" type="button" disabled><p>\uD559\uAD50 \uC18C\uC7AC\uC9C0\uB97C \uC120\uD0DD\uD574\uC8FC\uC138\uC694.</p></button>
          </div>
        </div>
      </form>
    `;
        const schoolInput = doc.getElementById('university-school');
        const locationButton = doc.getElementById('university-location');
        schoolInput.addEventListener('input', () => {
            if (doc.getElementById('dropdown-body')) return;
            const dropdown = doc.createElement('div');
            dropdown.id = 'dropdown-body';
            dropdown.innerHTML = '<button type="button"><span>\uBD80\uC0B0\uB300\uD559\uAD50</span></button>';
            dropdown.querySelector('button').addEventListener('mousedown', () => {
                schoolInput.value = '\uBD80\uC0B0\uB300\uD559\uAD50';
                locationButton.disabled = false;
                dropdown.remove();
            });
            schoolInput.parentElement.append(dropdown);
        });
        locationButton.addEventListener('mousedown', () => {
            if (locationButton.disabled || doc.getElementById('university-location-options')) return;
            const menu = doc.createElement('div');
            menu.id = 'university-location-options';
            menu.innerHTML = ['\uC11C\uC6B8', '\uBD80\uC0B0'].map((option) => `<button type="button"><p>${option}</p></button>`).join('');
            menu.querySelectorAll('button').forEach((optionButton) => {
                optionButton.addEventListener('mousedown', () => {
                    locationButton.querySelector('p').textContent = optionButton.textContent.trim();
                    menu.remove();
                });
            });
            doc.body.append(menu);
        });
        const educationProfile = {
            sections: {
                education: {
                    universities: [{
                        schoolName: '\uBD80\uC0B0\uB300\uD559\uAD50',
                        location: '\uBD80\uC0B0'
                    }]
                }
            },
            customFields: []
        };

        const result = await applyAutoFillPlanAsync(buildAutoFillPlan(doc, educationProfile));

        expect(result.failed).toEqual([]);
        expect(doc.getElementById('university-school').value).toBe('\uBD80\uC0B0\uB300\uD559\uAD50');
        expect(doc.getElementById('university-location').textContent).toContain('\uBD80\uC0B0');
    });

    it('EXT-031: selects Midas grade scale button without aria-haspopup', async () => {
        const doc = document.implementation.createHTMLDocument('application');
        doc.body.innerHTML = `
      <form>
        <div class="remix-css-1iyoj2o">
          <div class="remix-css-uf1ume"><p>- \uB300\uD559\uAD50 *</p></div>
          <div class="remix-css-t25awl">
            <div class="remix-css-ke50n9"><p>\uD559\uC5C5\uC131\uC801</p></div>
            <div class="remix-css-3btwcy">
              <input id="university-grade" />
              <span>/</span>
              <button id="university-grade-scale" type="button"><p>\uB9CC\uC810\uAE30\uC900</p></button>
            </div>
          </div>
        </div>
      </form>
    `;
        const trigger = doc.getElementById('university-grade-scale');
        trigger.addEventListener('mousedown', () => {
            if (doc.getElementById('university-grade-scale-options')) return;
            const menu = doc.createElement('div');
            menu.id = 'university-grade-scale-options';
            menu.innerHTML = ['4.3', '4.5', '100'].map((option) => `<button type="button"><p>${option}</p></button>`).join('');
            menu.querySelectorAll('button').forEach((optionButton) => {
                optionButton.addEventListener('mousedown', () => {
                    trigger.querySelector('p').textContent = optionButton.textContent.trim();
                    menu.remove();
                });
            });
            doc.body.append(menu);
        });
        const educationProfile = {
            sections: {
                education: {
                    universities: [{
                        grade: '3.93',
                        gradeScale: '4.5'
                    }]
                }
            },
            customFields: []
        };

        const result = await applyAutoFillPlanAsync(buildAutoFillPlan(doc, educationProfile));

        expect(result.failed).toEqual([]);
        expect(doc.getElementById('university-grade').value).toBe('3.93');
        expect(doc.getElementById('university-grade-scale').textContent).toContain('4.5');
    });

    it('EXT-031: does not search the university department category with grade scale value', async () => {
        const doc = document.implementation.createHTMLDocument('application');
        doc.body.innerHTML = `
      <form>
        <section aria-label="\uB300\uD559\uAD50">
          <h3>\uB300\uD559\uAD50</h3>
          <div class="row">
            <div class="label"><p>\uC785\uD559\uAD6C\uBD84 *</p></div>
            <div class="field"><button type="button">\uC785\uD559</button><button type="button">\uD3B8\uC785</button></div>
            <div class="label"><p>\uD559\uACFC\uACC4\uC5F4 *</p></div>
            <div class="field"><button id="university-department-category" type="button" aria-haspopup="listbox"><p>\uD559\uACFC\uACC4\uC5F4\uC744 \uC120\uD0DD\uD574\uC8FC\uC138\uC694.</p></button></div>
          </div>
          <div class="row">
            <div class="label"><p>\uD559\uC5C5\uC131\uC801 *</p></div>
            <div class="field">
              <input id="university-grade" />
              <span>/</span>
              <button id="university-grade-scale" type="button" aria-haspopup="listbox"><p>\uB9CC\uC810\uAE30\uC900</p></button>
            </div>
            <div class="label"><p>\uC774\uC218\uD559\uC810 *</p></div>
            <div class="field"><input id="university-credits" /></div>
          </div>
          <p>\uC804\uACF5 *</p>
          <button id="add-major" type="button">+ \uCD94\uAC00\uD558\uAE30</button>
          <div id="major-container"></div>
        </section>
      </form>
    `;
        const searched = [];
        const addSelectBehavior = (trigger, options) => {
            trigger.addEventListener('mousedown', () => {
                if (doc.getElementById(`${trigger.id}-options`)) return;
                const menu = doc.createElement('div');
                menu.id = `${trigger.id}-options`;
                menu.setAttribute('role', 'listbox');
                menu.innerHTML = `
            <input id="${trigger.id}-search" />
            <div>${options.map((option) => `<button type="button"><p>${option}</p></button>`).join('')}</div>
          `;
                menu.querySelector('input').addEventListener('input', (event) => searched.push(`${trigger.id}:${event.target.value}`));
                menu.querySelectorAll('button').forEach((optionButton) => {
                    optionButton.addEventListener('mousedown', () => {
                        trigger.querySelector('p').textContent = optionButton.textContent.trim();
                        menu.remove();
                    });
                });
                doc.body.append(menu);
            });
        };
        addSelectBehavior(doc.getElementById('university-department-category'), ['\uACF5\uD559']);
        addSelectBehavior(doc.getElementById('university-grade-scale'), ['4.3', '4.5', '100']);
        doc.getElementById('university-department-category').dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true }));
        doc.getElementById('add-major').addEventListener('click', () => {
            if (doc.getElementById('major-name-0')) return;
            doc.getElementById('major-container').innerHTML = `
          <div class="major-row">
            <input id="major-name-0" placeholder="\uC804\uACF5\uBA85\uC744 \uAC80\uC0C9\uD574\uC8FC\uC138\uC694." />
          </div>
        `;
        });
        const educationProfile = {
            sections: {
                education: {
                    universities: [{
                        grade: '3.93',
                        gradeScale: '4.5',
                        credits: '149',
                        majors: [{
                            major: '\uC0B0\uC5C5\uACF5\uD559\uACFC'
                        }]
                    }]
                }
            },
            customFields: []
        };

        const plan = buildAutoFillPlan(doc, educationProfile);
        const gradeScaleItem = plan.fillable.find((item) => item.fieldKey === 'education.universities.0.gradeScale');

        expect(gradeScaleItem?.element).toBe(doc.getElementById('university-grade-scale'));

        const result = await applyAutoFillPlanAsync({
            fillable: [{
                element: doc.body,
                fieldKey: 'education.universities.0.gradeScale',
                label: '\uB300\uD559\uAD50 \uB9CC\uC810\uAE30\uC900',
                value: '4.5',
                waitForControlBeforeFill: true
            }],
            failed: [],
            skipped: [],
            copyCandidates: []
        });

        expect(result.failed).toEqual([]);
        expect(doc.getElementById('university-grade-scale').textContent).toContain('4.5');
        expect(searched).not.toContain('university-department-category:4.5');
    });

    it('EXT-031: does not plan nested major category into the university department category before major rows exist', () => {
        const doc = document.implementation.createHTMLDocument('application');
        doc.body.innerHTML = `
      <form>
        <section aria-label="\uB300\uD559\uAD50">
          <h3>\uB300\uD559\uAD50</h3>
          <div class="row">
            <div class="label"><p>\uD559\uACFC\uACC4\uC5F4 *</p></div>
            <div class="field"><button id="university-department-category" type="button" aria-haspopup="listbox"><p>\uD559\uACFC\uACC4\uC5F4\uC744 \uC120\uD0DD\uD574\uC8FC\uC138\uC694.</p></button></div>
          </div>
          <p>\uC804\uACF5 *</p>
          <button id="add-major" type="button">+ \uCD94\uAC00\uD558\uAE30</button>
          <div id="major-container"></div>
        </section>
      </form>
    `;
        const educationProfile = {
            sections: {
                education: {
                    universities: [{
                        majors: [{
                            major: '\uC0B0\uC5C5\uACF5\uD559\uACFC',
                            majorCategory: '\uACF5\uD559\uACC4\uC5F4(\uC0B0\uC5C5)',
                            majorType: '\uC8FC\uC804\uACF5',
                            dayNight: '\uC8FC\uAC04'
                        }, {
                            major: '\uBE45\uB370\uC774\uD130',
                            majorCategory: '\uACF5\uD559\uACC4\uC5F4(\uCEF4\uD4E8\uD130\u00B7\uD1B5\uC2E0)',
                            majorType: '\uC5F0\uACC4\uC804\uACF5',
                            dayNight: '\uC8FC\uAC04'
                        }]
                    }]
                }
            },
            customFields: []
        };

        const preview = previewAutoFillPlan(buildAutoFillPlan(doc, educationProfile));

        expect(preview.planned).toEqual(expect.arrayContaining([
            expect.objectContaining({
                fieldKey: 'education.universities.0.majorCategory',
                value: '\uACF5\uD559'
            }),
            expect.objectContaining({ fieldKey: 'education.universities.0.majors.0.majorName.open' }),
            expect.objectContaining({ fieldKey: 'education.universities.0.majors.0.majorName' }),
            expect.objectContaining({ fieldKey: 'education.universities.0.majors.1.majorName.open' }),
            expect.objectContaining({ fieldKey: 'education.universities.0.majors.1.majorName' })
        ]));
        expect(preview.planned).not.toEqual(expect.arrayContaining([
            expect.objectContaining({
                element: doc.getElementById('university-department-category'),
                fieldKey: 'education.universities.0.majors.0.majorCategory'
            })
        ]));
    });

    it('EXT-031: waits for education detail fields that render after school name input settles', async () => {
        const doc = document.implementation.createHTMLDocument('application');
        doc.body.innerHTML = `
      <form>
        <div id="high-school-section">
          <button id="open-high-school" type="button"><p>\uACE0\uB4F1\uD559\uAD50 *</p></button>
        </div>
        <div id="university-section">
          <button id="open-university" type="button"><p>\uB300\uD559\uAD50 *</p></button>
        </div>
      </form>
    `;
        const addSelectBehavior = (trigger, options) => {
            trigger.addEventListener('mousedown', () => {
                if (doc.getElementById(`${trigger.id}-options`)) return;
                const menu = doc.createElement('div');
                menu.id = `${trigger.id}-options`;
                menu.innerHTML = options.map((option) => `<button type="button"><p>${option}</p></button>`).join('');
                menu.querySelectorAll('button').forEach((optionButton) => {
                    optionButton.addEventListener('mousedown', () => {
                        trigger.querySelector('p').textContent = optionButton.textContent.trim();
                        menu.remove();
                    });
                });
                doc.body.append(menu);
            });
        };
        doc.getElementById('open-high-school').addEventListener('click', () => {
            if (doc.getElementById('high-school-name')) return;
            doc.getElementById('high-school-section').insertAdjacentHTML('beforeend', `
          <section aria-label="\uACE0\uB4F1\uD559\uAD50">
            <h3>\uACE0\uB4F1\uD559\uAD50</h3>
            <label>\uD559\uAD50\uC815\uBCF4<input id="high-school-name" placeholder="\uD559\uAD50\uBA85\uC744 \uAC80\uC0C9\uD574\uC8FC\uC138\uC694." /></label>
            <div id="high-school-detail"></div>
          </section>
        `);
            doc.getElementById('high-school-name').addEventListener('change', () => {
                setTimeout(() => {
                    if (doc.getElementById('high-school-graduation-date')) return;
                    doc.getElementById('high-school-detail').innerHTML = `
              <label>\uC878\uC5C5\uC77C<input id="high-school-graduation-date" placeholder="YYYY.MM.DD" /></label>
              <button id="high-school-graduation-status" type="button" aria-haspopup="listbox"><p>\uC878\uC5C5\uAD6C\uBD84\uC744 \uC120\uD0DD\uD574\uC8FC\uC138\uC694.</p></button>
              <button id="high-school-location" type="button" aria-haspopup="listbox"><p>\uD559\uAD50 \uC18C\uC7AC\uC9C0\uB97C \uC120\uD0DD\uD574\uC8FC\uC138\uC694.</p></button>
            `;
                    addSelectBehavior(doc.getElementById('high-school-graduation-status'), ['\uC878\uC5C5', '\uC878\uC5C5\uC608\uC815']);
                    addSelectBehavior(doc.getElementById('high-school-location'), ['\uC11C\uC6B8', '\uBD80\uC0B0']);
                }, 1350);
            });
        });
        doc.getElementById('open-university').addEventListener('click', () => {
            if (doc.getElementById('university-name')) return;
            doc.getElementById('university-section').insertAdjacentHTML('beforeend', `
          <section aria-label="\uB300\uD559\uAD50">
            <h3>\uB300\uD559\uAD50</h3>
            <label>\uD559\uAD50\uC815\uBCF4<input id="university-name" placeholder="\uD559\uAD50\uBA85\uC744 \uAC80\uC0C9\uD574\uC8FC\uC138\uC694." /></label>
            <div id="university-detail"></div>
          </section>
        `);
            doc.getElementById('university-name').addEventListener('change', () => {
                setTimeout(() => {
                    if (doc.getElementById('university-graduation-date')) return;
                    doc.getElementById('university-detail').innerHTML = `
              <label>\uC878\uC5C5\uC77C<input id="university-graduation-date" placeholder="YYYY.MM.DD" /></label>
              <button id="university-graduation-status" type="button" aria-haspopup="listbox"><p>\uC878\uC5C5\uAD6C\uBD84\uC744 \uC120\uD0DD\uD574\uC8FC\uC138\uC694.</p></button>
              <button id="university-degree-type" type="button" aria-haspopup="listbox"><p>\uD559\uC704\uAD6C\uBD84\uC744 \uC120\uD0DD\uD574\uC8FC\uC138\uC694.</p></button>
              <button id="university-location" type="button" aria-haspopup="listbox"><p>\uD559\uAD50 \uC18C\uC7AC\uC9C0\uB97C \uC120\uD0DD\uD574\uC8FC\uC138\uC694.</p></button>
              <button id="university-campus-type" type="button" aria-haspopup="listbox"><p>\uBCF8\uAD50/\uBD84\uAD50\uB97C \uC120\uD0DD\uD574\uC8FC\uC138\uC694.</p></button>
            `;
                    addSelectBehavior(doc.getElementById('university-graduation-status'), ['\uC878\uC5C5', '\uC878\uC5C5\uC608\uC815']);
                    addSelectBehavior(doc.getElementById('university-degree-type'), ['\uD559\uC0AC', '\uC11D\uC0AC']);
                    addSelectBehavior(doc.getElementById('university-location'), ['\uC11C\uC6B8', '\uBD80\uC0B0']);
                    addSelectBehavior(doc.getElementById('university-campus-type'), ['\uBCF8\uAD50', '\uBD84\uAD50']);
                }, 1350);
            });
        });
        const educationProfile = {
            sections: {
                education: {
                    highSchool: {
                        schoolName: '\uBD80\uC0B0\uB3D9\uACE0\uB4F1\uD559\uAD50',
                        graduationDate: '2020-02-28',
                        graduationStatus: '\uC878\uC5C5',
                        location: '\uBD80\uC0B0'
                    },
                    universities: [{
                        schoolName: '\uBD80\uC0B0\uB300\uD559\uAD50',
                        graduationDate: '2026-02-20',
                        graduationStatus: '\uC878\uC5C5',
                        degreeType: '\uD559\uC0AC',
                        location: '\uBD80\uC0B0',
                        campusType: '\uBCF8\uAD50'
                    }]
                }
            },
            customFields: []
        };

        const result = await applyAutoFillPlanAsync(buildAutoFillPlan(doc, educationProfile));

        expect(result.failed).toEqual([]);
        expect(doc.getElementById('high-school-graduation-date').value).toBe('2020.02.28');
        expect(doc.getElementById('high-school-graduation-status').textContent).toContain('\uC878\uC5C5');
        expect(doc.getElementById('high-school-location').textContent).toContain('\uBD80\uC0B0');
        expect(doc.getElementById('university-graduation-date').value).toBe('2026.02.20');
        expect(doc.getElementById('university-graduation-status').textContent).toContain('\uC878\uC5C5');
        expect(doc.getElementById('university-degree-type').textContent).toContain('\uD559\uC0AC');
        expect(doc.getElementById('university-location').textContent).toContain('\uBD80\uC0B0');
        expect(doc.getElementById('university-campus-type').textContent).toContain('\uBCF8\uAD50');
    });

    it('EXT-031: selects Midas school autocomplete options before filling dependent education fields', async () => {
        const doc = document.implementation.createHTMLDocument('application');
        doc.body.innerHTML = `
      <form>
        <section aria-label="\uACE0\uB4F1\uD559\uAD50">
          <h3>\uACE0\uB4F1\uD559\uAD50</h3>
          <label>\uD559\uAD50\uC815\uBCF4<input id="high-school-name" placeholder="\uD559\uAD50\uBA85\uC744 \uAC80\uC0C9\uD574\uC8FC\uC138\uC694." /></label>
          <div id="high-school-detail"></div>
        </section>
        <section aria-label="\uB300\uD559\uAD50">
          <h3>\uB300\uD559\uAD50</h3>
          <label>\uD559\uAD50\uC815\uBCF4<input id="university-name" placeholder="\uD559\uAD50\uBA85\uC744 \uAC80\uC0C9\uD574\uC8FC\uC138\uC694." /></label>
          <div id="university-detail"></div>
        </section>
      </form>
    `;
        const addSchoolSearchBehavior = (input, optionText, detailTargetId, detailMarkup, onDetailReady = () => {}) => {
            input.addEventListener('input', () => {
                if (doc.getElementById(`${input.id}-option`)) return;
                const option = doc.createElement('button');
                option.id = `${input.id}-option`;
                option.type = 'button';
                option.textContent = optionText;
                option.addEventListener('mousedown', () => {
                    input.value = optionText;
                    option.remove();
                    setTimeout(() => {
                        doc.getElementById(detailTargetId).innerHTML = detailMarkup;
                        onDetailReady();
                    }, 1350);
                });
                doc.body.append(option);
            });
        };
        const addSelectBehavior = (trigger, options) => {
            trigger.addEventListener('mousedown', () => {
                if (doc.getElementById(`${trigger.id}-options`)) return;
                const menu = doc.createElement('div');
                menu.id = `${trigger.id}-options`;
                menu.innerHTML = options.map((option) => `<button type="button"><p>${option}</p></button>`).join('');
                menu.querySelectorAll('button').forEach((optionButton) => {
                    optionButton.addEventListener('mousedown', () => {
                        trigger.querySelector('p').textContent = optionButton.textContent.trim();
                        menu.remove();
                    });
                });
                doc.body.append(menu);
            });
        };
        addSchoolSearchBehavior(
            doc.getElementById('high-school-name'),
            '\uBD80\uC0B0\uB3D9\uACE0\uB4F1\uD559\uAD50',
            'high-school-detail',
            `
          <label>\uC878\uC5C5\uC77C<input id="high-school-graduation-date" placeholder="YYYY.MM.DD" /></label>
          <button id="high-school-graduation-status" type="button" aria-haspopup="listbox"><p>\uC878\uC5C5\uAD6C\uBD84\uC744 \uC120\uD0DD\uD574\uC8FC\uC138\uC694.</p></button>
        `
            ,
            () => addSelectBehavior(doc.getElementById('high-school-graduation-status'), ['\uC878\uC5C5', '\uC878\uC5C5\uC608\uC815'])
        );
        addSchoolSearchBehavior(
            doc.getElementById('university-name'),
            '\uBD80\uC0B0\uB300\uD559\uAD50',
            'university-detail',
            `
          <label>\uC878\uC5C5\uC77C<input id="university-graduation-date" placeholder="YYYY.MM.DD" /></label>
          <button id="university-graduation-status" type="button" aria-haspopup="listbox"><p>\uC878\uC5C5\uAD6C\uBD84\uC744 \uC120\uD0DD\uD574\uC8FC\uC138\uC694.</p></button>
          <button id="university-degree-type" type="button" aria-haspopup="listbox"><p>\uD559\uC704\uAD6C\uBD84\uC744 \uC120\uD0DD\uD574\uC8FC\uC138\uC694.</p></button>
        `
            ,
            () => {
                addSelectBehavior(doc.getElementById('university-graduation-status'), ['\uC878\uC5C5', '\uC878\uC5C5\uC608\uC815']);
                addSelectBehavior(doc.getElementById('university-degree-type'), ['\uD559\uC0AC', '\uC11D\uC0AC']);
            }
        );
        const educationProfile = {
            sections: {
                education: {
                    highSchool: {
                        schoolName: '\uBD80\uC0B0\uB3D9\uACE0\uB4F1\uD559\uAD50',
                        graduationDate: '2020-02-28',
                        graduationStatus: '\uC878\uC5C5'
                    },
                    universities: [{
                        schoolName: '\uBD80\uC0B0\uB300\uD559\uAD50',
                        graduationDate: '2026-02-20',
                        graduationStatus: '\uC878\uC5C5',
                        degreeType: '\uD559\uC0AC'
                    }]
                }
            },
            customFields: []
        };

        const result = await applyAutoFillPlanAsync(buildAutoFillPlan(doc, educationProfile));

        expect(result.failed).toEqual([]);
        expect(doc.getElementById('high-school-name-option')).toBeNull();
        expect(doc.getElementById('university-name-option')).toBeNull();
        expect(doc.getElementById('high-school-graduation-date').value).toBe('2020.02.28');
        expect(doc.getElementById('high-school-graduation-status').textContent).toContain('\uC878\uC5C5');
        expect(doc.getElementById('university-graduation-date').value).toBe('2026.02.20');
        expect(doc.getElementById('university-graduation-status').textContent).toContain('\uC878\uC5C5');
        expect(doc.getElementById('university-degree-type').textContent).toContain('\uD559\uC0AC');
    });

    it('EXT-031: stops waiting after filled high school autocomplete details when only hidden details remain', async () => {
        const doc = document.implementation.createHTMLDocument('application');
        doc.body.innerHTML = `
      <form>
        <section aria-label="\uACE0\uB4F1\uD559\uAD50">
          <h3>\uACE0\uB4F1\uD559\uAD50</h3>
          <label>\uD559\uAD50\uC815\uBCF4<input id="high-school-name" placeholder="\uD559\uAD50\uBA85\uC744 \uAC80\uC0C9\uD574\uC8FC\uC138\uC694." /></label>
          <div id="high-school-detail"></div>
        </section>
      </form>
    `;
        const addSelectBehavior = (trigger, options) => {
            trigger.addEventListener('mousedown', () => {
                if (doc.getElementById(`${trigger.id}-options`)) return;
                const menu = doc.createElement('div');
                menu.id = `${trigger.id}-options`;
                menu.innerHTML = options.map((option) => `<button type="button"><p>${option}</p></button>`).join('');
                menu.querySelectorAll('button').forEach((optionButton) => {
                    optionButton.addEventListener('mousedown', () => {
                        trigger.querySelector('p').textContent = optionButton.textContent.trim();
                        menu.remove();
                    });
                });
                doc.body.append(menu);
            });
        };
        const input = doc.getElementById('high-school-name');
        input.addEventListener('input', () => {
            if (doc.getElementById('high-school-name-option')) return;
            const option = doc.createElement('button');
            option.id = 'high-school-name-option';
            option.type = 'button';
            option.textContent = '\uBD80\uC0B0\uB3D9\uACE0\uB4F1\uD559\uAD50';
            option.addEventListener('mousedown', () => {
                input.value = option.textContent;
                option.remove();
                doc.getElementById('high-school-detail').innerHTML = `
              <label>\uC878\uC5C5\uC77C<input id="high-school-graduation-date" placeholder="YYYY.MM.DD" /></label>
              <button id="high-school-graduation-status" type="button" aria-haspopup="listbox"><p>\uC878\uC5C5\uAD6C\uBD84\uC744 \uC120\uD0DD\uD574\uC8FC\uC138\uC694.</p></button>
              <button id="high-school-location" type="button" aria-haspopup="listbox"><p>\uD559\uAD50 \uC18C\uC7AC\uC9C0\uB97C \uC120\uD0DD\uD574\uC8FC\uC138\uC694.</p></button>
            `;
                addSelectBehavior(doc.getElementById('high-school-graduation-status'), ['\uC878\uC5C5', '\uC878\uC5C5\uC608\uC815']);
                addSelectBehavior(doc.getElementById('high-school-location'), ['\uC11C\uC6B8', '\uBD80\uC0B0']);
            });
            doc.body.append(option);
        });
        const educationProfile = {
            sections: {
                education: {
                    highSchool: {
                        schoolName: '\uBD80\uC0B0\uB3D9\uACE0\uB4F1\uD559\uAD50',
                        graduationDate: '2020-02-28',
                        graduationStatus: '\uC878\uC5C5',
                        location: '\uBD80\uC0B0',
                        track: '\uC778\uBB38\uACC4'
                    }
                }
            },
            customFields: []
        };

        const startedAt = Date.now();
        const result = await applyAutoFillPlanAsync(buildAutoFillPlan(doc, educationProfile));
        const elapsedMs = Date.now() - startedAt;

        expect(result.failed).toEqual([]);
        expect(doc.getElementById('high-school-graduation-date').value).toBe('2020.02.28');
        expect(doc.getElementById('high-school-graduation-status').textContent).toContain('\uC878\uC5C5');
        expect(doc.getElementById('high-school-location').textContent).toContain('\uBD80\uC0B0');
        expect(elapsedMs).toBeLessThan(1500);
    });

    it('EXT-031: ignores Midas school register options when choosing autocomplete results', async () => {
        const doc = document.implementation.createHTMLDocument('application');
        doc.body.innerHTML = `
      <form>
        <section aria-label="\uACE0\uB4F1\uD559\uAD50">
          <h3>\uACE0\uB4F1\uD559\uAD50</h3>
          <label>\uD559\uAD50\uC815\uBCF4<input id="high-school-name" placeholder="\uD559\uAD50\uBA85\uC744 \uAC80\uC0C9\uD574\uC8FC\uC138\uC694." /></label>
          <div id="high-school-detail"></div>
        </section>
      </form>
    `;
        const input = doc.getElementById('high-school-name');
        input.addEventListener('input', () => {
            if (doc.getElementById('high-school-register-option')) return;
            const registerOption = doc.createElement('button');
            registerOption.id = 'high-school-register-option';
            registerOption.type = 'button';
            registerOption.textContent = "'\uBD80\uC0B0\uB3D9\uACE0\uB4F1\uD559\uAD50'\uB4F1\uB85D\uD558\uAE30";
            registerOption.addEventListener('mousedown', () => {
                input.value = registerOption.textContent;
            });
            const schoolOption = doc.createElement('button');
            schoolOption.id = 'high-school-school-option';
            schoolOption.type = 'button';
            schoolOption.textContent = '\uBD80\uC0B0\uB3D9\uACE0\uB4F1\uD559\uAD50';
            schoolOption.addEventListener('mousedown', () => {
                input.value = schoolOption.textContent;
                registerOption.remove();
                schoolOption.remove();
                doc.getElementById('high-school-detail').innerHTML = `
                  <label>\uC785\uD559\uC77C<input id="high-school-admission-date" placeholder="YYYY.MM.DD" /></label>
                  <label>\uC878\uC5C5\uC77C<input id="high-school-graduation-date" placeholder="YYYY.MM.DD" /></label>
                `;
            });
            doc.body.append(registerOption, schoolOption);
        });
        const educationProfile = {
            sections: {
                education: {
                    highSchool: {
                        schoolName: '\uBD80\uC0B0\uB3D9\uACE0\uB4F1\uD559\uAD50',
                        entranceDate: '2017-03-02',
                        graduationDate: '2020-02-28'
                    }
                }
            },
            customFields: []
        };

        const result = await applyAutoFillPlanAsync(buildAutoFillPlan(doc, educationProfile));

        expect(result.failed).toEqual([]);
        expect(doc.getElementById('high-school-name').value).toBe('\uBD80\uC0B0\uB3D9\uACE0\uB4F1\uD559\uAD50');
        expect(doc.getElementById('high-school-admission-date').value).toBe('2017.03.02');
        expect(doc.getElementById('high-school-graduation-date').value).toBe('2020.02.28');
    });

    it('EXT-031: ignores Midas education add buttons while choosing school autocomplete results', async () => {
        const doc = document.implementation.createHTMLDocument('application');
        doc.body.innerHTML = `
      <form>
        <section aria-label="\uACE0\uB4F1\uD559\uAD50">
          <label>\uD559\uAD50\uC815\uBCF4<input id="high-school-name" placeholder="\uD559\uAD50\uBA85\uC744 \uAC80\uC0C9\uD574\uC8FC\uC138\uC694." /></label>
          <div class="period-row">
            <p>\uC7AC\uD559\uAE30\uAC04 *</p>
            <span>\uC785\uD559\uC77C</span>
            <input id="high-school-start" placeholder="\uC785\uD559\uC77C" />
            <span>\uC878\uC5C5\uC77C</span>
            <input id="high-school-end" placeholder="\uC878\uC5C5\uC77C" />
          </div>
        </section>
        <button id="add-high-school" type="button"><svg aria-hidden="true"></svg><p>\uACE0\uB4F1\uD559\uAD50</p></button>
      </form>
    `;
        let addClicked = false;
        doc.getElementById('add-high-school').addEventListener('click', () => {
            addClicked = true;
            doc.body.insertAdjacentHTML('beforeend', '<section id="high-school-2" aria-label="\uACE0\uB4F1\uD559\uAD502"></section>');
        });
        const educationProfile = {
            sections: {
                education: {
                    highSchool: {
                        schoolName: '\uBD80\uC0B0\uB3D9\uACE0\uB4F1\uD559\uAD50',
                        entranceDate: '2017-03-02',
                        graduationDate: '2020-02-28'
                    }
                }
            },
            customFields: []
        };

        const result = await applyAutoFillPlanAsync(buildAutoFillPlan(doc, educationProfile));

        expect(result.failed).toEqual([]);
        expect(addClicked).toBe(false);
        expect(doc.getElementById('high-school-2')).toBeNull();
        expect(doc.getElementById('high-school-name').value).toBe('\uBD80\uC0B0\uB3D9\uACE0\uB4F1\uD559\uAD50');
        expect(doc.getElementById('high-school-start').value).toBe('2017.03.02');
        expect(doc.getElementById('high-school-end').value).toBe('2020.02.28');
    });

    it('EXT-031: distinguishes high school and university fields in shared Midas containers', () => {
        const doc = document.implementation.createHTMLDocument('application');
        doc.body.innerHTML = `
      <form>
        <div>
          <div class="remix-css-1iyoj2o">
            <div class="remix-css-uf1ume"><p>- \uACE0\uB4F1\uD559\uAD50</p></div>
            <div class="remix-css-t25awl">
              <div class="remix-css-ke50n9"><p>\uC878\uC5C5\uC77C</p></div>
              <div class="remix-css-3btwcy"><input id="high-school-end" placeholder="YYYY.MM.DD" /></div>
            </div>
          </div>
          <div class="remix-css-1iyoj2o">
            <div tabindex="0" class="remix-css-1eqh85h"><div><p>\uB300\uD559\uAD50</p></div></div>
            <div class="remix-css-t25awl">
              <div class="remix-css-ke50n9"><p>\uC878\uC5C5\uC77C</p></div>
              <div class="remix-css-3btwcy"><input id="university-end" placeholder="YYYY.MM.DD" /></div>
            </div>
          </div>
        </div>
      </form>
    `;
        const educationProfile = {
            sections: {
                education: {
                    highSchool: {
                        graduationDate: '2020-02-28'
                    },
                    universities: [{
                        graduationDate: '2026-02-20'
                    }]
                }
            },
            customFields: []
        };

        const result = applyAutoFillPlan(buildAutoFillPlan(doc, educationProfile));

        expect(result.failed).toEqual([]);
        expect(doc.getElementById('high-school-end').value).toBe('2020.02.28');
        expect(doc.getElementById('university-end').value).toBe('2026.02.20');
    });

    it('EXT-031: does not treat Midas select placeholders as document values', () => {
        const doc = document.implementation.createHTMLDocument('application');
        doc.body.innerHTML = `
      <form>
        <section aria-label="\uB300\uD559\uAD50">
          <h3>\uB300\uD559\uAD50</h3>
          <button id="major-category" type="button" aria-haspopup="listbox"><p>\uD559\uACFC\uACC4\uC5F4\uC744 \uC120\uD0DD\uD574\uC8FC\uC138\uC694.</p></button>
        </section>
      </form>
    `;
        const educationProfile = {
            sections: {
                education: {
                    universities: [{
                        majorCategory: '\uD559\uACFC\uACC4\uC5F4\uC744 \uC120\uD0DD\uD574\uC8FC\uC138\uC694.'
                    }]
                }
            },
            customFields: []
        };

        const preview = previewAutoFillPlan(buildAutoFillPlan(doc, educationProfile));

        expect(preview.planned.map((item) => item.fieldKey)).not.toContain('education.universities.0.majorCategory');
        expect(preview.failed).toEqual([
            expect.objectContaining({ fieldKey: 'education.universities.*.majorCategory', reason: 'missing_profile_value' })
        ]);
    });

    it('EXT-031: keeps university major category available when nested majors exist', () => {
        const doc = document.implementation.createHTMLDocument('application');
        doc.body.innerHTML = `
      <form>
        <section aria-label="\uB300\uD559\uAD50">
          <h3>\uB300\uD559\uAD50</h3>
          <button id="major-category" type="button" aria-haspopup="listbox"><p>\uD559\uACFC\uACC4\uC5F4\uC744 \uC120\uD0DD\uD574\uC8FC\uC138\uC694.</p></button>
        </section>
      </form>
    `;
        const educationProfile = {
            sections: {
                education: {
                    universities: [{
                        majorCategory: '\uACF5\uD559\uACC4\uC5F4',
                        majors: [{
                            major: '\uBE45\uB370\uC774\uD130\uC5F0\uACC4\uC804\uACF5'
                        }]
                    }]
                }
            },
            customFields: []
        };

        const preview = previewAutoFillPlan(buildAutoFillPlan(doc, educationProfile));

        expect(preview.failed).toEqual([]);
        expect(preview.planned).toEqual(expect.arrayContaining([
            expect.objectContaining({ fieldKey: 'education.universities.0.majorCategory', value: '\uACF5\uD559\uACC4\uC5F4' })
        ]));
    });

    it('EXT-031: derives a broad university department category from nested major categories', () => {
        const doc = document.implementation.createHTMLDocument('application');
        doc.body.innerHTML = `
      <form>
        <section aria-label="\uB300\uD559\uAD50">
          <h3>\uB300\uD559\uAD50</h3>
          <button id="university-major-category" type="button" aria-haspopup="listbox"><p>\uD559\uACFC\uACC4\uC5F4\uC744 \uC120\uD0DD\uD574\uC8FC\uC138\uC694.</p></button>
          <p>\uC804\uACF5 *</p>
          <div class="major-row">
            <div class="remix-css-zezw7x"><p>\uC0B0\uC5C5\uACF5\uD559\uACFC</p></div>
            <button id="major-category-0" type="button" aria-haspopup="listbox"><p>\uC804\uACF5\uACC4\uC5F4\uC744 \uC120\uD0DD\uD574\uC8FC\uC138\uC694.</p></button>
          </div>
        </section>
      </form>
    `;
        const educationProfile = {
            sections: {
                education: {
                    universities: [{
                        majors: [{
                            major: '\uC0B0\uC5C5\uACF5\uD559\uACFC',
                            majorCategory: '\uACF5\uD559\uACC4\uC5F4(\uC0B0\uC5C5)'
                        }]
                    }]
                }
            },
            customFields: []
        };

        const preview = previewAutoFillPlan(buildAutoFillPlan(doc, educationProfile));

        expect(preview.planned).toEqual(expect.arrayContaining([
            expect.objectContaining({
                fieldKey: 'education.universities.0.majors.0.majorCategory',
                value: '\uACF5\uD559\uACC4\uC5F4(\uC0B0\uC5C5)'
            })
        ]));
        expect(preview.planned).toEqual(expect.arrayContaining([
            expect.objectContaining({ fieldKey: 'education.universities.0.majorCategory', value: '\uACF5\uD559' })
        ]));
        expect(preview.planned).not.toEqual(expect.arrayContaining([
            expect.objectContaining({ fieldKey: 'education.universities.0.majorCategory', value: '\uACF5\uD559\uACC4\uC5F4(\uC0B0\uC5C5)' })
        ]));
    });

    it('EXT-031: selects Midas major autocomplete before filling dependent major choice fields', async () => {
        const doc = document.implementation.createHTMLDocument('application');
        doc.body.innerHTML = `
      <form>
        <section aria-label="\uB300\uD559\uAD50">
          <h3>\uB300\uD559\uAD50</h3>
          <p>\uC804\uACF5 *</p>
          <input id="major-name" placeholder="\uC804\uACF5\uBA85\uC744 \uAC80\uC0C9\uD574\uC8FC\uC138\uC694." />
          <button id="major-type" type="button" disabled>\uC8FC\uC804\uACF5</button>
          <button id="major-day" type="button" disabled>\uC8FC\uAC04</button>
        </section>
      </form>
    `;
        const clicked = [];
        const majorInput = doc.getElementById('major-name');
        majorInput.addEventListener('input', () => {
            if (doc.getElementById('major-option')) return;
            const option = doc.createElement('button');
            option.id = 'major-option';
            option.type = 'button';
            option.textContent = '\uBE45\uB370\uC774\uD130\uC5F0\uACC4\uC804\uACF5';
            option.addEventListener('mousedown', () => {
                majorInput.value = option.textContent;
                option.remove();
                doc.getElementById('major-type').disabled = false;
                doc.getElementById('major-day').disabled = false;
            });
            doc.body.append(option);
        });
        doc.getElementById('major-type').addEventListener('click', () => clicked.push('majorType'));
        doc.getElementById('major-day').addEventListener('click', () => clicked.push('dayNight'));
        const educationProfile = {
            sections: {
                education: {
                    universities: [{
                        majors: [{
                            major: '\uBE45\uB370\uC774\uD130\uC5F0\uACC4\uC804\uACF5',
                            majorType: '\uC8FC\uC804\uACF5',
                            dayNight: '\uC8FC\uAC04'
                        }]
                    }]
                }
            },
            customFields: []
        };

        const result = await applyAutoFillPlanAsync(buildAutoFillPlan(doc, educationProfile));

        expect(result.failed).toEqual([]);
        expect(majorInput.value).toBe('\uBE45\uB370\uC774\uD130\uC5F0\uACC4\uC804\uACF5');
        expect(clicked).toEqual(['majorType', 'dayNight']);
    });

    it('EXT-031: waits for Midas major autocomplete before using already-enabled major choices', async () => {
        const doc = document.implementation.createHTMLDocument('application');
        doc.body.innerHTML = `
      <form>
        <section aria-label="\uB300\uD559\uAD50">
          <h3>\uB300\uD559\uAD50</h3>
          <p>\uC804\uACF5 *</p>
          <div class="major-row">
            <label>\uC804\uACF5\uBA85<input id="major-name" placeholder="\uC804\uACF5\uBA85\uC744 \uAC80\uC0C9\uD574\uC8FC\uC138\uC694." /></label>
            <div>
              <p>\uC804\uACF5\uAD6C\uBD84</p>
              <button id="major-type" type="button">\uC8FC\uC804\uACF5</button>
            </div>
            <button id="major-category" type="button" aria-haspopup="listbox" disabled><p>\uC804\uACF5\uACC4\uC5F4\uC744 \uC120\uD0DD\uD574\uC8FC\uC138\uC694.</p></button>
            <div>
              <p>\uC8FC\uAC04/\uC57C\uAC04</p>
              <button id="major-day" type="button">\uC8FC\uAC04</button>
            </div>
          </div>
        </section>
      </form>
    `;
        let optionSelected = false;
        const clicked = [];
        const majorInput = doc.getElementById('major-name');
        const category = doc.getElementById('major-category');
        majorInput.addEventListener('input', () => {
            if (doc.getElementById('major-option')) return;
            setTimeout(() => {
                const option = doc.createElement('button');
                option.id = 'major-option';
                option.type = 'button';
                option.textContent = '\uC0B0\uC5C5\uACF5\uD559\uACFC';
                option.addEventListener('mousedown', () => {
                    optionSelected = true;
                    majorInput.value = option.textContent;
                    category.disabled = false;
                    option.remove();
                });
                doc.body.append(option);
            }, 80);
        });
        category.addEventListener('mousedown', () => {
            if (category.disabled || doc.getElementById('major-category-options')) return;
            const menu = doc.createElement('div');
            menu.id = 'major-category-options';
            menu.innerHTML = ['\uACF5\uD559\uACC4\uC5F4(\uC0B0\uC5C5)', '\uACF5\uD559\uACC4\uC5F4(\uCEF4\uD4E8\uD130\u00B7\uD1B5\uC2E0)'].map((option) => (
                `<div class="menu-row"><p>${option}</p></div>`
            )).join('');
            menu.querySelectorAll('.menu-row').forEach((optionRow) => {
                optionRow.addEventListener('mousedown', () => {
                    category.querySelector('p').textContent = optionRow.textContent.trim();
                    menu.remove();
                });
            });
            doc.body.append(menu);
        });
        doc.getElementById('major-type').addEventListener('click', () => clicked.push('majorType'));
        doc.getElementById('major-day').addEventListener('click', () => clicked.push('dayNight'));
        const educationProfile = {
            sections: {
                education: {
                    universities: [{
                        majors: [{
                            major: '\uC0B0\uC5C5\uACF5\uD559\uACFC',
                            majorType: '\uC8FC\uC804\uACF5',
                            majorCategory: '\uACF5\uD559\uACC4\uC5F4(\uC0B0\uC5C5)',
                            dayNight: '\uC8FC\uAC04'
                        }]
                    }]
                }
            },
            customFields: []
        };

        const result = await applyAutoFillPlanAsync(buildAutoFillPlan(doc, educationProfile));

        expect(result.failed).toEqual([]);
        expect(optionSelected).toBe(true);
        expect(category.textContent).toContain('\uACF5\uD559\uACC4\uC5F4(\uC0B0\uC5C5)');
        expect(clicked).toEqual(['majorType', 'dayNight']);
    });

    it('EXT-031: commits Midas major autocomplete with keyboard when options are not exposed as DOM choices', async () => {
        const doc = document.implementation.createHTMLDocument('application');
        doc.body.innerHTML = `
      <form>
        <section aria-label="\uB300\uD559\uAD50">
          <h3>\uB300\uD559\uAD50</h3>
          <p>\uC804\uACF5 *</p>
          <div class="major-row">
            <label>\uC804\uACF5\uBA85<input id="major-name" placeholder="\uC804\uACF5\uBA85\uC744 \uAC80\uC0C9\uD574\uC8FC\uC138\uC694." /></label>
            <div>
              <p>\uC804\uACF5\uAD6C\uBD84</p>
              <button id="major-type" type="button" disabled>\uC8FC\uC804\uACF5</button>
            </div>
            <button id="major-category" type="button" aria-haspopup="listbox" disabled><p>\uC804\uACF5\uACC4\uC5F4\uC744 \uC120\uD0DD\uD574\uC8FC\uC138\uC694.</p></button>
            <div>
              <p>\uC8FC\uAC04/\uC57C\uAC04</p>
              <button id="major-day" type="button" disabled>\uC8FC\uAC04</button>
            </div>
          </div>
        </section>
      </form>
    `;
        let suggestionReady = false;
        let keyboardCommitted = false;
        const clicked = [];
        const majorInput = doc.getElementById('major-name');
        const category = doc.getElementById('major-category');
        majorInput.addEventListener('input', () => {
            setTimeout(() => {
                suggestionReady = true;
            }, 80);
        });
        majorInput.addEventListener('keydown', (event) => {
            if (event.key !== 'Enter' || !suggestionReady || majorInput.value !== '\uC0B0\uC5C5\uACF5\uD559\uACFC') return;
            keyboardCommitted = true;
            doc.getElementById('major-type').disabled = false;
            doc.getElementById('major-day').disabled = false;
            category.disabled = false;
        });
        category.addEventListener('mousedown', () => {
            if (category.disabled || doc.getElementById('major-category-options')) return;
            const menu = doc.createElement('div');
            menu.id = 'major-category-options';
            menu.innerHTML = ['\uACF5\uD559\uACC4\uC5F4(\uC0B0\uC5C5)', '\uACF5\uD559\uACC4\uC5F4(\uCEF4\uD4E8\uD130\u00B7\uD1B5\uC2E0)'].map((option) => (
                `<div class="menu-row"><p>${option}</p></div>`
            )).join('');
            menu.querySelectorAll('.menu-row').forEach((optionRow) => {
                optionRow.addEventListener('mousedown', () => {
                    category.querySelector('p').textContent = optionRow.textContent.trim();
                    menu.remove();
                });
            });
            doc.body.append(menu);
        });
        doc.getElementById('major-type').addEventListener('click', () => clicked.push('majorType'));
        doc.getElementById('major-day').addEventListener('click', () => clicked.push('dayNight'));
        const educationProfile = {
            sections: {
                education: {
                    universities: [{
                        majors: [{
                            major: '\uC0B0\uC5C5\uACF5\uD559\uACFC',
                            majorType: '\uC8FC\uC804\uACF5',
                            majorCategory: '\uACF5\uD559\uACC4\uC5F4(\uC0B0\uC5C5)',
                            dayNight: '\uC8FC\uAC04'
                        }]
                    }]
                }
            },
            customFields: []
        };

        const result = await applyAutoFillPlanAsync(buildAutoFillPlan(doc, educationProfile));

        expect(result.failed).toEqual([]);
        expect(keyboardCommitted).toBe(true);
        expect(category.textContent).toContain('\uACF5\uD559\uACC4\uC5F4(\uC0B0\uC5C5)');
        expect(clicked).toEqual(['majorType', 'dayNight']);
    });

    it('EXT-031: waits between Midas major autocomplete ArrowDown and Enter before filling dependent controls', async () => {
        const doc = document.implementation.createHTMLDocument('application');
        doc.body.innerHTML = `
      <form>
        <section aria-label="\uB300\uD559\uAD50">
          <h3>\uB300\uD559\uAD50</h3>
          <p>\uC804\uACF5 *</p>
          <div class="major-row">
            <input id="major-name" placeholder="\uC804\uACF5\uBA85\uC744 \uAC80\uC0C9\uD574\uC8FC\uC138\uC694." />
            <button id="major-type" type="button" disabled>\uC8FC\uC804\uACF5</button>
            <button id="major-category" type="button" aria-haspopup="listbox" disabled><p>\uC804\uACF5\uACC4\uC5F4\uC744 \uC120\uD0DD\uD574\uC8FC\uC138\uC694.</p></button>
            <button id="major-day" type="button" disabled>\uC8FC\uAC04</button>
          </div>
        </section>
      </form>
    `;
        const clicked = [];
        let highlighted = false;
        const majorInput = doc.getElementById('major-name');
        const category = doc.getElementById('major-category');
        majorInput.addEventListener('keydown', (event) => {
            if (event.key === 'ArrowDown') {
                setTimeout(() => {
                    highlighted = true;
                }, 30);
                return;
            }
            if (event.key !== 'Enter' || !highlighted || majorInput.value !== '\uC0B0\uC5C5\uACF5\uD559\uACFC') return;
            doc.getElementById('major-type').disabled = false;
            doc.getElementById('major-day').disabled = false;
            category.disabled = false;
        });
        category.addEventListener('mousedown', () => {
            if (category.disabled || doc.getElementById('major-category-options')) return;
            const menu = doc.createElement('div');
            menu.id = 'major-category-options';
            menu.innerHTML = ['\uACF5\uD559\uACC4\uC5F4(\uC0B0\uC5C5)', '\uACF5\uD559\uACC4\uC5F4(\uCEF4\uD4E8\uD130\u00B7\uD1B5\uC2E0)'].map((option) => (
                `<div class="menu-row"><p>${option}</p></div>`
            )).join('');
            menu.querySelectorAll('.menu-row').forEach((optionRow) => {
                optionRow.addEventListener('mousedown', () => {
                    category.querySelector('p').textContent = optionRow.textContent.trim();
                    menu.remove();
                });
            });
            doc.body.append(menu);
        });
        doc.getElementById('major-type').addEventListener('click', () => clicked.push('majorType'));
        doc.getElementById('major-day').addEventListener('click', () => clicked.push('dayNight'));
        const educationProfile = {
            sections: {
                education: {
                    universities: [{
                        majors: [{
                            major: '\uC0B0\uC5C5\uACF5\uD559\uACFC',
                            majorType: '\uC8FC\uC804\uACF5',
                            majorCategory: '\uACF5\uD559\uACC4\uC5F4(\uC0B0\uC5C5)',
                            dayNight: '\uC8FC\uAC04'
                        }]
                    }]
                }
            },
            customFields: []
        };

        const result = await applyAutoFillPlanAsync(buildAutoFillPlan(doc, educationProfile));

        expect(result.failed).toEqual([]);
        expect(category.textContent).toContain('\uACF5\uD559\uACC4\uC5F4(\uC0B0\uC5C5)');
        expect(clicked).toEqual(['majorType', 'dayNight']);
    });

    it('EXT-031: selects Midas major autocomplete options rendered inside dropdown-body button rows', async () => {
        const doc = document.implementation.createHTMLDocument('application');
        doc.body.innerHTML = `
      <form>
        <section aria-label="\uB300\uD559\uAD50">
          <h3>\uB300\uD559\uAD50</h3>
          <p>\uC804\uACF5 *</p>
          <div class="remix-css-yq5w1l">
            <div class="remix-css-1q558ez">
              <div class="remix-css-ugntnr">
                <div class="ats-inline-flex ats-flex-col ats-relative ats-group">
                  <div class="remix-css-1hgtg6w">
                    <input id="major-name" placeholder="\uC804\uACF5\uBA85\uC744 \uAC80\uC0C9\uD574\uC8FC\uC138\uC694." type="text" />
                  </div>
                </div>
              </div>
            </div>
            <div class="remix-css-1uvwtz7">
              <li><button id="major-type" type="button" disabled>\uC8FC\uC804\uACF5</button></li>
              <li><button type="button" disabled>\uC5F0\uACC4\uC804\uACF5</button></li>
            </div>
            <button id="major-category" type="button" aria-haspopup="listbox" disabled><p>\uC804\uACF5\uACC4\uC5F4\uC744 \uC120\uD0DD\uD574\uC8FC\uC138\uC694.</p></button>
            <div class="remix-css-1uvwtz7">
              <li><button id="major-day" type="button" disabled>\uC8FC\uAC04</button></li>
              <li><button type="button" disabled>\uC57C\uAC04</button></li>
            </div>
          </div>
        </section>
      </form>
    `;
        const clicked = [];
        const majorInput = doc.getElementById('major-name');
        const majorWrapper = majorInput.closest('.ats-inline-flex');
        const category = doc.getElementById('major-category');
        majorInput.addEventListener('input', () => {
            if (doc.getElementById('dropdown-body')) return;
            const dropdown = doc.createElement('div');
            dropdown.id = 'dropdown-body';
            dropdown.innerHTML = `
          <ul>
            <li><button type="button"><span>\uC0B0\uC5C5\uACF5\uD559\uACFC</span></button></li>
            <li><button type="button"><span>\uC0B0\uC5C5\uACF5\uD559\uACFC \uAC74\uCD95\uACF5\uD559\uC804\uACF5</span></button></li>
          </ul>
        `;
            dropdown.querySelector('button').addEventListener('mousedown', () => {
                majorWrapper.innerHTML = '<div class="remix-css-zezw7x"><p>\uC0B0\uC5C5\uACF5\uD559\uACFC</p></div>';
                doc.getElementById('major-type').disabled = false;
                doc.getElementById('major-day').disabled = false;
                category.disabled = false;
                dropdown.remove();
            });
            majorWrapper.append(dropdown);
        });
        category.addEventListener('mousedown', () => {
            if (category.disabled || doc.getElementById('major-category-options')) return;
            const menu = doc.createElement('div');
            menu.id = 'major-category-options';
            menu.innerHTML = ['\uACF5\uD559\uACC4\uC5F4(\uC0B0\uC5C5)', '\uACF5\uD559\uACC4\uC5F4(\uCEF4\uD4E8\uD130\u00B7\uD1B5\uC2E0)'].map((option) => (
                `<div class="menu-row"><p>${option}</p></div>`
            )).join('');
            menu.querySelectorAll('.menu-row').forEach((optionRow) => {
                optionRow.addEventListener('mousedown', () => {
                    category.querySelector('p').textContent = optionRow.textContent.trim();
                    menu.remove();
                });
            });
            doc.body.append(menu);
        });
        doc.getElementById('major-type').addEventListener('click', () => clicked.push('majorType'));
        doc.getElementById('major-day').addEventListener('click', () => clicked.push('dayNight'));
        const educationProfile = {
            sections: {
                education: {
                    universities: [{
                        majors: [{
                            major: '\uC0B0\uC5C5\uACF5\uD559\uACFC',
                            majorType: '\uC8FC\uC804\uACF5',
                            majorCategory: '\uACF5\uD559\uACC4\uC5F4(\uC0B0\uC5C5)',
                            dayNight: '\uC8FC\uAC04'
                        }]
                    }]
                }
            },
            customFields: []
        };

        const result = await applyAutoFillPlanAsync(buildAutoFillPlan(doc, educationProfile));

        expect(result.failed).toEqual([]);
        expect(doc.body.textContent).toContain('\uC0B0\uC5C5\uACF5\uD559\uACFC');
        expect(category.textContent).toContain('\uACF5\uD559\uACC4\uC5F4(\uC0B0\uC5C5)');
        expect(clicked).toEqual(['majorType', 'dayNight']);
    });

    it('EXT-031: still clicks Midas major search result when the input lacks autocomplete attributes', async () => {
        const doc = document.implementation.createHTMLDocument('application');
        doc.body.innerHTML = `
      <form>
        <section aria-label="\uB300\uD559\uAD50">
          <h3>\uB300\uD559\uAD50</h3>
          <p>\uC804\uACF5 *</p>
          <div class="remix-css-yq5w1l">
            <div class="remix-css-1q558ez">
              <div class="remix-css-ugntnr">
                <div class="ats-inline-flex ats-flex-col ats-relative ats-group">
                  <div class="remix-css-1hgtg6w">
                    <input id="major-name" type="text" />
                  </div>
                </div>
              </div>
            </div>
            <div class="remix-css-1uvwtz7">
              <li><button id="major-type" type="button" disabled>\uC8FC\uC804\uACF5</button></li>
            </div>
          </div>
        </section>
      </form>
    `;
        let optionClicked = false;
        const majorInput = doc.getElementById('major-name');
        const majorWrapper = majorInput.closest('.ats-inline-flex');
        majorInput.addEventListener('input', () => {
            if (doc.getElementById('dropdown-body')) return;
            const dropdown = doc.createElement('div');
            dropdown.id = 'dropdown-body';
            dropdown.innerHTML = '<ul><li><button type="button"><span>\uC0B0\uC5C5\uACF5\uD559\uACFC</span></button></li></ul>';
            dropdown.querySelector('button').addEventListener('mousedown', () => {
                optionClicked = true;
                majorWrapper.innerHTML = '<div class="remix-css-zezw7x"><p>\uC0B0\uC5C5\uACF5\uD559\uACFC</p></div>';
                doc.getElementById('major-type').disabled = false;
                dropdown.remove();
            });
            majorWrapper.append(dropdown);
        });
        const educationProfile = {
            sections: {
                education: {
                    universities: [{
                        majors: [{
                            major: '\uC0B0\uC5C5\uACF5\uD559\uACFC',
                            majorType: '\uC8FC\uC804\uACF5'
                        }]
                    }]
                }
            },
            customFields: []
        };

        const plan = buildAutoFillPlan(doc, educationProfile);
        const majorItem = plan.fillable.find((item) => item.fieldKey === 'education.universities.0.majors.0.majorName');
        majorItem.autocompleteSearchControl = false;
        const result = await applyAutoFillPlanAsync(plan);

        expect(result.failed).toEqual([]);
        expect(optionClicked).toBe(true);
        expect(doc.body.textContent).toContain('\uC0B0\uC5C5\uACF5\uD559\uACFC');
    });

    it('EXT-031: does not select a shorter Midas major autocomplete candidate when the exact option is absent', async () => {
        const doc = document.implementation.createHTMLDocument('application');
        doc.body.innerHTML = `
      <form>
        <section aria-label="\uB300\uD559\uAD50">
          <h3>\uB300\uD559\uAD50</h3>
          <p>\uC804\uACF5 *</p>
          <div class="remix-css-yq5w1l">
            <div class="remix-css-1q558ez">
              <div class="remix-css-ugntnr">
                <div class="ats-inline-flex ats-flex-col ats-relative ats-group">
                  <div class="remix-css-1hgtg6w">
                    <input id="major-name" placeholder="\uC804\uACF5\uBA85\uC744 \uAC80\uC0C9\uD574\uC8FC\uC138\uC694." type="text" />
                  </div>
                </div>
              </div>
            </div>
            <div class="remix-css-1uvwtz7">
              <li><button id="major-type" type="button" disabled>\uC5F0\uACC4\uC804\uACF5</button></li>
            </div>
          </div>
        </section>
      </form>
    `;
        let shorterOptionClicked = false;
        const majorInput = doc.getElementById('major-name');
        const majorWrapper = majorInput.closest('.ats-inline-flex');
        majorInput.addEventListener('input', () => {
            if (doc.getElementById('dropdown-body')) return;
            const dropdown = doc.createElement('div');
            dropdown.id = 'dropdown-body';
            dropdown.innerHTML = `
          <ul>
            <li><button id="short-major-option" type="button"><span>\uBE45\uB370\uC774\uD130</span></button></li>
            <li><button type="button"><span>\uBE45\uB370\uC774\uD130\uACFC\uD559</span></button></li>
          </ul>
        `;
            dropdown.querySelector('#short-major-option').addEventListener('mousedown', () => {
                shorterOptionClicked = true;
                majorInput.value = '\uBE45\uB370\uC774\uD130';
            });
            majorWrapper.append(dropdown);
        });
        const educationProfile = {
            sections: {
                education: {
                    universities: [{
                        majors: [{
                            major: '\uBE45\uB370\uC774\uD130\uC5F0\uACC4\uC804\uACF5',
                            majorType: '\uC5F0\uACC4\uC804\uACF5'
                        }]
                    }]
                }
            },
            customFields: []
        };

        const result = await applyAutoFillPlanAsync(buildAutoFillPlan(doc, educationProfile));

        expect(shorterOptionClicked).toBe(false);
        expect(result.failed).toEqual(expect.arrayContaining([
            expect.objectContaining({ fieldKey: 'education.universities.0.majors.0.majorName' })
        ]));
    });

    it('EXT-031: selects a Midas major option that appends the saved major type to a short major name', async () => {
        const doc = document.implementation.createHTMLDocument('application');
        doc.body.innerHTML = `
      <form>
        <section aria-label="\uB300\uD559\uAD50">
          <h3>\uB300\uD559\uAD50</h3>
          <p>\uC804\uACF5 *</p>
          <div class="remix-css-yq5w1l">
            <div class="remix-css-1q558ez">
              <div class="remix-css-ugntnr">
                <div class="ats-inline-flex ats-flex-col ats-relative ats-group">
                  <div class="remix-css-1hgtg6w">
                    <input id="major-name" placeholder="\uC804\uACF5\uBA85\uC744 \uAC80\uC0C9\uD574\uC8FC\uC138\uC694." type="text" />
                  </div>
                </div>
              </div>
            </div>
            <div class="remix-css-1uvwtz7">
              <li><button id="major-type-primary" type="button" disabled>\uC8FC\uC804\uACF5</button></li>
              <li><button id="major-type-linked" type="button" disabled>\uC5F0\uACC4\uC804\uACF5</button></li>
            </div>
            <button id="major-category" type="button" disabled><p>\uC804\uACF5\uACC4\uC5F4\uC744 \uC120\uD0DD\uD574\uC8FC\uC138\uC694.</p></button>
            <div class="remix-css-1uvwtz7">
              <li><button id="major-day" type="button" disabled>\uC8FC\uAC04</button></li>
            </div>
          </div>
        </section>
      </form>
    `;
        const clicked = [];
        const majorInput = doc.getElementById('major-name');
        const majorWrapper = majorInput.closest('.ats-inline-flex');
        const majorCategory = doc.getElementById('major-category');
        majorInput.addEventListener('input', () => {
            if (doc.getElementById('dropdown-body')) return;
            const dropdown = doc.createElement('div');
            dropdown.id = 'dropdown-body';
            dropdown.innerHTML = '<button type="button"><span>\uBE45\uB370\uC774\uD130\uC5F0\uACC4\uC804\uACF5</span></button>';
            dropdown.querySelector('button').addEventListener('mousedown', () => {
                majorWrapper.innerHTML = '<div class="remix-css-zezw7x"><p>\uBE45\uB370\uC774\uD130\uC5F0\uACC4\uC804\uACF5</p></div>';
                doc.querySelectorAll('button').forEach((button) => {
                    button.disabled = false;
                });
                dropdown.remove();
            });
            majorWrapper.append(dropdown);
        });
        doc.querySelectorAll('#major-type-primary, #major-type-linked, #major-day').forEach((button) => {
            button.addEventListener('click', () => clicked.push(button.textContent.trim()));
        });
        majorCategory.addEventListener('mousedown', () => {
            if (majorCategory.disabled || doc.getElementById('major-category-options')) return;
            const menu = doc.createElement('div');
            menu.id = 'major-category-options';
            menu.innerHTML = '<button type="button"><p>\uACF5\uD559\uACC4\uC5F4(\uCEF4\uD4E8\uD130\u00B7\uD1B5\uC2E0)</p></button>';
            menu.querySelector('button').addEventListener('mousedown', () => {
                majorCategory.querySelector('p').textContent = '\uACF5\uD559\uACC4\uC5F4(\uCEF4\uD4E8\uD130\u00B7\uD1B5\uC2E0)';
                menu.remove();
            });
            doc.body.append(menu);
        });
        const educationProfile = {
            sections: {
                education: {
                    universities: [{
                        majors: [{
                            major: '\uBE45\uB370\uC774\uD130',
                            majorType: '\uC5F0\uACC4\uC804\uACF5',
                            majorCategory: '\uACF5\uD559\uACC4\uC5F4(\uCEF4\uD4E8\uD130\u00B7\uD1B5\uC2E0)',
                            dayNight: '\uC8FC\uAC04'
                        }]
                    }]
                }
            },
            customFields: []
        };

        const result = await applyAutoFillPlanAsync(buildAutoFillPlan(doc, educationProfile));

        expect(result.failed).toEqual([]);
        expect(doc.body.textContent).toContain('\uBE45\uB370\uC774\uD130\uC5F0\uACC4\uC804\uACF5');
        expect(clicked).toEqual(['\uC5F0\uACC4\uC804\uACF5', '\uC8FC\uAC04']);
        expect(majorCategory.textContent).toContain('\uACF5\uD559\uACC4\uC5F4(\uCEF4\uD4E8\uD130\u00B7\uD1B5\uC2E0)');
    });

    it('EXT-031: treats Midas major rows as dependent even when major name is only an input placeholder', async () => {
        const doc = document.implementation.createHTMLDocument('application');
        doc.body.innerHTML = `
      <form>
        <section aria-label="\uB300\uD559\uAD50">
          <h3>\uB300\uD559\uAD50</h3>
          <p>\uC804\uACF5 *</p>
          <div class="remix-css-yq5w1l">
            <div class="remix-css-1q558ez">
              <div class="remix-css-ugntnr">
                <input id="major-name" placeholder="\uC804\uACF5\uBA85\uC744 \uAC80\uC0C9\uD574\uC8FC\uC138\uC694." type="text" />
              </div>
            </div>
            <div disabled class="remix-css-1uvwtz7">
              <li><button id="major-type" type="button" disabled>\uC8FC\uC804\uACF5</button></li>
              <li><button type="button" disabled>\uC5F0\uACC4\uC804\uACF5</button></li>
            </div>
            <div class="remix-css-1q558ez">
              <button id="major-category" type="button" aria-haspopup="listbox" disabled><p>\uC804\uACF5\uACC4\uC5F4\uC744 \uC120\uD0DD\uD574\uC8FC\uC138\uC694.</p></button>
            </div>
            <div disabled class="remix-css-1uvwtz7">
              <li><button id="major-day" type="button" disabled>\uC8FC\uAC04</button></li>
              <li><button type="button" disabled>\uC57C\uAC04</button></li>
            </div>
          </div>
        </section>
      </form>
    `;
        const clicked = [];
        const majorInput = doc.getElementById('major-name');
        const category = doc.getElementById('major-category');
        majorInput.addEventListener('keydown', (event) => {
            if (event.key !== 'Enter' || majorInput.value !== '\uC0B0\uC5C5\uACF5\uD559\uACFC') return;
            doc.getElementById('major-type').disabled = false;
            doc.getElementById('major-day').disabled = false;
            category.disabled = false;
            doc.querySelectorAll('[disabled].remix-css-1uvwtz7').forEach((wrapper) => wrapper.removeAttribute('disabled'));
        });
        category.addEventListener('mousedown', () => {
            if (category.disabled || doc.getElementById('major-category-options')) return;
            const menu = doc.createElement('div');
            menu.id = 'major-category-options';
            menu.innerHTML = ['\uACF5\uD559\uACC4\uC5F4(\uC0B0\uC5C5)', '\uACF5\uD559\uACC4\uC5F4(\uCEF4\uD4E8\uD130\u00B7\uD1B5\uC2E0)'].map((option) => (
                `<div class="menu-row"><p>${option}</p></div>`
            )).join('');
            menu.querySelectorAll('.menu-row').forEach((optionRow) => {
                optionRow.addEventListener('mousedown', () => {
                    category.querySelector('p').textContent = optionRow.textContent.trim();
                    menu.remove();
                });
            });
            doc.body.append(menu);
        });
        doc.getElementById('major-type').addEventListener('click', () => clicked.push('majorType'));
        doc.getElementById('major-day').addEventListener('click', () => clicked.push('dayNight'));
        const educationProfile = {
            sections: {
                education: {
                    universities: [{
                        majors: [{
                            major: '\uC0B0\uC5C5\uACF5\uD559\uACFC',
                            majorType: '\uC8FC\uC804\uACF5',
                            majorCategory: '\uACF5\uD559\uACC4\uC5F4(\uC0B0\uC5C5)',
                            dayNight: '\uC8FC\uAC04'
                        }]
                    }]
                }
            },
            customFields: []
        };

        const result = await applyAutoFillPlanAsync(buildAutoFillPlan(doc, educationProfile));

        expect(result.failed).toEqual([]);
        expect(category.textContent).toContain('\uACF5\uD559\uACC4\uC5F4(\uC0B0\uC5C5)');
        expect(clicked).toEqual(['majorType', 'dayNight']);
    });

    it('EXT-031: fills each Midas major row with its own major type after autocomplete', async () => {
        const doc = document.implementation.createHTMLDocument('application');
        doc.body.innerHTML = `
      <form>
        <section aria-label="\uB300\uD559\uAD50">
          <h3>\uB300\uD559\uAD50</h3>
          <p>\uC804\uACF5 *</p>
          <div class="major-row" data-row="0">
            <p>\uC804\uACF5 1</p>
            <label>\uC804\uACF5\uBA85<input id="major-name-0" placeholder="\uC804\uACF5\uBA85\uC744 \uAC80\uC0C9\uD574\uC8FC\uC138\uC694." /></label>
            <div>
              <p>\uC804\uACF5\uAD6C\uBD84</p>
              <button type="button" disabled>\uC8FC\uC804\uACF5</button>
              <button type="button" disabled>\uC5F0\uACC4\uC804\uACF5</button>
            </div>
            <div>
              <p>\uC8FC\uAC04/\uC57C\uAC04</p>
              <button type="button" disabled>\uC8FC\uAC04</button>
            </div>
          </div>
          <div class="major-row" data-row="1">
            <p>\uC804\uACF5 2</p>
            <label>\uC804\uACF5\uBA85<input id="major-name-1" placeholder="\uC804\uACF5\uBA85\uC744 \uAC80\uC0C9\uD574\uC8FC\uC138\uC694." /></label>
            <div>
              <p>\uC804\uACF5\uAD6C\uBD84</p>
              <button type="button" disabled>\uC8FC\uC804\uACF5</button>
              <button type="button" disabled>\uC5F0\uACC4\uC804\uACF5</button>
            </div>
            <div>
              <p>\uC8FC\uAC04/\uC57C\uAC04</p>
              <button type="button" disabled>\uC8FC\uAC04</button>
            </div>
          </div>
        </section>
      </form>
    `;
        const clicked = [];
        doc.querySelectorAll('.major-row').forEach((row, rowIndex) => {
            const input = row.querySelector('input');
            input.addEventListener('input', () => {
                const optionId = `major-option-${rowIndex}`;
                if (doc.getElementById(optionId)) return;
                const option = doc.createElement('button');
                option.id = optionId;
                option.type = 'button';
                option.textContent = input.value;
                option.addEventListener('mousedown', () => {
                    input.value = option.textContent;
                    row.querySelectorAll('button').forEach((button) => {
                        button.disabled = false;
                    });
                    option.remove();
                });
                doc.body.append(option);
            });
            row.querySelectorAll('button').forEach((button) => {
                button.addEventListener('click', () => clicked.push(`${row.dataset.row}:${button.textContent.trim()}`));
            });
        });
        const educationProfile = {
            sections: {
                education: {
                    universities: [{
                        majors: [{
                            major: '\uC0B0\uC5C5\uACF5\uD559\uACFC',
                            majorType: '\uC8FC\uC804\uACF5',
                            dayNight: '\uC8FC\uAC04'
                        }, {
                            major: '\uBE45\uB370\uC774\uD130\uC5F0\uACC4\uC804\uACF5',
                            majorType: '\uC5F0\uACC4\uC804\uACF5',
                            dayNight: '\uC8FC\uAC04'
                        }]
                    }]
                }
            },
            customFields: []
        };

        const result = await applyAutoFillPlanAsync(buildAutoFillPlan(doc, educationProfile));

        expect(result.failed).toEqual([]);
        expect(doc.getElementById('major-name-0').value).toBe('\uC0B0\uC5C5\uACF5\uD559\uACFC');
        expect(doc.getElementById('major-name-1').value).toBe('\uBE45\uB370\uC774\uD130\uC5F0\uACC4\uC804\uACF5');
        expect(clicked).toEqual(['0:\uC8FC\uC804\uACF5', '0:\uC8FC\uAC04', '1:\uC5F0\uACC4\uC804\uACF5', '1:\uC8FC\uAC04']);
    });

    it('EXT-031: opens a new row for the second major instead of overwriting the selected first row', () => {
        const doc = document.implementation.createHTMLDocument('application');
        doc.body.innerHTML = `
      <form>
        <section aria-label="\uB300\uD559\uAD50">
          <h3>\uB300\uD559\uAD50</h3>
          <div class="major-row" id="major-row-0">
            <div class="remix-css-zezw7x">\uC0B0\uC5C5\uACF5\uD559\uACFC</div>
            <button type="button">\uC8FC\uC804\uACF5</button>
            <button type="button">\uBCF5\uC218\uC804\uACF5</button>
            <button type="button">\uBD80\uC804\uACF5</button>
            <button type="button">\uC5F0\uACC4\uC804\uACF5</button>
            <button type="button">\uC735\uD569\uC804\uACF5</button>
            <button type="button"><p>\uC804\uACF5\uACC4\uC5F4\uC744 \uC120\uD0DD\uD574\uC8FC\uC138\uC694.</p></button>
            <button type="button">\uC8FC\uAC04</button>
          </div>
          <div class="remix-css-re11db">
            <div class="remix-css-ke50n9"><p>\uC804\uACF5</p><span>*</span></div>
            <div class="remix-css-3btwcy">
              <div direction="column" class="remix-css-1uo98h9">
                <div class="remix-css-161k9a0"></div>
                <button id="add-major" type="button">\uCD94\uAC00\uD558\uAE30</button>
              </div>
            </div>
          </div>
        </section>
      </form>
    `;
        const educationProfile = {
            sections: {
                education: {
                    universities: [{
                        majors: [{
                            major: '\uC0B0\uC5C5\uACF5\uD559\uACFC',
                            majorType: '\uC8FC\uC804\uACF5',
                            dayNight: '\uC8FC\uAC04'
                        }, {
                            major: '\uBE45\uB370\uC774\uD130',
                            majorType: '\uC5F0\uACC4\uC804\uACF5',
                            dayNight: '\uC8FC\uAC04'
                        }]
                    }]
                }
            },
            customFields: []
        };

        const plan = buildAutoFillPlan(doc, educationProfile);

        expect(plan.fillable).toEqual(expect.arrayContaining([
            expect.objectContaining({
                fieldKey: 'education.universities.0.majors.1.majorName.open',
                element: doc.getElementById('add-major'),
                sectionOpenControl: true
            }),
            expect.objectContaining({
                fieldKey: 'education.universities.0.majors.1.majorName',
                element: doc.getElementById('add-major'),
                value: '\uBE45\uB370\uC774\uD130',
                waitForControlBeforeFill: true
            })
        ]));
    });

    it('EXT-031: treats nonstandard removable major chips as selected names before filling another major', () => {
        const doc = document.implementation.createHTMLDocument('application');
        doc.body.innerHTML = `
      <form>
        <section aria-label="\uB300\uD559\uAD50">
          <h3>\uB300\uD559\uAD50</h3>
          <div class="major-row" id="major-row-0">
            <button id="major-chip" type="button">\uC0B0\uC5C5\uACF5\uD559\uACFC<svg><path d="M13.875 8.36328H4.125V9.63829H13.875V8.36328Z"></path></svg></button>
            <button type="button">\uC8FC\uC804\uACF5</button>
            <button type="button">\uC5F0\uACC4\uC804\uACF5</button>
            <button type="button"><p>\uC804\uACF5\uACC4\uC5F4\uC744 \uC120\uD0DD\uD574\uC8FC\uC138\uC694.</p></button>
            <button type="button">\uC8FC\uAC04</button>
          </div>
          <button id="add-major" type="button">\uCD94\uAC00\uD558\uAE30</button>
        </section>
      </form>
    `;
        const educationProfile = {
            sections: {
                education: {
                    universities: [{
                        majors: [{
                            major: '\uC0B0\uC5C5\uACF5\uD559\uACFC',
                            majorType: '\uC8FC\uC804\uACF5',
                            dayNight: '\uC8FC\uAC04'
                        }, {
                            major: '\uBE45\uB370\uC774\uD130',
                            majorType: '\uC5F0\uACC4\uC804\uACF5',
                            dayNight: '\uC8FC\uAC04'
                        }]
                    }]
                }
            },
            customFields: []
        };

        const plan = buildAutoFillPlan(doc, educationProfile);

        expect(plan.fillable).toEqual(expect.arrayContaining([
            expect.objectContaining({
                fieldKey: 'education.universities.0.majors.1.majorName.open',
                element: doc.getElementById('add-major'),
                sectionOpenControl: true
            }),
            expect.objectContaining({
                fieldKey: 'education.universities.0.majors.1.majorName',
                element: doc.getElementById('add-major'),
                value: '\uBE45\uB370\uC774\uD130',
                waitForControlBeforeFill: true
            })
        ]));
        expect(plan.fillable).not.toEqual(expect.arrayContaining([
            expect.objectContaining({
                fieldKey: 'education.universities.0.majors.1.majorName',
                element: doc.getElementById('major-chip')
            })
        ]));
    });

    it('EXT-031: keeps adjacent selected and blank Midas major rows separated', async () => {
        const doc = document.implementation.createHTMLDocument('application');
        doc.body.innerHTML = `
      <form>
        <section aria-label="\uB300\uD559\uAD50">
          <h3>\uB300\uD559\uAD50</h3>
          <p>\uC804\uACF5 *</p>
          <div id="major-container">
            <div class="major-list-wrapper">
              <div class="major-row" id="major-row-0" data-row="0">
                <button id="major-chip-0" type="button" class="remix-css-zezw7x">\uC0B0\uC5C5\uACF5\uD559\uACFC<svg><path d="M13.875 8.36328H4.125V9.63829H13.875V8.36328Z"></path></svg></button>
                <div class="major-types">
                  <button type="button">\uC8FC\uC804\uACF5</button>
                  <button type="button">\uC5F0\uACC4\uC804\uACF5</button>
                </div>
                <button id="major-category-0" type="button" aria-haspopup="listbox"><p>\uACF5\uD559\uACC4\uC5F4(\uC0B0\uC5C5)</p></button>
                <div class="major-day-night">
                  <button type="button">\uC8FC\uAC04</button>
                  <button type="button">\uC57C\uAC04</button>
                </div>
              </div>
              <div class="major-row" id="major-row-1" data-row="1">
                <div class="ats-inline-flex ats-flex-col ats-relative ats-group">
                  <input id="major-name-1" placeholder="\uC804\uACF5\uBA85\uC744 \uAC80\uC0C9\uD574\uC8FC\uC138\uC694." />
                </div>
                <div class="major-types">
                  <button type="button" disabled>\uC8FC\uC804\uACF5</button>
                  <button type="button" disabled>\uC5F0\uACC4\uC804\uACF5</button>
                </div>
                <button id="major-category-1" type="button" aria-haspopup="listbox" disabled><p>\uC804\uACF5\uACC4\uC5F4\uC744 \uC120\uD0DD\uD574\uC8FC\uC138\uC694.</p></button>
                <div class="major-day-night">
                  <button type="button" disabled>\uC8FC\uAC04</button>
                  <button type="button" disabled>\uC57C\uAC04</button>
                </div>
              </div>
            </div>
          </div>
        </section>
      </form>
    `;
        const selectedTypes = {};
        const selectedDayNight = {};
        const installCategoryBehavior = (button, options) => {
            button.addEventListener('mousedown', () => {
                if (button.disabled || doc.getElementById(`${button.id}-options`)) return;
                const menu = doc.createElement('div');
                menu.id = `${button.id}-options`;
                menu.innerHTML = `<div id="design-system-scroll-container">${options.map((option) => `<button type="button"><p>${option}</p></button>`).join('')}</div>`;
                menu.querySelectorAll('button').forEach((optionButton) => {
                    optionButton.addEventListener('mousedown', () => {
                        button.querySelector('p').textContent = optionButton.textContent.trim();
                        menu.remove();
                    });
                });
                doc.body.append(menu);
            });
        };
        const row1 = doc.getElementById('major-row-1');
        const input1 = doc.getElementById('major-name-1');
        input1.addEventListener('input', () => {
            if (doc.getElementById('major-option-1')) return;
            const option = doc.createElement('button');
            option.id = 'major-option-1';
            option.type = 'button';
            option.textContent = input1.value;
            option.addEventListener('mousedown', () => {
                input1.value = option.textContent;
                row1.querySelectorAll('button').forEach((button) => {
                    button.disabled = false;
                });
                option.remove();
            });
            input1.parentElement.append(option);
        });
        doc.querySelectorAll('.major-row').forEach((row) => {
            row.querySelectorAll('.major-types button').forEach((button) => {
                button.addEventListener('click', () => {
                    selectedTypes[row.dataset.row] = button.textContent.trim();
                });
            });
            row.querySelectorAll('.major-day-night button').forEach((button) => {
                button.addEventListener('click', () => {
                    selectedDayNight[row.dataset.row] = button.textContent.trim();
                });
            });
        });
        [doc.getElementById('major-category-0'), doc.getElementById('major-category-1')].forEach((categoryButton) => installCategoryBehavior(categoryButton, [
            '\uACF5\uD559\uACC4\uC5F4(\uC0B0\uC5C5)',
            '\uACF5\uD559\uACC4\uC5F4(\uCEF4\uD4E8\uD130\u00B7\uD1B5\uC2E0)'
        ]));
        const educationProfile = {
            sections: {
                education: {
                    universities: [{
                        majors: [{
                            major: '\uC0B0\uC5C5\uACF5\uD559\uACFC',
                            majorCategory: '\uACF5\uD559\uACC4\uC5F4(\uC0B0\uC5C5)',
                            majorType: '\uC8FC\uC804\uACF5',
                            dayNight: '\uC8FC\uAC04'
                        }, {
                            major: '\uBE45\uB370\uC774\uD130',
                            majorCategory: '\uACF5\uD559\uACC4\uC5F4(\uCEF4\uD4E8\uD130\u00B7\uD1B5\uC2E0)',
                            majorType: '\uC5F0\uACC4\uC804\uACF5',
                            dayNight: '\uC8FC\uAC04'
                        }]
                    }]
                }
            },
            customFields: []
        };

        const result = await applyAutoFillPlanAsync(buildAutoFillPlan(doc, educationProfile));

        expect(result.failed).toEqual([]);
        expect(doc.getElementById('major-chip-0')).not.toBeNull();
        expect(input1.value).toBe('\uBE45\uB370\uC774\uD130');
        expect(doc.getElementById('major-category-1').textContent).toContain('\uACF5\uD559\uACC4\uC5F4(\uCEF4\uD4E8\uD130\u00B7\uD1B5\uC2E0)');
        expect(selectedTypes[1]).toBe('\uC5F0\uACC4\uC804\uACF5');
        expect(selectedDayNight[1]).toBe('\uC8FC\uAC04');
    });

    it('EXT-031: does not fill primary major details into a row already selected with a different major name', async () => {
        const doc = document.implementation.createHTMLDocument('application');
        doc.body.innerHTML = `
      <form>
        <section aria-label="\uB300\uD559\uAD50">
          <h3>\uB300\uD559\uAD50</h3>
          <p>\uC804\uACF5 *</p>
          <div class="major-row" id="major-row-0" data-row="0">
            <input id="major-name-0" placeholder="\uC804\uACF5\uBA85\uC744 \uAC80\uC0C9\uD574\uC8FC\uC138\uC694." value="\uBE45\uB370\uC774\uD130" readonly />
            <button id="major-chip-0" type="button" class="remix-css-zezw7x">\uBE45\uB370\uC774\uD130<svg><path d="M13.875 8.36328H4.125V9.63829H13.875V8.36328Z"></path></svg></button>
            <div class="major-types">
              <button id="row-0-primary" type="button">\uC8FC\uC804\uACF5</button>
              <button id="row-0-linked" type="button">\uC5F0\uACC4\uC804\uACF5</button>
            </div>
            <button id="major-category-0" type="button" aria-haspopup="listbox"><p>\uC804\uACF5\uACC4\uC5F4\uC744 \uC120\uD0DD\uD574\uC8FC\uC138\uC694.</p></button>
            <div class="major-day-night">
              <button type="button">\uC8FC\uAC04</button>
              <button type="button">\uC57C\uAC04</button>
            </div>
          </div>
          <button id="add-major" type="button">\uCD94\uAC00\uD558\uAE30</button>
        </section>
      </form>
        `;
        let row0PrimaryClicks = 0;
        let row1PrimaryClicks = 0;
        let row0LinkedClicks = 0;
        let addClicks = 0;
        doc.getElementById('row-0-primary').addEventListener('click', () => {
            row0PrimaryClicks += 1;
        });
        doc.getElementById('row-0-linked').addEventListener('click', () => {
            row0LinkedClicks += 1;
        });
        const openRow0Category = () => {
            if (doc.getElementById('dropdown-body')) return;
            const menu = doc.createElement('div');
            menu.id = 'dropdown-body';
            menu.setAttribute('role', 'listbox');
            menu.innerHTML = '<button type="button" role="option"><p>\uACF5\uD559\uACC4\uC5F4(\uCEF4\uD4E8\uD130\u00B7\uD1B5\uC2E0)</p></button>';
            menu.querySelector('button').addEventListener('mousedown', () => {
                doc.querySelector('#major-category-0 p').textContent = '\uACF5\uD559\uACC4\uC5F4(\uCEF4\uD4E8\uD130\u00B7\uD1B5\uC2E0)';
                menu.remove();
            });
            doc.getElementById('major-category-0').parentElement.append(menu);
        };
        doc.getElementById('major-category-0').addEventListener('mousedown', openRow0Category);
        doc.getElementById('major-category-0').addEventListener('click', openRow0Category);
        doc.getElementById('add-major').addEventListener('click', () => {
            addClicks += 1;
            if (doc.getElementById('major-name-1')) return;
            const row = doc.createElement('div');
            row.className = 'major-row';
            row.id = 'major-row-1';
            row.dataset.row = '1';
            row.innerHTML = `
        <input id="major-name-1" placeholder="\uC804\uACF5\uBA85\uC744 \uAC80\uC0C9\uD574\uC8FC\uC138\uC694." />
        <div class="major-types">
          <button id="row-1-primary" type="button" disabled>\uC8FC\uC804\uACF5</button>
          <button id="row-1-linked" type="button" disabled>\uC5F0\uACC4\uC804\uACF5</button>
        </div>
        <button id="major-category-1" type="button" aria-haspopup="listbox" disabled><p>\uC804\uACF5\uACC4\uC5F4\uC744 \uC120\uD0DD\uD574\uC8FC\uC138\uC694.</p></button>
        <div class="major-day-night">
          <button type="button" disabled>\uC8FC\uAC04</button>
          <button type="button" disabled>\uC57C\uAC04</button>
        </div>
            `;
            doc.getElementById('add-major').before(row);
            doc.getElementById('row-1-primary').addEventListener('click', () => {
                row1PrimaryClicks += 1;
            });
            const openRow1Category = () => {
                if (doc.getElementById('dropdown-body')) return;
                const menu = doc.createElement('div');
                menu.id = 'dropdown-body';
                menu.setAttribute('role', 'listbox');
                menu.innerHTML = '<button type="button" role="option"><p>\uACF5\uD559\uACC4\uC5F4(\uC0B0\uC5C5)</p></button>';
                menu.querySelector('button').addEventListener('mousedown', () => {
                    doc.querySelector('#major-category-1 p').textContent = '\uACF5\uD559\uACC4\uC5F4(\uC0B0\uC5C5)';
                    menu.remove();
                });
                doc.getElementById('major-category-1').parentElement.append(menu);
            };
            doc.getElementById('major-category-1').addEventListener('mousedown', openRow1Category);
            doc.getElementById('major-category-1').addEventListener('click', openRow1Category);
            const input = doc.getElementById('major-name-1');
            input.addEventListener('input', () => {
                row.querySelectorAll('button').forEach((button) => {
                    button.disabled = false;
                });
                if (doc.getElementById('major-option-1')) return;
                const option = doc.createElement('button');
                option.id = 'major-option-1';
                option.type = 'button';
                option.textContent = input.value;
                option.addEventListener('mousedown', () => {
                    input.value = option.textContent;
                    row.querySelectorAll('button').forEach((button) => {
                        button.disabled = false;
                    });
                    option.remove();
                });
                input.parentElement.append(option);
            });
        });
        const educationProfile = {
            sections: {
                education: {
                    universities: [{
                        majors: [{
                            major: '\uC0B0\uC5C5\uACF5\uD559\uACFC',
                            majorType: '\uC8FC\uC804\uACF5',
                            majorCategory: '\uACF5\uD559\uACC4\uC5F4(\uC0B0\uC5C5)',
                            dayNight: '\uC8FC\uAC04'
                        }, {
                            major: '\uBE45\uB370\uC774\uD130',
                            majorType: '\uC5F0\uACC4\uC804\uACF5',
                            majorCategory: '\uACF5\uD559\uACC4\uC5F4(\uCEF4\uD4E8\uD130\u00B7\uD1B5\uC2E0)',
                            dayNight: '\uC8FC\uAC04'
                        }]
                    }]
                }
            },
            customFields: []
        };

        const result = await applyAutoFillPlanAsync(buildAutoFillPlan(doc, educationProfile));

        expect(result.failed).toEqual([]);
        expect(row0PrimaryClicks).toBe(0);
        expect(row0LinkedClicks).toBe(1);
        expect(row1PrimaryClicks).toBe(1);
        expect(addClicks).toBeGreaterThan(0);
        expect(doc.getElementById('major-name-1')?.value).toBe('\uC0B0\uC5C5\uACF5\uD559\uACFC');
        expect(doc.getElementById('major-category-0')?.textContent).toContain('\uACF5\uD559\uACC4\uC5F4(\uCEF4\uD4E8\uD130\u00B7\uD1B5\uC2E0)');
        expect(doc.getElementById('major-category-1')?.textContent).toContain('\uACF5\uD559\uACC4\uC5F4(\uC0B0\uC5C5)');
    });

    it('EXT-031: plans the major add button when the next visible Midas major row is still disabled', () => {
        const doc = document.implementation.createHTMLDocument('application');
        doc.body.innerHTML = `
      <form>
        <section aria-label="\uB300\uD559\uAD50">
          <h3>\uB300\uD559\uAD50</h3>
          <p>\uC804\uACF5 *</p>
          <div id="major-container">
            <div class="major-list-wrapper">
              <div class="major-row" id="major-row-0" data-row="0">
                <button id="major-chip-0" type="button" class="remix-css-zezw7x">\uC0B0\uC5C5\uACF5\uD559\uACFC<svg><path d="M13.875 8.36328H4.125V9.63829H13.875V8.36328Z"></path></svg></button>
                <button type="button">\uC8FC\uC804\uACF5</button>
                <button type="button"><p>\uACF5\uD559\uACC4\uC5F4(\uC0B0\uC5C5)</p></button>
                <button type="button">\uC8FC\uAC04</button>
              </div>
              <div class="major-row" id="major-row-1" data-row="1" aria-disabled="true">
                <input id="major-name-1" placeholder="\uC804\uACF5\uBA85\uC744 \uAC80\uC0C9\uD574\uC8FC\uC138\uC694." disabled />
                <button type="button" disabled>\uC8FC\uC804\uACF5</button>
                <button type="button" disabled>\uC5F0\uACC4\uC804\uACF5</button>
                <button type="button" aria-haspopup="listbox" disabled><p>\uC804\uACF5\uACC4\uC5F4\uC744 \uC120\uD0DD\uD574\uC8FC\uC138\uC694.</p></button>
                <button type="button" disabled>\uC8FC\uAC04</button>
              </div>
            </div>
          </div>
          <button id="add-major" type="button">+ \uCD94\uAC00\uD558\uAE30</button>
        </section>
      </form>
    `;
        const educationProfile = {
            sections: {
                education: {
                    universities: [{
                        majors: [{
                            major: '\uC0B0\uC5C5\uACF5\uD559\uACFC',
                            majorCategory: '\uACF5\uD559\uACC4\uC5F4(\uC0B0\uC5C5)',
                            majorType: '\uC8FC\uC804\uACF5',
                            dayNight: '\uC8FC\uAC04'
                        }, {
                            major: '\uBE45\uB370\uC774\uD130',
                            majorCategory: '\uACF5\uD559\uACC4\uC5F4(\uCEF4\uD4E8\uD130\u00B7\uD1B5\uC2E0)',
                            majorType: '\uC5F0\uACC4\uC804\uACF5',
                            dayNight: '\uC8FC\uAC04'
                        }]
                    }]
                }
            },
            customFields: []
        };

        const plan = buildAutoFillPlan(doc, educationProfile);

        expect(plan.fillable).toEqual(expect.arrayContaining([
            expect.objectContaining({
                fieldKey: 'education.universities.0.majors.1.majorName.open',
                element: doc.getElementById('add-major'),
                sectionOpenControl: true
            })
        ]));
    });

    it('EXT-031: does not click selected Midas major chips as autocomplete results', async () => {
        const doc = document.implementation.createHTMLDocument('application');
        doc.body.innerHTML = `
      <form>
        <section aria-label="\uB300\uD559\uAD50">
          <h3>\uB300\uD559\uAD50</h3>
          <div class="major-row" id="major-row-0">
            <label>\uC804\uACF5\uBA85<input id="major-name-0" placeholder="\uC804\uACF5\uBA85\uC744 \uAC80\uC0C9\uD574\uC8FC\uC138\uC694." /></label>
            <button id="selected-major-chip" type="button">\uC0B0\uC5C5\uACF5\uD559\uACFC<svg><path d="M13.875 8.36328H4.125V9.63829H13.875V8.36328Z"></path></svg></button>
            <button type="button">\uC8FC\uC804\uACF5</button>
            <button type="button">\uC5F0\uACC4\uC804\uACF5</button>
            <button type="button"><p>\uC804\uACF5\uACC4\uC5F4\uC744 \uC120\uD0DD\uD574\uC8FC\uC138\uC694.</p></button>
            <button type="button">\uC8FC\uAC04</button>
          </div>
          <button id="major-option" type="button">\uC0B0\uC5C5\uACF5\uD559\uACFC</button>
        </section>
      </form>
    `;
        let chipClicked = false;
        doc.getElementById('selected-major-chip').addEventListener('click', () => {
            chipClicked = true;
            doc.getElementById('major-row-0')?.remove();
        });
        doc.getElementById('major-option').addEventListener('mousedown', () => {
            doc.getElementById('major-name-0').value = '\uC0B0\uC5C5\uACF5\uD559\uACFC';
            doc.getElementById('major-option').remove();
        });
        const educationProfile = {
            sections: {
                education: {
                    universities: [{
                        majors: [{
                            major: '\uC0B0\uC5C5\uACF5\uD559\uACFC',
                            majorType: '\uC8FC\uC804\uACF5',
                            dayNight: '\uC8FC\uAC04'
                        }]
                    }]
                }
            },
            customFields: []
        };

        const result = await applyAutoFillPlanAsync(buildAutoFillPlan(doc, educationProfile));

        expect(result.failed).toEqual([]);
        expect(chipClicked).toBe(false);
        expect(doc.getElementById('major-row-0')).not.toBeNull();
        expect(doc.getElementById('major-name-0').value).toBe('\uC0B0\uC5C5\uACF5\uD559\uACFC');
    });

    it('EXT-031: fills Midas major rows created from an empty major list without failing', async () => {
        const doc = document.implementation.createHTMLDocument('application');
        doc.body.innerHTML = `
      <form>
        <section aria-label="\uB300\uD559\uAD50">
          <h3>\uB300\uD559\uAD50</h3>
          <p>\uC804\uACF5 *</p>
          <div id="major-container"></div>
          <button id="add-major" type="button">\uCD94\uAC00\uD558\uAE30</button>
        </section>
      </form>
    `;
        const clicked = [];
        let majorRowCount = 0;
        doc.getElementById('add-major').addEventListener('click', () => {
            const majorIndex = majorRowCount;
            majorRowCount += 1;
            doc.getElementById('major-container').insertAdjacentHTML('beforeend', `
          <div class="major-row">
            <label>\uC804\uACF5\uBA85<input id="major-name-${majorIndex}" placeholder="\uC804\uACF5\uBA85\uC744 \uAC80\uC0C9\uD574\uC8FC\uC138\uC694." /></label>
            <div>
              <p>\uC804\uACF5\uAD6C\uBD84</p>
              <button type="button" data-row="${majorIndex}">\uC8FC\uC804\uACF5</button>
              <button type="button" data-row="${majorIndex}">\uBCF5\uC218\uC804\uACF5</button>
              <button type="button" data-row="${majorIndex}">\uBD80\uC804\uACF5</button>
              <button type="button" data-row="${majorIndex}">\uC5F0\uACC4\uC804\uACF5</button>
              <button type="button" data-row="${majorIndex}">\uC735\uD569\uC804\uACF5</button>
            </div>
            <button id="major-category-${majorIndex}" type="button"><p>\uC804\uACF5\uACC4\uC5F4\uC744 \uC120\uD0DD\uD574\uC8FC\uC138\uC694.</p></button>
            <div>
              <p>\uC8FC\uAC04/\uC57C\uAC04</p>
              <button type="button" data-row="${majorIndex}">\uC8FC\uAC04</button>
              <button type="button" data-row="${majorIndex}">\uC57C\uAC04</button>
            </div>
          </div>
        `);
            doc.querySelectorAll(`button[data-row="${majorIndex}"]`).forEach((button) => {
                button.addEventListener('click', () => clicked.push(`${majorIndex}:${button.textContent.trim()}`));
            });
        });
        const educationProfile = {
            sections: {
                education: {
                    universities: [{
                        majors: [{
                            major: '\uBE45\uB370\uC774\uD130',
                            majorType: '\uC5F0\uACC4\uC804\uACF5',
                            dayNight: '\uC8FC\uAC04'
                        }, {
                            major: '\uC0B0\uC5C5\uACF5\uD559\uACFC',
                            majorType: '\uC8FC\uC804\uACF5',
                            dayNight: '\uC8FC\uAC04'
                        }]
                    }]
                }
            },
            customFields: []
        };

        const result = await applyAutoFillPlanAsync(buildAutoFillPlan(doc, educationProfile));

        expect(result.failed).toEqual([]);
        expect(doc.querySelectorAll('.major-row').length).toBeGreaterThanOrEqual(1);
        expect([doc.getElementById('major-name-0')?.value, doc.getElementById('major-name-1')?.value].filter(Boolean)).toContain('\uBE45\uB370\uC774\uD130');
        expect(clicked.length).toBeGreaterThan(0);
    });

    it('EXT-031: treats the Midas major add area as empty even when the university school chip exists', () => {
        const doc = document.implementation.createHTMLDocument('application');
        doc.body.innerHTML = `
      <form>
        <section aria-label="\uB300\uD559\uAD50">
          <h3>\uB300\uD559\uAD50</h3>
          <div class="remix-css-yq5w1l">
            <p>\uD559\uAD50\uC815\uBCF4</p>
            <div class="remix-css-zezw7x">\uBD80\uC0B0\uB300\uD559\uAD50</div>
            <button type="button" aria-haspopup="listbox"><p>\uD559\uACFC\uACC4\uC5F4\uC744 \uC120\uD0DD\uD574\uC8FC\uC138\uC694.</p></button>
            <button type="button">\uC8FC\uAC04</button>
            <div class="remix-css-re11db">
              <div class="remix-css-ke50n9"><p>\uC804\uACF5</p><span>*</span></div>
              <div class="remix-css-3btwcy">
                <div direction="column" class="remix-css-1uo98h9">
                  <div class="remix-css-161k9a0"></div>
                  <button id="add-major" type="button" class="remix-css-19xd0w2">\uCD94\uAC00\uD558\uAE30</button>
                </div>
              </div>
            </div>
          </div>
        </section>
      </form>
    `;
        const educationProfile = {
            sections: {
                education: {
                    universities: [{
                        schoolName: '\uBD80\uC0B0\uB300\uD559\uAD50',
                        majorCategory: '\uACF5\uD559',
                        majors: [{
                            major: '\uC0B0\uC5C5\uACF5\uD559\uACFC',
                            majorType: '\uC8FC\uC804\uACF5',
                            majorCategory: '\uACF5\uD559\uACC4\uC5F4(\uC0B0\uC5C5)',
                            dayNight: '\uC8FC\uAC04'
                        }]
                    }]
                }
            },
            customFields: []
        };

        const plan = buildAutoFillPlan(doc, educationProfile);

        expect(plan.fillable).toEqual(expect.arrayContaining([
            expect.objectContaining({
                fieldKey: 'education.universities.0.majors.0.majorName.open',
                element: doc.getElementById('add-major'),
                sectionOpenControl: true
            })
        ]));
    });

    it('EXT-031: clicks Midas major autocomplete result before selecting linked major type and category', async () => {
        const doc = document.implementation.createHTMLDocument('application');
        doc.body.innerHTML = `
      <form>
        <section aria-label="\uB300\uD559\uAD50">
          <h3>\uB300\uD559\uAD50</h3>
          <p>\uC804\uACF5 *</p>
          <div class="major-row" data-row="0">
            <div class="ats-inline-flex ats-flex-col ats-relative ats-group">
              <input id="major-name-0" placeholder="\uC804\uACF5\uBA85\uC744 \uAC80\uC0C9\uD574\uC8FC\uC138\uC694." />
            </div>
            <div class="major-types">
              <button type="button" disabled>\uC8FC\uC804\uACF5</button>
              <button type="button" disabled>\uC5F0\uACC4\uC804\uACF5</button>
              <button type="button" disabled>\uBD80\uC804\uACF5</button>
            </div>
            <button id="major-category-0" type="button" disabled><p>\uC804\uACF5\uACC4\uC5F4\uC744 \uC120\uD0DD\uD574\uC8FC\uC138\uC694.</p></button>
            <div class="major-day-night">
              <button type="button" disabled>\uC8FC\uAC04</button>
              <button type="button" disabled>\uC57C\uAC04</button>
            </div>
          </div>
        </section>
      </form>
    `;
        const clicked = [];
        const majorInput = doc.getElementById('major-name-0');
        const majorCategory = doc.getElementById('major-category-0');
        majorInput.addEventListener('input', () => {
            if (doc.getElementById('dropdown-body')) return;
            const dropdown = doc.createElement('div');
            dropdown.id = 'dropdown-body';
            dropdown.innerHTML = '<button type="button"><span>\uBE45\uB370\uC774\uD130\uC5F0\uACC4\uC804\uACF5</span></button>';
            dropdown.querySelector('button').addEventListener('mousedown', () => {
                majorInput.value = '\uBE45\uB370\uC774\uD130\uC5F0\uACC4\uC804\uACF5';
                doc.querySelectorAll('.major-row button').forEach((button) => {
                    button.disabled = false;
                });
                dropdown.remove();
            });
            majorInput.parentElement.append(dropdown);
        });
        doc.querySelectorAll('.major-types button, .major-day-night button').forEach((button) => {
            button.addEventListener('click', () => clicked.push(button.textContent.trim()));
        });
        majorCategory.addEventListener('mousedown', () => {
            if (majorCategory.disabled || doc.getElementById('major-category-options')) return;
            const menu = doc.createElement('div');
            menu.id = 'major-category-options';
            menu.innerHTML = [
                '\uACF5\uD559\uACC4\uC5F4(\uC0B0\uC5C5)',
                '\uACF5\uD559\uACC4\uC5F4(\uCEF4\uD4E8\uD130\u00B7\uD1B5\uC2E0)'
            ].map((option) => `<button type="button"><p>${option}</p></button>`).join('');
            menu.querySelectorAll('button').forEach((optionButton) => {
                optionButton.addEventListener('mousedown', () => {
                    majorCategory.querySelector('p').textContent = optionButton.textContent.trim();
                    menu.remove();
                });
            });
            doc.body.append(menu);
        });
        const educationProfile = {
            sections: {
                education: {
                    universities: [{
                        majors: [{
                            major: '\uBE45\uB370\uC774\uD130\uC5F0\uACC4\uC804\uACF5',
                            majorType: '\uC5F0\uACC4\uC804\uACF5',
                            majorCategory: '\uACF5\uD559\uACC4\uC5F4(\uCEF4\uD4E8\uD130\u00B7\uD1B5\uC2E0)',
                            dayNight: '\uC8FC\uAC04'
                        }]
                    }]
                }
            },
            customFields: []
        };

        const result = await applyAutoFillPlanAsync(buildAutoFillPlan(doc, educationProfile));

        expect(result.failed).toEqual([]);
        expect(doc.getElementById('major-name-0').value).toBe('\uBE45\uB370\uC774\uD130\uC5F0\uACC4\uC804\uACF5');
        expect(clicked).toEqual(['\uC5F0\uACC4\uC804\uACF5', '\uC8FC\uAC04']);
        expect(doc.getElementById('major-category-0').textContent).toContain('\uACF5\uD559\uACC4\uC5F4(\uCEF4\uD4E8\uD130\u00B7\uD1B5\uC2E0)');
    });

    it('EXT-031: does not click Midas icon-only remove buttons while opening major inputs', () => {
        const doc = document.implementation.createHTMLDocument('application');
        doc.body.innerHTML = `
      <form>
        <section aria-label="\uB300\uD559\uAD50">
          <h3>\uB300\uD559\uAD50</h3>
          <div class="major-row" id="major-row-0">
            <input id="major-name-0" placeholder="\uC804\uACF5\uBA85\uC744 \uAC80\uC0C9\uD574\uC8FC\uC138\uC694." value="\uC0B0\uC5C5\uACF5\uD559\uACFC" />
            <button id="remove-major-0" class="remix-css-j7d46e" type="button">
              <svg fill="#6A7081" height="18" viewBox="0 0 18 18" width="18"><path d="M13.875 8.36328H4.125V9.63829H13.875V8.36328Z"></path></svg>
            </button>
            <button type="button">\uC8FC\uC804\uACF5</button>
            <button type="button">\uBCF5\uC218\uC804\uACF5</button>
            <button type="button">\uBD80\uC804\uACF5</button>
            <button type="button">\uC5F0\uACC4\uC804\uACF5</button>
            <button type="button">\uC735\uD569\uC804\uACF5</button>
            <button type="button" aria-haspopup="listbox"><p>\uC804\uACF5\uACC4\uC5F4\uC744 \uC120\uD0DD\uD574\uC8FC\uC138\uC694.</p></button>
            <button type="button">\uC8FC\uAC04</button>
          </div>
          <div class="remix-css-re11db">
            <div class="remix-css-ke50n9"><p>\uC804\uACF5</p><span>*</span></div>
            <div class="remix-css-3btwcy">
              <div direction="column" class="remix-css-1uo98h9">
                <div class="remix-css-161k9a0"></div>
                <button id="add-major" type="button">\uCD94\uAC00\uD558\uAE30</button>
              </div>
            </div>
          </div>
        </section>
      </form>
    `;
        let removeClicked = false;
        const removeButton = doc.getElementById('remove-major-0');
        removeButton.addEventListener('click', () => {
            removeClicked = true;
            doc.getElementById('major-row-0')?.remove();
        });
        doc.getElementById('add-major').addEventListener('click', () => {
            const row = doc.createElement('div');
            row.className = 'major-row';
            row.innerHTML = '<input id="major-name-1" placeholder="\uC804\uACF5\uBA85\uC744 \uAC80\uC0C9\uD574\uC8FC\uC138\uC694." />';
            doc.querySelector('section').append(row);
        });
        const educationProfile = {
            sections: {
                education: {
                    universities: [{
                        majors: [{
                            major: '\uC0B0\uC5C5\uACF5\uD559\uACFC',
                            majorType: '\uC8FC\uC804\uACF5',
                            dayNight: '\uC8FC\uAC04'
                        }, {
                            major: '\uBE45\uB370\uC774\uD130',
                            majorType: '\uC5F0\uACC4\uC804\uACF5',
                            dayNight: '\uC8FC\uAC04'
                        }]
                    }]
                }
            },
            customFields: []
        };

        applyAutoFillPlan(buildAutoFillPlan(doc, educationProfile));

        expect(removeClicked).toBe(false);
        expect(doc.getElementById('major-row-0')).not.toBeNull();
        expect(doc.getElementById('major-name-1')).not.toBeNull();
    });

    it('EXT-031: waits for a delayed second Midas major row without clicking add repeatedly', async () => {
        const doc = document.implementation.createHTMLDocument('application');
        doc.body.innerHTML = `
      <form>
        <section aria-label="\uB300\uD559\uAD50">
          <h3>\uB300\uD559\uAD50</h3>
          <div id="major-container">
            <div class="major-row" id="major-row-0">
              <button type="button" class="remix-css-zezw7x">\uC0B0\uC5C5\uACF5\uD559\uACFC<svg><path d="M13.875 8.36328H4.125V9.63829H13.875V8.36328Z"></path></svg></button>
              <button type="button">\uC8FC\uC804\uACF5</button>
              <button type="button"><p>\uC804\uACF5\uACC4\uC5F4\uC744 \uC120\uD0DD\uD574\uC8FC\uC138\uC694.</p></button>
              <button type="button">\uC8FC\uAC04</button>
            </div>
          </div>
          <button id="add-major" type="button">+ \uCD94\uAC00\uD558\uAE30</button>
        </section>
      </form>
    `;
        let addClicks = 0;
        doc.getElementById('add-major').addEventListener('click', () => {
            addClicks += 1;
            setTimeout(() => {
                if (doc.getElementById('major-row-1')) return;
                doc.getElementById('major-container').insertAdjacentHTML('beforeend', `
            <div class="major-row" id="major-row-1">
              <div class="ats-inline-flex ats-flex-col ats-relative ats-group">
                <input id="major-name-1" placeholder="\uC804\uACF5\uBA85\uC744 \uAC80\uC0C9\uD574\uC8FC\uC138\uC694." />
              </div>
              <button type="button">\uC8FC\uC804\uACF5</button>
              <button type="button">\uC5F0\uACC4\uC804\uACF5</button>
              <button type="button"><p>\uC804\uACF5\uACC4\uC5F4\uC744 \uC120\uD0DD\uD574\uC8FC\uC138\uC694.</p></button>
              <button type="button">\uC8FC\uAC04</button>
            </div>
          `);
                const input = doc.getElementById('major-name-1');
                input.addEventListener('input', () => {
                    if (doc.getElementById('major-option-1')) return;
                    const option = doc.createElement('button');
                    option.id = 'major-option-1';
                    option.type = 'button';
                    option.textContent = input.value;
                    option.addEventListener('mousedown', () => {
                        input.value = option.textContent;
                        option.remove();
                    });
                    input.parentElement.append(option);
                });
            }, 500);
        });
        const educationProfile = {
            sections: {
                education: {
                    universities: [{
                        majors: [{
                            major: '\uC0B0\uC5C5\uACF5\uD559\uACFC',
                            majorType: '\uC8FC\uC804\uACF5',
                            dayNight: '\uC8FC\uAC04'
                        }, {
                            major: '\uBE45\uB370\uC774\uD130',
                            majorType: '\uC5F0\uACC4\uC804\uACF5',
                            dayNight: '\uC8FC\uAC04'
                        }]
                    }]
                }
            },
            customFields: []
        };

        const result = await applyAutoFillPlanAsync(buildAutoFillPlan(doc, educationProfile));

        expect(result.failed).toEqual([]);
        expect(addClicks).toBe(1);
        expect(doc.getElementById('major-name-1').value).toBe('\uBE45\uB370\uC774\uD130');
    });

    it('EXT-031: opens an active row instead of waiting on a disabled Midas major placeholder', async () => {
        const doc = document.implementation.createHTMLDocument('application');
        doc.body.innerHTML = `
      <form>
        <section aria-label="\uB300\uD559\uAD50">
          <h3>\uB300\uD559\uAD50</h3>
          <div class="row">
            <p>\uD559\uACFC\uACC4\uC5F4 *</p>
            <button id="university-major-category" type="button" aria-haspopup="listbox"><p>\uD559\uACFC\uACC4\uC5F4\uC744 \uC120\uD0DD\uD574\uC8FC\uC138\uC694.</p></button>
          </div>
          <p>\uC804\uACF5 *</p>
          <div id="major-container">
            <div class="major-row" id="major-row-0" data-row="0">
              <button type="button" class="remix-css-zezw7x">\uC0B0\uC5C5\uACF5\uD559\uACFC<svg><path d="M13.875 8.36328H4.125V9.63829H13.875V8.36328Z"></path></svg></button>
              <div class="major-types">
                <button type="button">\uC8FC\uC804\uACF5</button>
                <button type="button">\uC5F0\uACC4\uC804\uACF5</button>
              </div>
              <button id="major-category-0" type="button" aria-haspopup="listbox"><p>\uC804\uACF5\uACC4\uC5F4\uC744 \uC120\uD0DD\uD574\uC8FC\uC138\uC694.</p></button>
              <div class="major-day-night">
                <button type="button">\uC8FC\uAC04</button>
                <button type="button">\uC57C\uAC04</button>
              </div>
            </div>
            <div class="major-row disabled-placeholder" id="major-row-placeholder" data-row="1" aria-disabled="true">
              <input id="major-name-placeholder" placeholder="\uC804\uACF5\uBA85\uC744 \uAC80\uC0C9\uD574\uC8FC\uC138\uC694." disabled />
              <div class="major-types">
                <button type="button" disabled>\uC8FC\uC804\uACF5</button>
                <button type="button" disabled>\uC5F0\uACC4\uC804\uACF5</button>
              </div>
              <button id="major-category-placeholder" type="button" aria-haspopup="listbox" disabled><p>\uC804\uACF5\uACC4\uC5F4\uC744 \uC120\uD0DD\uD574\uC8FC\uC138\uC694.</p></button>
              <div class="major-day-night">
                <button type="button" disabled>\uC8FC\uAC04</button>
                <button type="button" disabled>\uC57C\uAC04</button>
              </div>
            </div>
          </div>
          <button id="add-major" type="button">+ \uCD94\uAC00\uD558\uAE30</button>
        </section>
      </form>
    `;
        const selectedTypes = {};
        const selectedDayNight = {};
        let addClicks = 0;
        const installCategoryBehavior = (button, options) => {
            button.addEventListener('mousedown', () => {
                if (button.disabled || doc.getElementById(`${button.id}-options`)) return;
                const menu = doc.createElement('div');
                menu.id = `${button.id}-options`;
                menu.innerHTML = `<div id="design-system-scroll-container">${options.map((option) => `<button type="button"><p>${option}</p></button>`).join('')}</div>`;
                menu.querySelectorAll('button').forEach((optionButton) => {
                    optionButton.addEventListener('mousedown', () => {
                        button.querySelector('p').textContent = optionButton.textContent.trim();
                        menu.remove();
                    });
                });
                doc.body.append(menu);
            });
        };
        const installRowBehavior = (row) => {
            const input = row.querySelector('input');
            if (input) {
                input.addEventListener('input', () => {
                    if (row.querySelector(`#${input.id}-option`)) return;
                    const option = doc.createElement('button');
                    option.id = `${input.id}-option`;
                    option.type = 'button';
                    option.textContent = input.value;
                    option.addEventListener('mousedown', () => {
                        input.value = option.textContent;
                        option.remove();
                    });
                    input.parentElement.append(option);
                });
            }
            row.querySelectorAll('.major-types button').forEach((button) => {
                button.addEventListener('click', () => {
                    selectedTypes[row.dataset.row] = button.textContent.trim();
                });
            });
            row.querySelectorAll('.major-day-night button').forEach((button) => {
                button.addEventListener('click', () => {
                    selectedDayNight[row.dataset.row] = button.textContent.trim();
                });
            });
            installCategoryBehavior(row.querySelector('[id^="major-category-"]'), [
                '\uACF5\uD559\uACC4\uC5F4(\uC0B0\uC5C5)',
                '\uACF5\uD559\uACC4\uC5F4(\uCEF4\uD4E8\uD130\u00B7\uD1B5\uC2E0)'
            ]);
        };
        installCategoryBehavior(doc.getElementById('university-major-category'), ['\uACF5\uD559', '\uC790\uC5F0']);
        installRowBehavior(doc.getElementById('major-row-0'));
        doc.getElementById('add-major').addEventListener('click', () => {
            addClicks += 1;
            doc.getElementById('major-row-placeholder')?.remove();
            doc.getElementById('major-container').insertAdjacentHTML('beforeend', `
          <div class="major-row" id="major-row-1" data-row="1">
            <div class="ats-inline-flex ats-flex-col ats-relative ats-group">
              <input id="major-name-1" placeholder="\uC804\uACF5\uBA85\uC744 \uAC80\uC0C9\uD574\uC8FC\uC138\uC694." />
            </div>
            <div class="major-types">
              <button type="button">\uC8FC\uC804\uACF5</button>
              <button type="button">\uC5F0\uACC4\uC804\uACF5</button>
            </div>
            <button id="major-category-1" type="button" aria-haspopup="listbox"><p>\uC804\uACF5\uACC4\uC5F4\uC744 \uC120\uD0DD\uD574\uC8FC\uC138\uC694.</p></button>
            <div class="major-day-night">
              <button type="button">\uC8FC\uAC04</button>
              <button type="button">\uC57C\uAC04</button>
            </div>
          </div>
        `);
            installRowBehavior(doc.getElementById('major-row-1'));
        });
        const educationProfile = {
            sections: {
                education: {
                    universities: [{
                        majorCategory: '\uACF5\uD559',
                        majors: [{
                            major: '\uC0B0\uC5C5\uACF5\uD559\uACFC',
                            majorCategory: '\uACF5\uD559\uACC4\uC5F4(\uC0B0\uC5C5)',
                            majorType: '\uC8FC\uC804\uACF5',
                            dayNight: '\uC8FC\uAC04'
                        }, {
                            major: '\uBE45\uB370\uC774\uD130',
                            majorCategory: '\uACF5\uD559\uACC4\uC5F4(\uCEF4\uD4E8\uD130\u00B7\uD1B5\uC2E0)',
                            majorType: '\uC5F0\uACC4\uC804\uACF5',
                            dayNight: '\uC8FC\uAC04'
                        }]
                    }]
                }
            },
            customFields: []
        };

        const result = await applyAutoFillPlanAsync(buildAutoFillPlan(doc, educationProfile));

        expect(result.failed).toEqual([]);
        expect(addClicks).toBe(1);
        expect(doc.getElementById('university-major-category').textContent).toContain('\uACF5\uD559');
        expect(doc.getElementById('major-category-0').textContent).toContain('\uACF5\uD559\uACC4\uC5F4(\uC0B0\uC5C5)');
        expect(selectedTypes[0]).toBe('\uC8FC\uC804\uACF5');
        expect(selectedDayNight[0]).toBe('\uC8FC\uAC04');
        expect(doc.getElementById('major-name-1').value).toBe('\uBE45\uB370\uC774\uD130');
        expect(doc.getElementById('major-category-1').textContent).toContain('\uACF5\uD559\uACC4\uC5F4(\uCEF4\uD4E8\uD130\u00B7\uD1B5\uC2E0)');
        expect(selectedTypes[1]).toBe('\uC5F0\uACC4\uC804\uACF5');
        expect(selectedDayNight[1]).toBe('\uC8FC\uAC04');
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

    it('EXT-029: does not use a Midas register option as the selected certificate name', async () => {
        const doc = document.implementation.createHTMLDocument('application');
        doc.body.innerHTML = `
      <form>
        <section aria-label="\uC790\uACA9\uC99D">
          <h3>\uC790\uACA9\uC99D</h3>
          <label>\uC790\uACA9\uC99D\uBA85
            <input id="certificate-search" role="combobox" aria-autocomplete="list" aria-controls="certificate-options" placeholder="\uC790\uACA9\uC99D\uBA85\uC744 \uAC80\uC0C9\uD574\uC8FC\uC138\uC694." />
          </label>
          <div id="certificate-options" role="listbox"></div>
          <label>\uBC1C\uAE09\uAE30\uAD00<input id="certificate-issuer" /></label>
          <label>\uCDE8\uB4DD\uC77C<input id="certificate-date" /></label>
          <label>\uB4F1\uB85D\uBC88\uD638<input id="certificate-registration" /></label>
        </section>
      </form>
    `;
        const search = doc.getElementById('certificate-search');
        search.addEventListener('input', () => {
            doc.getElementById('certificate-options').innerHTML = `
        <button id="register-certificate" type="button" role="option">'ADsP(\uB370\uC774\uD130 \uBD84\uC11D \uC900\uC804\uBB38\uAC00)'\uB4F1\uB85D\uD558\uAE30</button>
      `;
            doc.getElementById('register-certificate').addEventListener('click', () => {
                search.value = "'ADsP(\uB370\uC774\uD130 \uBD84\uC11D \uC900\uC804\uBB38\uAC00)'\uB4F1\uB85D\uD558\uAE30";
            });
        });
        const certificateProfile = {
            sections: {
                certificates: {
                    certificates: [{
                        certificateName: 'ADsP(\uB370\uC774\uD130 \uBD84\uC11D \uC900\uC804\uBB38\uAC00)',
                        issuer: '\uD55C\uAD6D\uB370\uC774\uD130\uC0B0\uC5C5\uC9C4\uD765\uC6D0',
                        acquiredDate: '2025-04-21',
                        registrationNumber: 'ADSP-001'
                    }]
                }
            },
            customFields: []
        };

        const result = await applyAutoFillPlanAsync(buildAutoFillPlan(doc, certificateProfile));

        expect(result.failed).toEqual([]);
        expect(search.value).toBe('ADsP(\uB370\uC774\uD130 \uBD84\uC11D \uC900\uC804\uBB38\uAC00)');
        expect(doc.getElementById('certificate-issuer').value).toBe('\uD55C\uAD6D\uB370\uC774\uD130\uC0B0\uC5C5\uC9C4\uD765\uC6D0');
        expect(doc.getElementById('certificate-date').value).toBe('2025-04-21');
        expect(doc.getElementById('certificate-registration').value).toBe('ADSP-001');
    });

    it('EXT-032: opens language and certificate rows before filling fields that render later', async () => {
        const doc = document.implementation.createHTMLDocument('application');
        doc.body.innerHTML = `
      <form>
        <section aria-label="\uC5B4\uD559">
          <h3>\uACF5\uC778\uC678\uAD6D\uC5B4\uC2DC\uD5D8</h3>
          <button id="add-language-test" type="button">\uCD94\uAC00\uD558\uAE30</button>
          <div id="language-test-fields"></div>
        </section>
        <section aria-label="\uC790\uACA9\uC99D">
          <h3>\uC790\uACA9\uC99D</h3>
          <button id="add-certificate" type="button">\uCD94\uAC00\uD558\uAE30</button>
          <div id="certificate-fields"></div>
        </section>
      </form>
    `;
        doc.getElementById('add-language-test').addEventListener('click', () => {
            doc.getElementById('language-test-fields').innerHTML = `
        <label>\uC2DC\uD5D8\uBA85<input id="language-test-name" /></label>
        <label>\uC810\uC218/\uB4F1\uAE09<input id="language-score" /></label>
        <label>\uCDE8\uB4DD\uC77C<input id="language-date" /></label>
        <label>\uB4F1\uB85D\uBC88\uD638<input id="language-registration" /></label>
      `;
        });
        doc.getElementById('add-certificate').addEventListener('click', () => {
            doc.getElementById('certificate-fields').innerHTML = `
        <label>\uC790\uACA9\uC99D\uBA85<input id="certificate-name" /></label>
        <label>\uBC1C\uAE09\uAE30\uAD00<input id="certificate-issuer" /></label>
        <label>\uCDE8\uB4DD\uC77C<input id="certificate-date" /></label>
        <label>\uB4F1\uB85D\uBC88\uD638<input id="certificate-registration" /></label>
      `;
        });
        const certificateProfile = {
            sections: {
                certificates: {
                    languageTests: [{
                        testName: 'OPIc',
                        score: 'IM1',
                        acquiredDate: '2024-06-01',
                        registrationNumber: 'OPIC-001'
                    }],
                    certificates: [{
                        certificateName: '\uC815\uBCF4\uCC98\uB9AC\uAE30\uC0AC',
                        issuer: '\uD55C\uAD6D\uC0B0\uC5C5\uC778\uB825\uACF5\uB2E8',
                        acquiredDate: '2025-09-12',
                        registrationNumber: 'IPE-001'
                    }]
                }
            },
            customFields: []
        };

        const result = await applyAutoFillPlanAsync(buildAutoFillPlan(doc, certificateProfile));

        expect(doc.getElementById('language-test-name').value).toBe('OPIc');
        expect(doc.getElementById('language-score').value).toBe('IM1');
        expect(doc.getElementById('language-date').value).toBe('2024-06-01');
        expect(doc.getElementById('language-registration').value).toBe('OPIC-001');
        expect(doc.getElementById('certificate-name').value).toBe('\uC815\uBCF4\uCC98\uB9AC\uAE30\uC0AC');
        expect(doc.getElementById('certificate-issuer').value).toBe('\uD55C\uAD6D\uC0B0\uC5C5\uC778\uB825\uACF5\uB2E8');
        expect(doc.getElementById('certificate-date').value).toBe('2025-09-12');
        expect(doc.getElementById('certificate-registration').value).toBe('IPE-001');
        expect(result.failed).toEqual([]);
    });

    it('EXT-032: opens and fills multiple language test rows in order', async () => {
        const doc = document.implementation.createHTMLDocument('application');
        doc.body.innerHTML = `
      <form>
        <section aria-label="\uC5B4\uD559">
          <h3>\uACF5\uC778\uC678\uAD6D\uC5B4\uC2DC\uD5D8</h3>
          <button id="add-language-test" type="button">\uCD94\uAC00\uD558\uAE30</button>
          <div id="language-test-fields"></div>
        </section>
      </form>
    `;
        doc.getElementById('add-language-test').addEventListener('click', () => {
            const index = doc.querySelectorAll('.language-row').length;
            const row = doc.createElement('div');
            row.className = 'language-row';
            row.innerHTML = `
        <label>\uC2DC\uD5D8\uBA85<input id="language-test-name-${index}" role="combobox" aria-autocomplete="list" /></label>
        <label>\uC810\uC218/\uB4F1\uAE09<input id="language-score-${index}" /></label>
        <label>\uCDE8\uB4DD\uC77C<input id="language-date-${index}" /></label>
        <label>\uB4F1\uB85D\uBC88\uD638<input id="language-registration-${index}" /></label>
      `;
            doc.getElementById('language-test-fields').append(row);
            row.querySelector('input[role="combobox"]').addEventListener('input', (event) => {
                event.currentTarget.value = event.currentTarget.value;
            });
        });
        const certificateProfile = {
            sections: {
                certificates: {
                    languageTests: [{
                        testName: 'OPIc',
                        score: 'IM1',
                        acquiredDate: '2025-04-21',
                        registrationNumber: 'OPIC-001'
                    }, {
                        testName: 'TOEIC',
                        score: '850',
                        acquiredDate: '2024-12-15',
                        registrationNumber: 'TOEIC-002'
                    }]
                }
            },
            customFields: []
        };

        const startedAt = Date.now();
        const result = await applyAutoFillPlanAsync(buildAutoFillPlan(doc, certificateProfile));
        const elapsedMs = Date.now() - startedAt;

        expect(result.failed).toEqual([]);
        expect(elapsedMs).toBeLessThan(2000);
        expect(doc.getElementById('language-test-name-0').value).toBe('OPIc');
        expect(doc.getElementById('language-score-0').value).toBe('IM1');
        expect(doc.getElementById('language-date-0').value).toBe('2025-04-21');
        expect(doc.getElementById('language-registration-0').value).toBe('OPIC-001');
        expect(doc.getElementById('language-test-name-1').value).toBe('TOEIC');
        expect(doc.getElementById('language-score-1').value).toBe('850');
        expect(doc.getElementById('language-date-1').value).toBe('2024-12-15');
        expect(doc.getElementById('language-registration-1').value).toBe('TOEIC-002');
    });

    it('EXT-032: treats Midas language search placeholders as test names and fills the revealed fields', async () => {
        const doc = document.implementation.createHTMLDocument('application');
        doc.body.innerHTML = `
      <form>
        <section aria-label="\uC5B4\uD559/\uC790\uACA9/\uAE30\uD0C0">
          <h3>\uC5B4\uD559/\uC790\uACA9/\uAE30\uD0C0</h3>
          <div class="language-panel">
            <h4>\uACF5\uC778\uC678\uAD6D\uC5B4\uC2DC\uD5D8</h4>
            <button id="add-language-test" type="button">\uCD94\uAC00\uD558\uAE30</button>
            <div id="language-fields"></div>
          </div>
        </section>
      </form>
    `;
        doc.getElementById('add-language-test').addEventListener('click', () => {
            doc.getElementById('language-fields').innerHTML = `
        <div class="language-row">
          <div class="ats-inline-flex ats-flex-col ats-relative ats-group">
            <input id="language-test-name" placeholder="\uC2DC\uD5D8\uC744 \uAC80\uC0C9\uD574\uC8FC\uC138\uC694" />
            <div id="dropdown-body"></div>
          </div>
          <div id="language-detail"></div>
        </div>
      `;
            const input = doc.getElementById('language-test-name');
            input.addEventListener('input', () => {
                doc.getElementById('dropdown-body').innerHTML = '<button id="opic-option" type="button" role="option">OPIc(\uC601\uC5B4)</button>';
                doc.getElementById('opic-option').addEventListener('mousedown', () => {
                    input.value = 'OPIc(\uC601\uC5B4)';
                    doc.getElementById('language-detail').innerHTML = `
            <label>2024.06.01 \uC774\uD6C4 \uC810\uC218\uB9CC \uC678\uAD6D\uC5B4 \uC810\uC218\uB85C \uC778\uC815<input id="language-score" /></label>
            <label>\uCDE8\uB4DD\uC77C<input id="language-date" /></label>
            <label>\uB4F1\uB85D\uBC88\uD638<input id="language-registration" /></label>
          `;
                });
            });
        });
        const languageProfile = {
            sections: {
                certificates: {
                    languageTests: [{
                        testName: 'OPIc(\uC601\uC5B4)',
                        score: 'IM1',
                        acquiredDate: '2025-04-21',
                        registrationNumber: '2K0014711552'
                    }]
                }
            },
            customFields: []
        };

        const result = await applyAutoFillPlanAsync(buildAutoFillPlan(doc, languageProfile));

        expect(result.failed).toEqual([]);
        expect(doc.getElementById('language-test-name').value).toBe('OPIc(\uC601\uC5B4)');
        expect(doc.getElementById('language-score').value).toBe('IM1');
        expect(doc.getElementById('language-date').value).toBe('2025-04-21');
        expect(doc.getElementById('language-registration').value).toBe('2K0014711552');
    });

    it('EXT-032: fills Midas language 응시일 and 등급 labels after the test is selected', async () => {
        const doc = document.implementation.createHTMLDocument('application');
        doc.body.innerHTML = `
      <form>
        <section aria-label="\uC5B4\uD559/\uC790\uACA9/\uAE30\uD0C0">
          <h3>\uACF5\uC778\uC678\uAD6D\uC5B4\uC2DC\uD5D8</h3>
          <button id="add-language-test" type="button">\uCD94\uAC00\uD558\uAE30</button>
          <div id="language-fields"></div>
        </section>
      </form>
    `;
        doc.getElementById('add-language-test').addEventListener('click', () => {
            doc.getElementById('language-fields').innerHTML = `
        <div class="language-row">
          <label>\uACF5\uC778\uC678\uAD6D\uC5B4\uC2DC\uD5D8<input id="language-test-name" placeholder="\uC2DC\uD5D8\uC744 \uAC80\uC0C9\uD574\uC8FC\uC138\uC694" /></label>
          <label>\uB4F1\uB85D\uBC88\uD638<input id="language-registration" /></label>
          <label>\uC751\uC2DC\uC77C<input id="language-date" /></label>
          <label>\uB4F1\uAE09<input id="language-score" /></label>
        </div>
      `;
        });
        const languageProfile = {
            sections: {
                certificates: {
                    languageTests: [{
                        testName: 'OPIc(\uC601\uC5B4)',
                        score: 'IM1',
                        acquiredDate: '2025-04-21',
                        registrationNumber: '2K0014711552'
                    }]
                }
            },
            customFields: []
        };

        const result = await applyAutoFillPlanAsync(buildAutoFillPlan(doc, languageProfile));

        expect(result.failed).toEqual([]);
        expect(doc.getElementById('language-test-name').value).toBe('OPIc(\uC601\uC5B4)');
        expect(doc.getElementById('language-registration').value).toBe('2K0014711552');
        expect(doc.getElementById('language-date').value).toBe('2025-04-21');
        expect(doc.getElementById('language-score').value).toBe('IM1');
    });

    it('EXT-032: fills Midas language grade custom select when the language heading is a sibling', async () => {
        const doc = document.implementation.createHTMLDocument('application');
        doc.body.innerHTML = `
      <form>
        <h2>\uC5B4\uD559</h2>
        <div class="language-row">
          <label>\uACF5\uC778\uC678\uAD6D\uC5B4\uC2DC\uD5D8<input id="language-test-name" placeholder="\uC2DC\uD5D8\uC744 \uAC80\uC0C9\uD574\uC8FC\uC138\uC694" /></label>
          <label>\uB4F1\uB85D\uBC88\uD638<input id="language-registration" /></label>
          <label>\uC751\uC2DC\uC77C<input id="language-date" /></label>
          <button id="language-score" type="button" aria-haspopup="listbox">\uB4F1\uAE09</button>
          <div id="language-grade-options"></div>
        </div>
      </form>
    `;
        doc.getElementById('language-score').addEventListener('click', () => {
            doc.getElementById('language-grade-options').innerHTML = `
        <button type="button" role="option">Advanced Low</button>
        <button type="button" role="option">Intermediate High</button>
        <button type="button" role="option">Intermediate Mid 3</button>
        <button type="button" role="option">Intermediate Mid 2</button>
        <button id="grade-im1" type="button" role="option">Intermediate Mid 1</button>
        <button type="button" role="option">Intermediate Low</button>
      `;
            doc.getElementById('grade-im1').addEventListener('click', () => {
                doc.getElementById('language-score').textContent = 'Intermediate Mid 1';
            });
        });
        const languageProfile = {
            sections: {
                certificates: {
                    languageTests: [{
                        testName: 'OPIc(\uC601\uC5B4)',
                        score: 'IM1',
                        acquiredDate: '2025-04-21',
                        registrationNumber: '2K0014711552'
                    }]
                }
            },
            customFields: []
        };

        const result = await applyAutoFillPlanAsync(buildAutoFillPlan(doc, languageProfile));

        expect(result.failed).toEqual([]);
        expect(doc.getElementById('language-registration').value).toBe('2K0014711552');
        expect(doc.getElementById('language-date').value).toBe('2025-04-21');
        expect(doc.getElementById('language-score').textContent).toContain('Intermediate Mid 1');
    });

    it('EXT-032: keeps an already-selected Midas language chip and fills the remaining fields', async () => {
        const doc = document.implementation.createHTMLDocument('application');
        doc.body.innerHTML = `
      <form>
        <section aria-label="\uC5B4\uD559/\uC790\uACA9/\uAE30\uD0C0">
          <h2>\uC5B4\uD559</h2>
          <div class="language-row">
            <button id="selected-language" type="button">
              <span>OPIc(\uC601\uC5B4)</span>
              <span aria-hidden="true">\u00D7</span>
            </button>
            <input id="language-registration" name="languageGroupAnswer.languageExamAnswers.0.registNumber" placeholder="\uB4F1\uB85D\uBC88\uD638" />
            <input id="language-date" placeholder="\uC751\uC2DC\uC77C" />
            <button id="language-score" type="button" aria-haspopup="listbox">\uB4F1\uAE09</button>
            <div id="language-grade-options"></div>
          </div>
        </section>
      </form>
    `;
        let selectedLanguageClicks = 0;
        doc.getElementById('selected-language').addEventListener('click', () => {
            selectedLanguageClicks += 1;
        });
        doc.getElementById('language-score').addEventListener('click', () => {
            doc.getElementById('language-grade-options').innerHTML = `
        <button id="grade-im1" type="button" role="option">IM1</button>
      `;
            doc.getElementById('grade-im1').addEventListener('click', () => {
                doc.getElementById('language-score').textContent = 'IM1';
            });
        });
        const languageProfile = {
            sections: {
                certificates: {
                    languageTests: [{
                        testName: 'OPIc(\uC601\uC5B4)',
                        score: 'IM1',
                        acquiredDate: '2025-04-21',
                        registrationNumber: '2K0014711552'
                    }]
                }
            },
            customFields: []
        };

        const result = await applyAutoFillPlanAsync(buildAutoFillPlan(doc, languageProfile));

        expect(result.failed).toEqual([]);
        expect(selectedLanguageClicks).toBe(0);
        expect(doc.getElementById('language-registration').value).toBe('2K0014711552');
        expect(doc.getElementById('language-date').value).toBe('2025-04-21');
        expect(doc.getElementById('language-score').textContent).toContain('IM1');
    });

    it('EXT-032: opens the Midas certificate tab before adding and filling certificate rows', async () => {
        const doc = document.implementation.createHTMLDocument('application');
        doc.body.innerHTML = `
      <form>
        <aside>
          <div id="language-nav" tabindex="0">\uC5B4\uD559 \uB2A5\uB825</div>
          <div id="certificate-nav" tabindex="0">\uC790\uACA9\uC99D</div>
        </aside>
        <main id="application-main">
          <section aria-label="\uC5B4\uD559">
            <h2>\uC5B4\uD559</h2>
          </section>
        </main>
      </form>
    `;
        let certificateNavClicks = 0;
        let certificateAddClicks = 0;
        doc.getElementById('certificate-nav').addEventListener('click', () => {
            certificateNavClicks += 1;
            doc.getElementById('application-main').innerHTML = `
        <section aria-label="\uC790\uACA9\uC99D">
          <h2>\uC790\uACA9/\uC9C0\uC2DD/\uAE30\uC220</h2>
          <h3>\uC790\uACA9\uC99D</h3>
          <button id="add-certificate" type="button">+ \uCD94\uAC00\uD558\uAE30</button>
          <div id="certificate-fields"></div>
        </section>
      `;
            doc.getElementById('add-certificate').addEventListener('click', () => {
                certificateAddClicks += 1;
                const index = doc.querySelectorAll('.certificate-row').length;
                const row = doc.createElement('div');
                row.className = 'certificate-row';
                row.innerHTML = `
          <input id="certificate-name-${index}" placeholder="\uC790\uACA9\uC99D\uBA85\uC744 \uAC80\uC0C9\uD574\uC8FC\uC138\uC694." />
          <input id="certificate-issuer-${index}" placeholder="\uBC1C\uAE09\uAE30\uAD00\uC744 \uC785\uB825\uD574\uC8FC\uC138\uC694." />
          <input id="certificate-date-${index}" placeholder="\uCDE8\uB4DD\uC77C" />
          <input id="certificate-registration-${index}" placeholder="\uB4F1\uB85D\uBC88\uD638\uB97C \uC785\uB825\uD574\uC8FC\uC138\uC694." />
        `;
                doc.getElementById('certificate-fields').append(row);
            });
        });
        const certificateProfile = {
            sections: {
                certificates: {
                    certificates: [{
                        certificateName: 'ADsp(\uB370\uC774\uD130 \uBD84\uC11D \uC900\uC804\uBB38\uAC00)',
                        issuer: '\uD55C\uAD6D\uB370\uC774\uD130\uC0B0\uC5C5\uC9C4\uD765\uC6D0',
                        acquiredDate: '2026-06-05',
                        registrationNumber: 'ADsP-049026379'
                    }, {
                        certificateName: '\uC815\uBCF4\uCC98\uB9AC\uAE30\uC0AC',
                        acquiredDate: '2024-09-10',
                        registrationNumber: '24202030579W'
                    }]
                }
            },
            customFields: []
        };

        const result = await applyAutoFillPlanAsync(buildAutoFillPlan(doc, certificateProfile));

        expect(result.failed).toEqual([]);
        expect(certificateNavClicks).toBe(1);
        expect(certificateAddClicks).toBe(2);
        expect(doc.getElementById('certificate-name-0').value).toBe('ADsp(\uB370\uC774\uD130 \uBD84\uC11D \uC900\uC804\uBB38\uAC00)');
        expect(doc.getElementById('certificate-issuer-0').value).toBe('\uD55C\uAD6D\uB370\uC774\uD130\uC0B0\uC5C5\uC9C4\uD765\uC6D0');
        expect(doc.getElementById('certificate-date-0').value).toBe('2026-06-05');
        expect(doc.getElementById('certificate-registration-0').value).toBe('ADsP-049026379');
        expect(doc.getElementById('certificate-name-1').value).toBe('\uC815\uBCF4\uCC98\uB9AC\uAE30\uC0AC');
        expect(doc.getElementById('certificate-date-1').value).toBe('2024-09-10');
        expect(doc.getElementById('certificate-registration-1').value).toBe('24202030579W');
    });

    it('EXT-032: adds a certificate row, selects the certificate name, then fills revealed detail fields', async () => {
        const doc = document.implementation.createHTMLDocument('application');
        doc.body.innerHTML = `
      <form>
        <section aria-label="\uC790\uACA9\uC99D">
          <h3>\uC790\uACA9\uC99D</h3>
          <button id="add-certificate" type="button">+ \uCD94\uAC00\uD558\uAE30</button>
          <div id="certificate-fields"></div>
        </section>
      </form>
    `;
        let addClicks = 0;
        doc.getElementById('add-certificate').addEventListener('click', () => {
            addClicks += 1;
            if (doc.getElementById('certificate-name-0')) return;
            const row = doc.createElement('div');
            row.className = 'certificate-row';
            row.innerHTML = `
        <label>\uC790\uACA9\uC99D\uBA85
          <input id="certificate-name-0" role="combobox" aria-autocomplete="list" placeholder="\uC790\uACA9\uC99D\uBA85\uC744 \uAC80\uC0C9\uD574\uC8FC\uC138\uC694." />
        </label>
        <div id="certificate-options-0" role="listbox"></div>
        <div id="certificate-detail-0"></div>
      `;
            doc.getElementById('certificate-fields').append(row);
            const search = doc.getElementById('certificate-name-0');
            search.addEventListener('input', () => {
                doc.getElementById('certificate-options-0').innerHTML = `
          <button id="certificate-option-0" type="button" role="option">ADsp(\uB370\uC774\uD130 \uBD84\uC11D \uC900\uC804\uBB38\uAC00)</button>
        `;
                doc.getElementById('certificate-option-0').addEventListener('click', () => {
                    search.value = 'ADsp(\uB370\uC774\uD130 \uBD84\uC11D \uC900\uC804\uBB38\uAC00)';
                    doc.getElementById('certificate-options-0').innerHTML = '';
                    doc.getElementById('certificate-detail-0').innerHTML = `
            <label>\uBC1C\uAE09\uAE30\uAD00<input id="certificate-issuer-0" placeholder="\uBC1C\uAE09\uAE30\uAD00\uC744 \uC785\uB825\uD574\uC8FC\uC138\uC694." /></label>
            <label>\uCDE8\uB4DD\uC77C<input id="certificate-date-0" placeholder="\uCDE8\uB4DD\uC77C" /></label>
            <label>\uB4F1\uB85D\uBC88\uD638<input id="certificate-registration-0" placeholder="\uB4F1\uB85D\uBC88\uD638\uB97C \uC785\uB825\uD574\uC8FC\uC138\uC694." /></label>
          `;
                });
            });
        });
        const certificateProfile = {
            sections: {
                certificates: {
                    certificates: [{
                        certificateName: 'ADsp(\uB370\uC774\uD130 \uBD84\uC11D \uC900\uC804\uBB38\uAC00)',
                        issuer: '\uD55C\uAD6D\uB370\uC774\uD130\uC0B0\uC5C5\uC9C4\uD765\uC6D0',
                        acquiredDate: '2026-06-05',
                        registrationNumber: 'ADsP-049026379'
                    }]
                }
            },
            customFields: []
        };

        const result = await applyAutoFillPlanAsync(buildAutoFillPlan(doc, certificateProfile));

        expect(result.failed).toEqual([]);
        expect(addClicks).toBe(1);
        expect(doc.getElementById('certificate-name-0').value).toBe('ADsp(\uB370\uC774\uD130 \uBD84\uC11D \uC900\uC804\uBB38\uAC00)');
        expect(doc.getElementById('certificate-issuer-0').value).toBe('\uD55C\uAD6D\uB370\uC774\uD130\uC0B0\uC5C5\uC9C4\uD765\uC6D0');
        expect(doc.getElementById('certificate-date-0').value).toBe('2026-06-05');
        expect(doc.getElementById('certificate-registration-0').value).toBe('ADsP-049026379');
    });

    it('EXT-032: keeps revealed certificate details with the selected row after each autocomplete click', async () => {
        const doc = document.implementation.createHTMLDocument('application');
        doc.body.innerHTML = `
      <form>
        <section aria-label="\uC790\uACA9\uC99D">
          <h3>\uC790\uACA9\uC99D</h3>
          <button id="add-certificate" type="button">+ \uCD94\uAC00\uD558\uAE30</button>
          <div id="certificate-fields"></div>
        </section>
      </form>
    `;
        const optionNames = ['\uC815\uBCF4\uCC98\uB9AC\uAE30\uC0AC', 'ADsp(\uB370\uC774\uD130 \uBD84\uC11D \uC900\uC804\uBB38\uAC00)'];
        doc.getElementById('add-certificate').addEventListener('click', () => {
            const index = doc.querySelectorAll('.certificate-row').length;
            const row = doc.createElement('div');
            row.className = 'certificate-row';
            row.innerHTML = `
        <label>\uC790\uACA9\uC99D\uBA85
          <input id="certificate-name-${index}" role="combobox" aria-autocomplete="list" placeholder="\uC790\uACA9\uC99D\uBA85\uC744 \uAC80\uC0C9\uD574\uC8FC\uC138\uC694." />
        </label>
        <div id="certificate-options-${index}" role="listbox"></div>
        <div id="certificate-detail-${index}"></div>
      `;
            doc.getElementById('certificate-fields').append(row);
            const search = doc.getElementById(`certificate-name-${index}`);
            search.addEventListener('input', () => {
                const optionName = optionNames[index];
                doc.getElementById(`certificate-options-${index}`).innerHTML = `
          <button id="certificate-option-${index}" type="button" role="option">${optionName}</button>
        `;
                doc.getElementById(`certificate-option-${index}`).addEventListener('click', () => {
                    search.value = optionName;
                    doc.getElementById(`certificate-options-${index}`).innerHTML = '';
                    doc.getElementById(`certificate-detail-${index}`).innerHTML = `
            <label>\uBC1C\uAE09\uAE30\uAD00<input id="certificate-issuer-${index}" placeholder="\uBC1C\uAE09\uAE30\uAD00\uC744 \uC785\uB825\uD574\uC8FC\uC138\uC694." /></label>
            <label>\uCDE8\uB4DD\uC77C<input id="certificate-date-${index}" placeholder="\uCDE8\uB4DD\uC77C" /></label>
            <label>\uB4F1\uB85D\uBC88\uD638<input id="certificate-registration-${index}" placeholder="\uB4F1\uB85D\uBC88\uD638\uB97C \uC785\uB825\uD574\uC8FC\uC138\uC694." /></label>
          `;
                });
            });
        });
        const certificateProfile = {
            sections: {
                certificates: {
                    certificates: [{
                        certificateName: '\uC815\uBCF4\uCC98\uB9AC\uAE30\uC0AC',
                        acquiredDate: '2024-09-10',
                        registrationNumber: '24202030579W'
                    }, {
                        certificateName: 'ADsp(\uB370\uC774\uD130 \uBD84\uC11D \uC900\uC804\uBB38\uAC00)',
                        issuer: '\uD55C\uAD6D\uB370\uC774\uD130\uC0B0\uC5C5\uC9C4\uD765\uC6D0',
                        acquiredDate: '2026-06-05',
                        registrationNumber: 'ADsP-049026379'
                    }]
                }
            },
            customFields: []
        };

        const result = await applyAutoFillPlanAsync(buildAutoFillPlan(doc, certificateProfile));

        expect(result.failed).toEqual([]);
        expect(doc.getElementById('certificate-name-0').value).toBe('\uC815\uBCF4\uCC98\uB9AC\uAE30\uC0AC');
        expect(doc.getElementById('certificate-issuer-0').value).toBe('');
        expect(doc.getElementById('certificate-date-0').value).toBe('2024-09-10');
        expect(doc.getElementById('certificate-registration-0').value).toBe('24202030579W');
        expect(doc.getElementById('certificate-name-1').value).toBe('ADsp(\uB370\uC774\uD130 \uBD84\uC11D \uC900\uC804\uBB38\uAC00)');
        expect(doc.getElementById('certificate-issuer-1').value).toBe('\uD55C\uAD6D\uB370\uC774\uD130\uC0B0\uC5C5\uC9C4\uD765\uC6D0');
        expect(doc.getElementById('certificate-date-1').value).toBe('2026-06-05');
        expect(doc.getElementById('certificate-registration-1').value).toBe('ADsP-049026379');
    });

    it('EXT-032: keeps certificate rows separate from language rows inside a mixed Midas section', async () => {
        const doc = document.implementation.createHTMLDocument('application');
        doc.body.innerHTML = `
      <form>
        <section aria-label="\uC5B4\uD559/\uC790\uACA9/\uAE30\uD0C0">
          <h3>\uC5B4\uD559/\uC790\uACA9/\uAE30\uD0C0</h3>
          <div class="language-panel">
            <h4>\uACF5\uC778\uC678\uAD6D\uC5B4\uC2DC\uD5D8</h4>
            <button id="add-language-test" type="button">\uC5B4\uD559 \uCD94\uAC00\uD558\uAE30</button>
            <div id="language-fields"></div>
          </div>
          <div class="certificate-panel">
            <h4>\uC790\uACA9\uC99D</h4>
            <button id="add-certificate" type="button">\uC790\uACA9\uC99D \uCD94\uAC00\uD558\uAE30</button>
            <div id="certificate-fields"></div>
          </div>
        </section>
      </form>
    `;
        let languageAddClicks = 0;
        let certificateAddClicks = 0;
        doc.getElementById('add-language-test').addEventListener('click', () => {
            languageAddClicks += 1;
            doc.getElementById('language-fields').innerHTML = `
        <label>\uC2DC\uD5D8\uBA85<input id="language-test-name" placeholder="\uC2DC\uD5D8\uC744 \uAC80\uC0C9\uD574\uC8FC\uC138\uC694" /></label>
        <label>\uC810\uC218/\uB4F1\uAE09<input id="language-score" /></label>
      `;
        });
        doc.getElementById('add-certificate').addEventListener('click', () => {
            certificateAddClicks += 1;
            doc.getElementById('certificate-fields').innerHTML = `
        <label>\uC790\uACA9\uC99D\uBA85<input id="certificate-name" placeholder="\uC790\uACA9\uC99D\uBA85\uC744 \uAC80\uC0C9\uD574\uC8FC\uC138\uC694" /></label>
        <label>\uBC1C\uAE09\uAE30\uAD00<input id="certificate-issuer" /></label>
        <label>\uCDE8\uB4DD\uC77C<input id="certificate-date" /></label>
        <label>\uB4F1\uB85D\uBC88\uD638<input id="certificate-registration" /></label>
      `;
        });
        const certificateProfile = {
            sections: {
                certificates: {
                    languageTests: [{
                        testName: 'OPIc(\uC601\uC5B4)',
                        score: 'IM1'
                    }],
                    certificates: [{
                        certificateName: 'ADsP(\uB370\uC774\uD130 \uBD84\uC11D \uC900\uC804\uBB38\uAC00)',
                        issuer: '\uD55C\uAD6D\uB370\uC774\uD130\uC0B0\uC5C5\uC9C4\uD765\uC6D0',
                        acquiredDate: '2025-04-21',
                        registrationNumber: 'ADSP-001'
                    }]
                }
            },
            customFields: []
        };

        const result = await applyAutoFillPlanAsync(buildAutoFillPlan(doc, certificateProfile));

        expect(result.failed).toEqual([]);
        expect(languageAddClicks).toBe(1);
        expect(certificateAddClicks).toBe(1);
        expect(doc.getElementById('language-test-name').value).toBe('OPIc(\uC601\uC5B4)');
        expect(doc.getElementById('language-score').value).toBe('IM1');
        expect(doc.getElementById('certificate-name').value).toBe('ADsP(\uB370\uC774\uD130 \uBD84\uC11D \uC900\uC804\uBB38\uAC00)');
        expect(doc.getElementById('certificate-issuer').value).toBe('\uD55C\uAD6D\uB370\uC774\uD130\uC0B0\uC5C5\uC9C4\uD765\uC6D0');
        expect(doc.getElementById('certificate-date').value).toBe('2025-04-21');
        expect(doc.getElementById('certificate-registration').value).toBe('ADSP-001');
    });

    it('EXT-032: opens and fills multiple certificate rows in saved order', async () => {
        const doc = document.implementation.createHTMLDocument('application');
        doc.body.innerHTML = `
      <form>
        <section aria-label="\uC790\uACA9\uC99D">
          <h3>\uC790\uACA9\uC99D</h3>
          <button id="add-certificate" type="button">\uCD94\uAC00\uD558\uAE30</button>
          <div id="certificate-fields"></div>
        </section>
      </form>
    `;
        doc.getElementById('add-certificate').addEventListener('click', () => {
            const index = doc.querySelectorAll('.certificate-row').length;
            const row = doc.createElement('div');
            row.className = 'certificate-row';
            row.innerHTML = `
        <label>\uC790\uACA9\uC99D\uBA85<input id="certificate-name-${index}" placeholder="\uC790\uACA9\uC99D\uBA85\uC744 \uAC80\uC0C9\uD574\uC8FC\uC138\uC694" /></label>
        <label>\uBC1C\uAE09\uAE30\uAD00<input id="certificate-issuer-${index}" /></label>
        <label>\uCDE8\uB4DD\uC77C<input id="certificate-date-${index}" /></label>
        <label>\uB4F1\uB85D\uBC88\uD638<input id="certificate-registration-${index}" /></label>
      `;
            doc.getElementById('certificate-fields').append(row);
        });
        const certificateProfile = {
            sections: {
                certificates: {
                    certificates: [{
                        certificateName: 'ADsp(\uB370\uC774\uD130 \uBD84\uC11D \uC900\uC804\uBB38\uAC00)',
                        issuer: '\uD55C\uAD6D\uB370\uC774\uD130\uC0B0\uC5C5\uC9C4\uD765\uC6D0',
                        acquiredDate: '2026-06-05',
                        registrationNumber: 'ADsP-049026379'
                    }, {
                        certificateName: '\uC815\uBCF4\uCC98\uB9AC\uAE30\uC0AC',
                        acquiredDate: '2024-09-10',
                        registrationNumber: '24202030579W'
                    }, {
                        certificateName: '\uBE45\uB370\uC774\uD130\uBD84\uC11D\uAE30\uC0AC',
                        issuer: '\uD55C\uAD6D\uB370\uC774\uD130\uC0B0\uC5C5\uC9C4\uD765\uC6D0',
                        acquiredDate: '2023-12-22',
                        registrationNumber: 'BAE-007005143'
                    }, {
                        certificateName: 'SQLD(SQL\uAC1C\uBC1C\uC790)',
                        issuer: '\uD55C\uAD6D\uB370\uC774\uD130\uC0B0\uC5C5\uC9C4\uD765\uC6D0',
                        acquiredDate: '2022-09-30',
                        registrationNumber: 'SQLD-046012160'
                    }]
                }
            },
            customFields: []
        };

        const result = await applyAutoFillPlanAsync(buildAutoFillPlan(doc, certificateProfile));

        expect(result.failed).toEqual([]);
        expect(doc.getElementById('certificate-name-0').value).toBe('ADsp(\uB370\uC774\uD130 \uBD84\uC11D \uC900\uC804\uBB38\uAC00)');
        expect(doc.getElementById('certificate-issuer-0').value).toBe('\uD55C\uAD6D\uB370\uC774\uD130\uC0B0\uC5C5\uC9C4\uD765\uC6D0');
        expect(doc.getElementById('certificate-date-0').value).toBe('2026-06-05');
        expect(doc.getElementById('certificate-registration-0').value).toBe('ADsP-049026379');
        expect(doc.getElementById('certificate-name-1').value).toBe('\uC815\uBCF4\uCC98\uB9AC\uAE30\uC0AC');
        expect(doc.getElementById('certificate-date-1').value).toBe('2024-09-10');
        expect(doc.getElementById('certificate-registration-1').value).toBe('24202030579W');
        expect(doc.getElementById('certificate-name-2').value).toBe('\uBE45\uB370\uC774\uD130\uBD84\uC11D\uAE30\uC0AC');
        expect(doc.getElementById('certificate-issuer-2').value).toBe('\uD55C\uAD6D\uB370\uC774\uD130\uC0B0\uC5C5\uC9C4\uD765\uC6D0');
        expect(doc.getElementById('certificate-date-2').value).toBe('2023-12-22');
        expect(doc.getElementById('certificate-registration-2').value).toBe('BAE-007005143');
        expect(doc.getElementById('certificate-name-3').value).toBe('SQLD(SQL\uAC1C\uBC1C\uC790)');
        expect(doc.getElementById('certificate-issuer-3').value).toBe('\uD55C\uAD6D\uB370\uC774\uD130\uC0B0\uC5C5\uC9C4\uD765\uC6D0');
        expect(doc.getElementById('certificate-date-3').value).toBe('2022-09-30');
        expect(doc.getElementById('certificate-registration-3').value).toBe('SQLD-046012160');
    });

    it('EXT-032: maps certificate detail controls by row when an earlier autocomplete row has no detail fields yet', async () => {
        const doc = document.implementation.createHTMLDocument('application');
        doc.body.innerHTML = `
      <form>
        <section aria-label="\uC790\uACA9\uC99D">
          <h3>\uC790\uACA9\uC99D</h3>
          <div class="certificate-row" id="certificate-row-0">
            <label>\uC790\uACA9\uC99D\uBA85<input id="certificate-name-0" placeholder="\uC790\uACA9\uC99D\uBA85\uC744 \uAC80\uC0C9\uD574\uC8FC\uC138\uC694." /></label>
          </div>
          <div class="certificate-row" id="certificate-row-1">
            <button id="certificate-name-1" type="button">\uC815\uBCF4\uCC98\uB9AC\uAE30\uC0AC</button>
            <label>\uBC1C\uAE09\uAE30\uAD00<input id="certificate-issuer-1" /></label>
            <label>\uCDE8\uB4DD\uC77C<input id="certificate-date-1" /></label>
            <label>\uB4F1\uB85D\uBC88\uD638<input id="certificate-registration-1" /></label>
          </div>
        </section>
      </form>
    `;
        const certificateProfile = {
            sections: {
                certificates: {
                    certificates: [{
                        certificateName: 'ADsp(\uB370\uC774\uD130 \uBD84\uC11D \uC900\uC804\uBB38\uAC00)',
                        issuer: '\uD55C\uAD6D\uB370\uC774\uD130\uC0B0\uC5C5\uC9C4\uD765\uC6D0',
                        acquiredDate: '2026-06-05',
                        registrationNumber: 'ADsP-049026379'
                    }, {
                        certificateName: '\uC815\uBCF4\uCC98\uB9AC\uAE30\uC0AC',
                        issuer: '\uD55C\uAD6D\uC0B0\uC5C5\uC778\uB825\uACF5\uB2E8',
                        acquiredDate: '2024-09-10',
                        registrationNumber: '24202030579W'
                    }]
                }
            },
            customFields: []
        };

        const result = await applyAutoFillPlanAsync(buildAutoFillPlan(doc, certificateProfile));

        expect(doc.getElementById('certificate-issuer-1').value).toBe('\uD55C\uAD6D\uC0B0\uC5C5\uC778\uB825\uACF5\uB2E8');
        expect(doc.getElementById('certificate-date-1').value).toBe('2024-09-10');
        expect(doc.getElementById('certificate-registration-1').value).toBe('24202030579W');
        expect(result.filled).toEqual(expect.arrayContaining([
            expect.objectContaining({ fieldKey: 'certificates.certificates.1.issuer' }),
            expect.objectContaining({ fieldKey: 'certificates.certificates.1.acquiredDate' }),
            expect.objectContaining({ fieldKey: 'certificates.certificates.1.registrationNumber' })
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

    it('EXT-030: keeps activity fields manual and shows saved activity copy candidates', () => {
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

        expect(result.failed).toEqual([
            expect.objectContaining({ fieldKey: 'activities.assist', reason: 'tailored_activity_required' })
        ]);
        expect(doc.getElementById('activity-organization').value).toBe('');
        expect(doc.getElementById('activity-start').value).toBe('');
        expect(doc.getElementById('activity-end').value).toBe('');
        expect(doc.getElementById('activity-role').value).toBe('');
        expect(doc.getElementById('activity-description').value).toBe('');
        expect(result.copyCandidates).toEqual(expect.arrayContaining([
            expect.objectContaining({ key: 'activities.0.activityName', value: '\uD540\uD14C\uD06C \uC5F0\uAD6C\uD68C' }),
            expect.objectContaining({ key: 'activities.0.organization', value: '\uBD80\uC0B0\uB300\uD559\uAD50 \uD540\uD14C\uD06C\uC735\uD569\uC804\uACF5' }),
            expect.objectContaining({ key: 'activities.0.period', value: '2023-03-01 ~ 2023-12-31' }),
            expect.objectContaining({ key: 'activities.0.description', value: '\uAE08\uC735 \uB370\uC774\uD130 \uBD84\uC11D \uC2A4\uD130\uB514\uB97C \uAE30\uD68D\uD558\uACE0 \uC6B4\uC601' })
        ]));
    });

    it('EXT-030: keeps Midas activityAnswers rows manual with saved activity candidates', () => {
        const doc = document.implementation.createHTMLDocument('application');
        doc.body.innerHTML = `
      <form>
        <section aria-label="\uD559\uB0B4\uC678\uD65C\uB3D9">
          <div class="activity-row">
            <label>\uAE30\uAD00 \uBC0F \uC870\uC9C1\uBA85<input name="activityAnswers.0.organization" placeholder="\uAE30\uAD00 \uBC0F \uC870\uC9C1\uBA85\uC744 \uC785\uB825\uD574\uC8FC\uC138\uC694." /></label>
            <label>\uD65C\uB3D9\uAE30\uAC04<input class="period" placeholder="\uD65C\uB3D9\uAE30\uAC04" /><input class="period" placeholder="\uD65C\uB3D9\uAE30\uAC04" /></label>
            <label>\uC5ED\uD560<input name="activityAnswers.0.role" placeholder="\uC9C1\uC704 \uB610\uB294 \uC5ED\uD560\uC744 \uC785\uB825\uD574\uC8FC\uC138\uC694" /></label>
            <label>\uC0C1\uC138 \uB0B4\uC6A9<textarea name="activityAnswers.0.contents" placeholder="\uD65C\uB3D9 \uB0B4\uC6A9\uC744 \uC0C1\uC138\uD788 \uC785\uB825\uD574\uC8FC\uC138\uC694."></textarea></label>
          </div>
          <div class="activity-row">
            <label>\uAE30\uAD00 \uBC0F \uC870\uC9C1\uBA85<input name="activityAnswers.1.organization" placeholder="\uAE30\uAD00 \uBC0F \uC870\uC9C1\uBA85\uC744 \uC785\uB825\uD574\uC8FC\uC138\uC694." /></label>
            <label>\uD65C\uB3D9\uAE30\uAC04<input class="period" placeholder="\uD65C\uB3D9\uAE30\uAC04" /><input class="period" placeholder="\uD65C\uB3D9\uAE30\uAC04" /></label>
            <label>\uC5ED\uD560<input name="activityAnswers.1.role" placeholder="\uC9C1\uC704 \uB610\uB294 \uC5ED\uD560\uC744 \uC785\uB825\uD574\uC8FC\uC138\uC694" /></label>
            <label>\uC0C1\uC138 \uB0B4\uC6A9<textarea name="activityAnswers.1.contents" placeholder="\uD65C\uB3D9 \uB0B4\uC6A9\uC744 \uC0C1\uC138\uD788 \uC785\uB825\uD574\uC8FC\uC138\uC694."></textarea></label>
          </div>
        </section>
      </form>
    `;
        const activityProfile = {
            sections: {
                other: {
                    activities: [{
                        organization: '\uD559\uAD50 A',
                        role: '\uAE30\uD68D',
                        startDate: '2023-01-01',
                        endDate: '2023-02-01',
                        description: 'A \uD65C\uB3D9'
                    }, {
                        organization: '\uD559\uAD50 B',
                        role: '\uBD84\uC11D',
                        startDate: '2024-03-01',
                        endDate: '2024-04-01',
                        description: 'B \uD65C\uB3D9'
                    }]
                }
            },
            customFields: []
        };

        const result = applyAutoFillPlan(buildAutoFillPlan(doc, activityProfile));
        const periods = Array.from(doc.querySelectorAll('.period')).map((input) => input.value);

        expect(result.failed).toEqual([
            expect.objectContaining({ fieldKey: 'activities.assist', reason: 'tailored_activity_required' })
        ]);
        expect(doc.querySelector('[name="activityAnswers.0.organization"]').value).toBe('');
        expect(doc.querySelector('[name="activityAnswers.1.organization"]').value).toBe('');
        expect(periods).toEqual(['', '', '', '']);
        expect(doc.querySelector('[name="activityAnswers.1.contents"]').value).toBe('');
        expect(result.copyCandidates).toEqual(expect.arrayContaining([
            expect.objectContaining({ key: 'activities.0.organization', value: '\uD559\uAD50 A' }),
            expect.objectContaining({ key: 'activities.1.organization', value: '\uD559\uAD50 B' }),
            expect.objectContaining({ key: 'activities.1.period', value: '2024-03-01 ~ 2024-04-01' }),
            expect.objectContaining({ key: 'activities.1.description', value: 'B \uD65C\uB3D9' })
        ]));
    });

    it('EXT-030: does not fill unnamed activity period inputs automatically', () => {
        const doc = document.implementation.createHTMLDocument('application');
        doc.body.innerHTML = `
      <form>
        <section aria-label="\uD559\uB0B4\uC678\uD65C\uB3D9">
          <input name="activityAnswers.0.organization" />
          <input class="period" placeholder="\uD65C\uB3D9\uAE30\uAC04" />
          <input class="period" placeholder="\uD65C\uB3D9\uAE30\uAC04" />
          <input name="activityAnswers.0.role" />
          <textarea name="activityAnswers.0.contents"></textarea>
          <input name="activityAnswers.1.organization" />
          <input class="period" placeholder="\uD65C\uB3D9\uAE30\uAC04" />
          <input class="period" placeholder="\uD65C\uB3D9\uAE30\uAC04" />
          <input name="activityAnswers.1.role" />
          <textarea name="activityAnswers.1.contents"></textarea>
          <input name="activityAnswers.2.organization" />
          <input class="period" placeholder="\uD65C\uB3D9\uAE30\uAC04" />
          <input class="period" placeholder="\uD65C\uB3D9\uAE30\uAC04" />
          <input name="activityAnswers.2.role" />
          <textarea name="activityAnswers.2.contents"></textarea>
        </section>
      </form>
    `;
        const activityProfile = {
            sections: {
                other: {
                    activities: [{
                        organization: 'A',
                        role: 'A role',
                        startDate: '2023-01-01',
                        endDate: '2023-02-01',
                        description: 'A detail'
                    }, {
                        organization: 'B',
                        role: 'B role',
                        startDate: '2023-03-01',
                        endDate: '2023-04-01',
                        description: 'B detail'
                    }, {
                        organization: 'C',
                        role: 'C role',
                        startDate: '2023-05-01',
                        endDate: '2023-06-01',
                        description: 'C detail'
                    }]
                }
            },
            customFields: []
        };

        const result = applyAutoFillPlan(buildAutoFillPlan(doc, activityProfile));
        const periods = Array.from(doc.querySelectorAll('.period')).map((input) => input.value);

        expect(result.failed).toEqual([
            expect.objectContaining({ fieldKey: 'activities.assist', reason: 'tailored_activity_required' })
        ]);
        expect(periods).toEqual([
            '',
            '',
            '',
            '',
            '',
            ''
        ]);
        expect(result.copyCandidates).toEqual(expect.arrayContaining([
            expect.objectContaining({ key: 'activities.0.period', value: '2023-01-01 ~ 2023-02-01' }),
            expect.objectContaining({ key: 'activities.1.period', value: '2023-03-01 ~ 2023-04-01' }),
            expect.objectContaining({ key: 'activities.2.period', value: '2023-05-01 ~ 2023-06-01' })
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
