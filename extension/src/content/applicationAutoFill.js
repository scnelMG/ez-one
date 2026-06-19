const APPLICATION_FORM_CHANGED_MESSAGE = 'EZONE_APPLICATION_FORM_CHANGED';
const APPLICATION_FORM_CHANGE_DEBOUNCE_MS = 500;
const AUTOFILL_ASYNC_WAIT_TIMEOUT_MS = 1200;
const AUTOFILL_ASYNC_WAIT_INTERVAL_MS = 40;
const AUTOFILL_DEPENDENT_FIELD_SETTLE_MS = 80;
const PANEL_HOST_ID = 'ezone-extension-panel-host';
const APPLICATION_FORM_SELECTOR = 'input, textarea, select, button, [role="combobox"], [role="radio"], [role="checkbox"], [role="switch"], [aria-haspopup], [data-value], [data-option]';

const BASIC_FIELDS = [
    { key: 'basicInfo.nameKo', label: '이름', section: 'basicInfo', field: 'nameKo', terms: ['이름', '성명', '지원자명', 'applicantname', 'username', 'name'] },
    { key: 'basicInfo.nameEn', label: '영문 이름', section: 'basicInfo', field: 'nameEn', terms: ['영문이름', '영문 이름', '영어이름', 'englishname', 'nameen'] },
    { key: 'basicInfo.email', label: '이메일', section: 'basicInfo', field: 'email', terms: ['이메일', '메일', 'emailaddress', 'email', 'mail'] },
    { key: 'basicInfo.phone', label: '휴대폰', section: 'basicInfo', field: 'phone', terms: ['휴대폰', '휴대전화', '전화번호', '연락처', '핸드폰', 'mobile', 'phone', 'tel'] },
    { key: 'basicInfo.birthdate', label: '생년월일', section: 'basicInfo', field: 'birthdate', terms: ['생년월일', '생년', 'birth', 'birthday', 'birthdate'] },
    { key: 'basicInfo.gender', label: '성별', section: 'basicInfo', field: 'gender', terms: ['성별', 'gender', 'sex'] },
    { key: 'basicInfo.addressDetail', label: '상세주소', section: 'basicInfo', field: 'addressDetail', terms: ['상세주소', 'detailaddress', 'addressdetail'] },
    { key: 'basicInfo.address', label: '주소', section: 'basicInfo', field: 'address', terms: ['주소', '거주지', 'address'] },
    { key: 'basicInfo.applicationCareerType', label: '신입/경력', section: 'basicInfo', field: 'applicationCareerType', terms: ['신입경력', '신입/경력', '경력구분', '지원구분', 'careertype', 'employmentcategory'] },
    { key: 'basicInfo.applicationSource', label: '지원경로', section: 'basicInfo', field: 'applicationSource', terms: ['지원경로', '채용경로', '유입경로', 'applicationsource', 'applysource'] }
];

const REUSABLE_SECTION_LABELS = {
    education: '학력',
    career: '경력',
    courses: '과목',
    projects: '프로젝트',
    certificates: '자격증',
    awards: '수상',
    military: '병역',
    internships: '인턴',
    trainings: '교육',
    activities: '활동'
};

const AUTO_FILL_FIELD_PRIORITY = {
    'military.status': 100,
    'military.enlistmentDate': 110,
    'military.dischargeDate': 120,
    'military.servicePeriod': 130,
    'military.branch': 140,
    'military.rank': 150,
    'military.dischargeType': 160,
    'military.hasDisability': 200,
    'military.isVeteran': 210
};

const SKIPPED_INPUT_TYPES = new Set(['button', 'checkbox', 'color', 'file', 'hidden', 'image', 'password', 'radio', 'range', 'reset', 'submit']);
const MILITARY_DEPENDENT_DATE_KEYS = new Set(['military.enlistmentDate', 'military.dischargeDate']);
const MILITARY_DEPENDENT_SELECT_KEYS = new Set(['military.rank', 'military.dischargeType']);
const ESSAY_TERMS = ['자기소개', '자소서', '지원동기', '입사후', '성장과정', '장단점', 'essay', 'motivation', 'coverletter', 'selfintroduction'];
const ACTION_BUTTON_TERMS = ['다음', '이전', '저장', '닫기', '취소', '삭제', '추가', '복사', '주소입력', '주소 입력', '사진 등록'].map(normalize);
const CHOICE_BUTTON_TERMS = ['남', '여', '남성', '여성', '비대상', '대상', '예', '아니오', '군필', '미필', '면제', '복무중', '신입', '경력', '인턴', '신입/경력'].map(normalize);

export function flattenDocumentProfileValues(profile) {
    const values = [];
    const sections = profile?.sections ?? {};
    const basicInfo = asRecord(sections.basicInfo);
    for (const config of BASIC_FIELDS) {
        const value = cleanText(normalizeBasicValue(config.field, basicInfo?.[config.field]));
        if (value) {
            values.push({ key: config.key, label: config.label, value, terms: config.terms.map(normalize) });
        }
    }
    addMilitaryValues(values, sections.military);
    addEducationValues(values, sections.education);
    addCertificateValues(values, sections.certificates);
    addActivityCopyValues(values, sections);
    for (const [section, label] of Object.entries(REUSABLE_SECTION_LABELS)) {
        const items = Array.isArray(sections[section]) ? sections[section] : [];
        items.forEach((item, index) => {
            const record = asRecord(item);
            const title = cleanText(record?.title);
            const summary = cleanText(record?.summary);
            if (title) {
                values.push({ key: `${section}.${index}.title`, label: `${label} 제목`, value: title, terms: [normalize(label), normalize(title)] });
            }
            if (summary) {
                values.push({ key: `${section}.${index}.summary`, label: `${label} 요약`, value: summary, terms: [normalize(label), normalize(title), normalize(summary)].filter(Boolean) });
            }
        });
    }
    for (const field of profile?.customFields ?? []) {
        const label = cleanText(field?.label);
        const value = cleanText(field?.value);
        if (label && value) {
            values.push({ key: `customFields.${field.id}`, label, value, terms: customFieldTerms(label) });
        }
    }
    return values;
}

export function buildAutoFillPlan(documentRef = document, profile) {
    const values = flattenDocumentProfileValues(profile);
    const allControls = getApplicationFormElements(documentRef, 'input, textarea, select');
    const controls = allControls.filter(isFillableControl);
    const fillable = [];
    const failed = [];
    const skipped = [];
    const consumedControls = new Set();

    addSplitPhoneItems(controls, values, fillable, consumedControls);
    addChoiceItems(documentRef, values, fillable);
    addCustomSelectItems(documentRef, values, fillable, failed);

    for (const control of controls) {
        if (consumedControls.has(control)) continue;
        const context = collectControlText(control);
        if (shouldSkipLongText(control, context)) {
            skipped.push({ label: context.displayLabel, reason: 'essay_or_long_text' });
            continue;
        }
        if (isTailoredActivityControl(control, context)) {
            addTailoredActivityAssist(failed);
            continue;
        }
        const directKey = directFieldKeyForControl(control, context) || directFieldKeyFromText(context.displayLabel);
        const directMatch = directKey ? findDirectValueMatch(values, directKey, context, control) : null;
        const fallbackMatch = !directKey ? findBestValue(context.normalized, values) : null;
        const match = directMatch || fallbackMatch;
        if (match) {
            const autocompleteSearchControl = isAutocompleteSearchControl(control) && isAutocompletePrimaryFieldKey(match.key);
            fillable.push({
                element: control,
                fieldKey: match.key,
                label: context.displayLabel || match.label,
                value: formatValueForControl(control, match.value, match.key),
                autocompleteSearchControl,
                relatedValues: autocompleteSearchControl ? relatedValuesForAutocomplete(values, match.key) : []
            });
        }
        else if (directKey) {
            addMissingProfileValue(failed, directKey);
        }
        else {
            const unsupported = unsupportedProfileFieldFromText(context.displayLabel);
            failed.push(unsupported
                ? { label: unsupported, reason: 'unsupported_profile_field' }
                : { label: context.displayLabel || control.name || control.id || '알 수 없는 입력칸', reason: 'no_match' });
        }
    }

    const sortedFillable = sortAutoFillItems(fillable);
    return {
        fillable: sortedFillable,
        failed,
        skipped,
        copyCandidates: copyCandidatesFromValues(values, new Set(sortedFillable.map((item) => item.fieldKey)))
    };
}

export function applyAutoFillPlan(plan) {
    const filled = [];
    const failed = [...plan.failed];
    for (const item of plan.fillable) {
        const result = setControlValue(resolveControlForFill(item), item.value, item);
        if (result.success) {
            filled.push({ fieldKey: item.fieldKey, label: item.label, value: result.value, sectionOpenControl: Boolean(item.sectionOpenControl) });
        }
        else {
            failed.push({ fieldKey: item.fieldKey, label: item.label, value: item.value, reason: result.reason });
        }
    }
    const visibleFilled = uniqueAutoFillResultItems(filled);
    return {
        mode: 'applied',
        filledCount: visibleFilled.length,
        failedCount: failed.length + plan.skipped.length,
        filled: visibleFilled,
        failed: [...failed, ...plan.skipped],
        copyCandidates: mergeCopyCandidates(plan.copyCandidates, copyCandidatesFromFailures([...failed, ...plan.skipped]))
    };
}

export async function applyAutoFillPlanAsync(plan) {
    const filled = [];
    const failed = [...plan.failed];
    for (const item of plan.fillable) {
        const element = await resolveControlForFillAsync(item);
        const result = await setControlValueAsync(element, item.value, item);
        if (result.success) {
            filled.push({ fieldKey: item.fieldKey, label: item.label, value: result.value, sectionOpenControl: Boolean(item.sectionOpenControl) });
            if (Array.isArray(result.extraFilled)) filled.push(...result.extraFilled);
        }
        else {
            failed.push({ fieldKey: item.fieldKey, label: item.label, value: item.value, reason: result.reason });
        }
    }
    const visibleFilled = uniqueAutoFillResultItems(filled);
    return {
        mode: 'applied',
        filledCount: visibleFilled.length,
        failedCount: failed.length + plan.skipped.length,
        filled: visibleFilled,
        failed: [...failed, ...plan.skipped],
        copyCandidates: mergeCopyCandidates(plan.copyCandidates, copyCandidatesFromFailures([...failed, ...plan.skipped]))
    };
}

export function previewAutoFillPlan(plan) {
    const planned = uniqueAutoFillResultItems(plan.fillable.map(({ fieldKey, label, value, sectionOpenControl }) => ({
        fieldKey,
        label,
        value,
        sectionOpenControl: Boolean(sectionOpenControl)
    })));
    const failed = [...plan.failed, ...plan.skipped];
    return {
        mode: 'preview',
        plannedCount: planned.length,
        filledCount: 0,
        failedCount: failed.length,
        planned,
        filled: [],
        failed,
        copyCandidates: plan.copyCandidates
    };
}

export function buildApplicationFormSignature(documentRef = document) {
    return getApplicationFormElements(documentRef, APPLICATION_FORM_SELECTOR)
        .filter((element) => !isAutomationControl(element))
        .slice(0, 120)
        .map((element) => [
            element.tagName,
            element.getAttribute('type'),
            element.getAttribute('name'),
            element.id,
            element.getAttribute('placeholder'),
            element.getAttribute('aria-label'),
            element.getAttribute('role'),
            element.getAttribute('aria-haspopup'),
            element.disabled ? 'disabled' : '',
            cleanText(choiceElementText(element))
        ].map((value) => value ?? '').join(':'))
        .join('|');
}

function sortAutoFillItems(items) {
    const priorityItems = items
        .filter((item) => Object.prototype.hasOwnProperty.call(AUTO_FILL_FIELD_PRIORITY, item.fieldKey))
        .sort((left, right) => AUTO_FILL_FIELD_PRIORITY[left.fieldKey] - AUTO_FILL_FIELD_PRIORITY[right.fieldKey]);
    let priorityIndex = 0;
    return items.map((item) => {
        if (!Object.prototype.hasOwnProperty.call(AUTO_FILL_FIELD_PRIORITY, item.fieldKey)) return item;
        const next = priorityItems[priorityIndex];
        priorityIndex += 1;
        return next;
    });
}

function getApplicationFormElements(documentRef, selector) {
    return Array.from(documentRef.querySelectorAll(selector)).filter((element) => !isAutomationControl(element) && !isHiddenElement(element));
}

function addChoiceItems(documentRef, values, fillable) {
    const usedFieldKeys = new Set(fillable.map((item) => item.fieldKey));
    const controls = Array.from(new Set(getApplicationFormElements(documentRef, 'input[type="radio"], input[type="checkbox"], button[type="button"], button:not([type]), [role="button"], [role="radio"], [role="checkbox"], [role="switch"], [aria-pressed], [aria-selected], [data-value], [data-option]')))
        .filter(isChoiceButtonCandidate);
    for (const control of controls) {
        const optionText = cleanText(labelText(control)) || choiceElementText(control);
        const context = collectChoiceText(control, optionText);
        const match = findBestChoiceValue(optionText, context.normalized, values, usedFieldKeys);
        if (!match) continue;
        usedFieldKeys.add(match.key);
        fillable.push({ element: control, fieldKey: match.key, label: match.label, value: optionText || match.value, choiceControl: true });
    }
}

function addCustomSelectItems(documentRef, values, fillable, failed) {
    const usedFieldKeys = new Set(fillable.map((item) => item.fieldKey));
    const controls = Array.from(new Set(getApplicationFormElements(documentRef, '[role="combobox"], [aria-haspopup="listbox"], [aria-haspopup="true"], button[type="button"], button:not([type]), [tabindex]:not(input):not(textarea):not(select)')))
        .filter((control) => militaryDependentSelectKeyFromText(choiceElementText(control)) || isPotentialCustomSelectControl(control));
    for (const control of controls) {
        const context = collectCustomSelectText(control);
        const key = militaryDependentSelectKeyFromText(choiceElementText(control)) || directFieldKeyForControl(control, context) || directFieldKeyFromText(choiceElementText(control)) || directFieldKeyFromText(context.displayLabel);
        if (!key || usedFieldKeys.has(key)) continue;
        const match = findDirectValueMatch(values, key, context, control);
        if (!match) {
            addMissingProfileValue(failed, key);
            continue;
        }
        usedFieldKeys.add(match.key);
        fillable.push({
            element: control,
            fieldKey: match.key,
            label: match.label,
            value: match.value,
            customSelectControl: true,
            requiresEnabledBeforeFill: control.disabled || control.getAttribute('aria-disabled') === 'true'
        });
    }
}

function collectControlText(control) {
    const visibleTexts = [
        labelText(control),
        tableHeaderText(control),
        nearbyText(control),
        previousSiblingText(control),
        educationSectionContextText(control)
    ].filter(Boolean);
    const fallbackTexts = [
        control.getAttribute('aria-label'),
        control.getAttribute('placeholder'),
        control.getAttribute('name'),
        control.id
    ].filter(Boolean);
    const texts = [...visibleTexts, ...fallbackTexts];
    return { displayLabel: cleanText(texts[0]) || '', normalized: normalize(texts.join(' ')) };
}

function collectChoiceText(control, optionText) {
    const fieldText = previousChoiceContextText(control, optionText) || nearbyText(control, optionText);
    const fallbackTexts = [
        control.getAttribute('aria-label'),
        control.getAttribute('name'),
        control.getAttribute('value'),
        control.id
    ].filter(Boolean);
    return { displayLabel: cleanText(fieldText) || '', normalized: normalize([fieldText, ...fallbackTexts].join(' ')) };
}

function collectCustomSelectText(control) {
    const context = collectChoiceText(control, choiceElementText(control));
    return {
        displayLabel: context.displayLabel || choiceElementText(control) || '',
        normalized: normalize([context.normalized, choiceElementText(control)].join(' '))
    };
}

function labelText(control) {
    const labels = Array.from(control.labels ?? []);
    return labels.map((label) => labelTextWithoutControl(label)).join(' ');
}

function labelTextWithoutControl(label) {
    const clone = label.cloneNode(true);
    clone.querySelectorAll('input, textarea, select, button, svg').forEach((item) => item.remove());
    return clone.textContent;
}

function tableHeaderText(control) {
    const cell = control.closest('td, th');
    const previous = cell?.previousElementSibling;
    return previous?.matches('th, td') ? previous.textContent : '';
}

function previousSiblingText(control) {
    let current = control.previousElementSibling;
    const values = [];
    while (current && values.length < 2) {
        values.push(current.textContent);
        current = current.previousElementSibling;
    }
    return values.join(' ');
}

function educationSectionContextText(control) {
    const section = closestEducationSection(control);
    if (!section) return '';
    return [
        section.getAttribute('aria-label'),
        section.querySelector('h1, h2, h3, h4, h5, legend')?.textContent
    ].filter(Boolean).join(' ');
}

function closestEducationSection(control) {
    let current = control.parentElement;
    while (current && current !== control.ownerDocument.body) {
        const text = normalize([
            current.getAttribute('aria-label'),
            current.querySelector?.('h1, h2, h3, h4, h5, legend')?.textContent
        ].filter(Boolean).join(' '));
        if (text.includes(normalize('\uace0\ub4f1\ud559\uad50')) || text.includes('highschool') ||
            text.includes(normalize('\ub300\ud559\uad50')) || text.includes(normalize('\ub300\ud559')) || text.includes('university') ||
            text.includes(normalize('\ub300\ud559\uc6d0')) || text.includes('graduate')) {
            return current;
        }
        current = current.parentElement;
    }
    return null;
}

function educationGroupFromContext(context) {
    if (context.includes(normalize('\ub300\ud559\uc6d0')) || context.includes('graduate')) return 'graduateSchools';
    if (context.includes(normalize('\ub300\ud559\uad50')) || context.includes(normalize('\ub300\ud559')) || context.includes('university')) return 'universities';
    if (context.includes(normalize('\uace0\ub4f1\ud559\uad50')) || context.includes('highschool')) return 'highSchool';
    return null;
}

function directEducationFieldKeyForControl(control, signature) {
    const section = closestEducationSection(control);
    const sectionContext = normalize(educationSectionContextText(control));
    const group = educationGroupFromContext([signature, sectionContext].join(' '));
    if (!group) return null;
    if (signature.includes(normalize('\ud559\uad50\uc815\ubcf4')) || signature.includes(normalize('\ud559\uad50\uba85')) || signature.includes('schoolname')) {
        return educationFieldKey(group, 'schoolName');
    }
    if (signature.includes(normalize('\ud559\uad50\uc18c\uc7ac\uc9c0')) || signature.includes(normalize('\uc18c\uc7ac\uc9c0')) || signature.includes('schoollocation')) {
        return educationFieldKey(group, 'location');
    }
    if (signature === normalize('\uacc4\uc5f4') || signature.includes(normalize('\uacc4\uc5f4')) || signature.includes('schooltrack')) {
        return educationFieldKey(group, group === 'highSchool' ? 'track' : 'majorCategory');
    }
    if (signature.includes(normalize('\ud559\uc5c5\uc131\uc801')) || signature.includes(normalize('\uc131\uc801\ud3c9\uc810')) || signature.includes(normalize('\ud3c9\uc810')) || signature.includes('gpa') || signature.includes('grade')) {
        return educationFieldKey(group, 'grade');
    }
    if (signature.includes(normalize('\uc774\uc218\ud559\uc810')) || signature.includes(normalize('\ucde8\ub4dd\ud559\uc810')) || signature.includes('credits') || signature.includes('credit')) {
        return educationFieldKey(group, 'credits');
    }
    if (signature.includes(normalize('\uc7ac\ud559\uae30\uac04')) || signature.includes(normalize('\uc785\ud559\uc77c')) || signature.includes(normalize('\uc878\uc5c5\uc77c'))) {
        return educationFieldKey(group, educationPeriodFieldForControl(control, section, signature));
    }
    return null;
}

function educationPeriodFieldForControl(control, section, signature) {
    if (signature.includes(normalize('\uc785\ud559\uc77c')) || signature.includes('start')) return 'admissionDate';
    if (signature.includes(normalize('\uc878\uc5c5\uc77c')) || signature.includes('end')) return 'graduationDate';
    const periodControls = Array.from((section ?? control.ownerDocument).querySelectorAll('input, textarea, select'))
        .filter((candidate) => {
            const candidateContext = normalize([
                labelText(candidate),
                candidate.getAttribute('aria-label'),
                candidate.getAttribute('placeholder'),
                candidate.getAttribute('name'),
                candidate.id
            ].filter(Boolean).join(' '));
            return candidateContext.includes(normalize('\uc7ac\ud559\uae30\uac04'));
        });
    return periodControls.indexOf(control) % 2 === 1 ? 'graduationDate' : 'admissionDate';
}

function educationFieldKey(group, field) {
    return group === 'highSchool' ? `education.highSchool.${field}` : `education.${group}.*.${field}`;
}

function certificateSectionContextText(control) {
    let current = control.parentElement;
    while (current && current !== control.ownerDocument.body) {
        const text = [
            current.getAttribute('aria-label'),
            current.querySelector?.('h1, h2, h3, h4, h5, legend')?.textContent
        ].filter(Boolean).join(' ');
        const normalized = normalize(text);
        if (normalized.includes(normalize('\uacf5\uc778\uc678\uad6d\uc5b4\uc2dc\ud5d8')) || normalized.includes(normalize('\uc5b4\ud559')) || normalized.includes('language') ||
            normalized.includes(normalize('\uc790\uaca9\uc99d')) || normalized.includes(normalize('\uba74\ud5c8')) || normalized.includes('certificate') || normalized.includes('license')) {
            return normalized;
        }
        current = current.parentElement;
    }
    return '';
}

function certificateGroupFromContext(context) {
    if (context.includes(normalize('\uacf5\uc778\uc678\uad6d\uc5b4\uc2dc\ud5d8')) || context.includes(normalize('\uc5b4\ud559')) || context.includes(normalize('\uc678\uad6d\uc5b4')) || context.includes('language')) {
        return 'languageTests';
    }
    if (context.includes(normalize('\uc790\uaca9\uc99d')) || context.includes(normalize('\uba74\ud5c8')) || context.includes('certificate') || context.includes('license')) {
        return 'certificates';
    }
    return null;
}

function directCertificateFieldKeyForControl(control, signature) {
    const context = normalize([signature, certificateSectionContextText(control)].join(' '));
    const group = certificateGroupFromContext(context);
    if (!group) return null;
    if (group === 'certificates' && (signature.includes(normalize('\uc790\uaca9\uc99d\uba85')) || signature.includes(normalize('\uc790\uaca9\uba85')) || signature.includes('certificatename') || signature.includes('license'))) {
        return certificateFieldKey(group, 'certificateName');
    }
    if (signature.includes(normalize('\uc2dc\ud5d8\uba85')) || signature.includes('testname') || signature.includes('examname')) {
        return certificateFieldKey(group, group === 'languageTests' ? 'testName' : 'certificateName');
    }
    if (signature.includes(normalize('\uc810\uc218')) || signature.includes(normalize('\ub4f1\uae09')) || signature.includes('score') || signature.includes('level')) {
        return group === 'languageTests' ? certificateFieldKey(group, 'score') : null;
    }
    if (signature.includes(normalize('\ucde8\ub4dd\uc77c')) || signature.includes(normalize('\uc2dc\ud5d8\uc77c')) || signature.includes('acquireddate') || signature.includes('issuedate') || signature.includes('testdate')) {
        return certificateFieldKey(group, 'acquiredDate');
    }
    if (signature.includes(normalize('\ub4f1\ub85d\ubc88\ud638')) || signature.includes(normalize('\uc790\uaca9\ubc88\ud638')) || signature.includes('registrationnumber') || signature.includes('certificatenumber')) {
        return certificateFieldKey(group, 'registrationNumber');
    }
    if (signature.includes(normalize('\ubc1c\uae09\uae30\uad00')) || signature.includes(normalize('\uc2dc\ud589\uae30\uad00')) || signature.includes('issuer')) {
        return group === 'certificates' ? certificateFieldKey(group, 'issuer') : null;
    }
    return null;
}

function certificateFieldKey(group, field) {
    return `certificates.${group}.*.${field}`;
}

function isAutocompletePrimaryFieldKey(fieldKey) {
    return /^certificates\.(?:certificates|languageTests)\.(?:\d+|\*)\.(?:certificateName|testName)$/.test(fieldKey);
}

function relatedValuesForAutocomplete(values, fieldKey) {
    const match = fieldKey.match(/^(certificates\.(?:certificates|languageTests)\.\d+)\.(?:certificateName|testName)$/);
    if (!match) return [];
    const prefix = `${match[1]}.`;
    return values.filter((value) => value.key.startsWith(prefix) && value.key !== fieldKey);
}

function indexedRepeatedFieldKeyForControl(control, wildcardKey) {
    if (!control) return null;
    const match = wildcardKey.match(/^(education\.(?:universities|graduateSchools)|certificates\.(?:certificates|languageTests))\.\*\.(.+)$/);
    if (!match) return null;
    const root = closestRepeatedFieldSection(control, wildcardKey) ?? control.ownerDocument;
    const controls = Array.from(root.querySelectorAll('input, textarea, select'))
        .filter((candidate) => !isHiddenElement(candidate))
        .filter((candidate) => repeatedWildcardKeyForControl(candidate, wildcardKey) === wildcardKey);
    const index = controls.indexOf(control);
    if (index < 0) return null;
    return `${match[1]}.${index}.${match[2]}`;
}

function closestRepeatedFieldSection(control, wildcardKey) {
    if (wildcardKey.startsWith('certificates.')) return closestCertificateSection(control);
    if (wildcardKey.startsWith('education.')) return closestEducationSection(control);
    return null;
}

function closestCertificateSection(control) {
    let current = control?.parentElement;
    while (current && current !== control.ownerDocument.body) {
        const normalized = normalize([
            current.getAttribute('aria-label'),
            current.querySelector?.('h1, h2, h3, h4, h5, legend')?.textContent
        ].filter(Boolean).join(' '));
        if (certificateGroupFromContext(normalized)) return current;
        current = current.parentElement;
    }
    return null;
}

function repeatedWildcardKeyForControl(control, wildcardKey) {
    const signature = normalizedDirectControlSignature(control);
    if (wildcardKey.startsWith('certificates.')) return directCertificateFieldKeyForControl(control, signature);
    if (wildcardKey.startsWith('education.')) return directEducationFieldKeyForControl(control, signature);
    return null;
}

function normalizedDirectControlSignature(control) {
    return normalize([
        control.getAttribute('name'),
        control.id,
        control.getAttribute('placeholder'),
        control.getAttribute('aria-label'),
        labelText(control),
        nearbyText(control),
        choiceElementText(control)
    ].filter(Boolean).join(' '));
}

function previousChoiceContextText(control, optionText) {
    let current = control.previousElementSibling;
    while (current) {
        if (current.matches?.('input, textarea, select, button, [role="button"], [role="radio"], [role="checkbox"], [role="switch"]')) {
            current = current.previousElementSibling;
            continue;
        }
        const text = cleanText(current.textContent);
        if (text && text.length <= 50 && !isChoiceOnlyText(text, optionText) && !isChoiceText(text)) {
            return text;
        }
        current = current.previousElementSibling;
    }
    return '';
}

function nearbyText(control, optionText = '') {
    const parent = control.closest('label, .field, .form-group, .input-group, li, div, p, section');
    if (!parent) return '';
    const clone = parent.cloneNode(true);
    clone.querySelectorAll('input, textarea, select, button, svg').forEach((item) => item.remove());
    const text = cleanText(clone.textContent);
    return text && text.length <= 80 && !isChoiceOnlyText(text, optionText) ? text : '';
}

function directFieldKeyForControl(control, context) {
    const signature = normalize([
        control.getAttribute('name'),
        control.id,
        control.getAttribute('placeholder'),
        control.getAttribute('aria-label'),
        context.displayLabel,
        choiceElementText(control)
    ].filter(Boolean).join(' '));
    const educationKey = directEducationFieldKeyForControl(control, signature);
    if (educationKey) return educationKey;
    const certificateKey = directCertificateFieldKeyForControl(control, signature);
    if (certificateKey) return certificateKey;
    return directFieldKeyFromText(signature);
}

function directFieldKeyFromText(text) {
    const normalized = normalize(text);
    if (!normalized) return null;
    const has = (...terms) => containsAny(normalized, terms.map((term) => normalize(term)));
    if (has('\uc601\ubb38\uc774\ub984', '\uc601\ubb38 \uc774\ub984', '\uc601\uc5b4\uc774\ub984', 'englishname', 'nameen')) return 'basicInfo.nameEn';
    if (has('\uc0c1\uc138\uc8fc\uc18c', 'detailaddress', 'addressdetail')) return 'basicInfo.addressDetail';
    if (has('\uc774\uba54\uc77c', '\uba54\uc77c', 'emailaddress', 'email', 'mail')) return 'basicInfo.email';
    if (has('\ud734\ub300\ud3f0', '\ud734\ub300\uc804\ud654', '\uc804\ud654\ubc88\ud638', '\uc5f0\ub77d\ucc98', '\ud578\ub4dc\ud3f0', 'phone', 'tel', 'mobile')) return 'basicInfo.phone';
    if (has('\uc0dd\ub144\uc6d4\uc77c', '\uc0dd\ub144', 'birth', 'birthday', 'birthdate')) return 'basicInfo.birthdate';
    if (has('\uc131\ubcc4', 'gender', 'sex')) return 'basicInfo.gender';
    if (has('\uc9c0\uc6d0\uacbd\ub85c', '\ucc44\uc6a9\uacbd\ub85c', 'applicationsource', 'applysource')) return 'basicInfo.applicationSource';
    if (has('\uc2e0\uc785\uacbd\ub825', '\uc2e0\uc785/\uacbd\ub825', '\uacbd\ub825\uad6c\ubd84', 'careertype', 'employmentcategory')) return 'basicInfo.applicationCareerType';
    if (has('\uc8fc\uc18c', 'address')) return 'basicInfo.address';
    if (has('\uc774\ub984', '\uc131\uba85', 'applicantname', 'username', 'name')) return 'basicInfo.nameKo';
    if (has('\uc81c\ub300\uad6c\ubd84', '\uc804\uc5ed\uad6c\ubd84', 'dischargetype', 'dischargecategory')) return 'military.dischargeType';
    if (has('\uacc4\uae09', 'rank')) return 'military.rank';
    if (has('\uc785\ub300\uc77c', '\uc785\uc601\uc77c', 'enlist', 'militarystart', 'enlistmentdate')) return 'military.enlistmentDate';
    if (has('\uc81c\ub300\uc77c', '\uc804\uc5ed\uc77c', 'militaryend', 'dischargedate')) return 'military.dischargeDate';
    if (has('\uad70\ubcc4', '\uad70\uc885', 'branch')) return 'military.branch';
    if (has('\ubcf5\ubb34\uae30\uac04', '\ubcf5\ubb34\uac1c\uc6d4', 'serviceperiod')) return 'military.servicePeriod';
    if (has('\ubcd1\uc5ed', 'military')) return 'military.status';
    if (has('\uc7a5\uc560\ub4f1\ub85d\ubc88\ud638', '\uc7a5\uc560\ubc88\ud638', 'disabilitynumber')) return 'military.disabilityRegistrationNumber';
    if (has('\uc7a5\uc560\uc720\ud615', '\uc7a5\uc560\uc885\ub958', 'disabilitytype')) return 'military.disabilityType';
    if (has('\uc7a5\uc560', 'disability')) return 'military.hasDisability';
    if (has('\ubcf4\ud6c8', 'veteran')) return 'military.isVeteran';
    if (has('\ud559\uacfc\uacc4\uc5f4', '\uc804\uacf5\uacc4\uc5f4', 'majorcategory', 'departmentcategory')) return 'education.*.majorCategory';
    if (has('\ud559\uad50\uc815\ubcf4', '\ud559\uad50\uba85', 'schoolname')) return 'education.*.schoolName';
    if (has('\ud559\uc5c5\uc131\uc801', '\uc131\uc801\ud3c9\uc810', '\ud3c9\uc810', 'gpa', 'grade')) return 'education.*.grade';
    if (has('\uc774\uc218\ud559\uc810', '\ucde8\ub4dd\ud559\uc810', 'credits', 'credit')) return 'education.*.credits';
    if (has('\ubcf8\uad50\ubd84\uad50', '\ubcf8\uad50/\ubd84\uad50', 'campustype')) return 'education.*.campusType';
    if (has('\ud559\uad50\uc18c\uc7ac\uc9c0', '\uc18c\uc7ac\uc9c0', 'schoollocation')) return 'education.*.location';
    if (normalized === normalize('\uacc4\uc5f4') || has('schooltrack')) return 'education.*.track';
    if (containsAny(normalized, ['영문이름', '영문 이름', 'englishname', 'nameen'])) return 'basicInfo.nameEn';
    if (containsAny(normalized, ['상세주소', 'detailaddress', 'addressdetail'])) return 'basicInfo.addressDetail';
    if (containsAny(normalized, ['이메일', 'emailaddress', 'email', 'mail'])) return 'basicInfo.email';
    if (containsAny(normalized, ['휴대폰', '휴대전화', '전화번호', '핸드폰', 'phone', 'tel', 'mobile'])) return 'basicInfo.phone';
    if (containsAny(normalized, ['생년월일', 'birth', 'birthday', 'birthdate'])) return 'basicInfo.birthdate';
    if (containsAny(normalized, ['성별', 'gender', 'sex'])) return 'basicInfo.gender';
    if (containsAny(normalized, ['지원경로', '채용경로', 'applicationsource', 'applysource'])) return 'basicInfo.applicationSource';
    if (containsAny(normalized, ['신입경력', '신입/경력', '경력구분', 'careertype', 'employmentcategory'])) return 'basicInfo.applicationCareerType';
    if (containsAny(normalized, ['주소', 'address'])) return 'basicInfo.address';
    if (containsAny(normalized, ['이름', '성명', 'applicantname', 'username', 'name'])) return 'basicInfo.nameKo';
    if (containsAny(normalized, ['입대일', '입영일', 'enlist', 'militarystart'])) return 'military.enlistmentDate';
    if (containsAny(normalized, ['제대일', '전역일', 'discharge', 'militaryend'])) return 'military.dischargeDate';
    if (containsAny(normalized, ['제대구분', '전역구분', 'dischargetype', 'dischargecategory'])) return 'military.dischargeType';
    if (containsAny(normalized, ['계급', 'rank'])) return 'military.rank';
    if (containsAny(normalized, ['군별', '군종', 'branch'])) return 'military.branch';
    if (containsAny(normalized, ['병역', 'military'])) return 'military.status';
    if (containsAny(normalized, ['장애등록번호', '장애번호', 'disabilitynumber'])) return 'military.disabilityRegistrationNumber';
    if (containsAny(normalized, ['장애유형', '장애종류', 'disabilitytype'])) return 'military.disabilityType';
    if (containsAny(normalized, ['장애', 'disability'])) return 'military.hasDisability';
    if (containsAny(normalized, ['보훈', 'veteran'])) return 'military.isVeteran';
    if (containsAny(normalized, ['복무기간', '복무개월', 'serviceperiod'])) return 'military.servicePeriod';
    if (containsAny(normalized, ['학과계열', '전공계열', 'majorcategory', 'departmentcategory'])) return 'education.*.majorCategory';
    if (containsAny(normalized, ['본교분교', '본교/분교', 'campustype'])) return 'education.*.campusType';
    if (containsAny(normalized, ['학교소재지', '소재지', 'schoollocation'])) return 'education.*.location';
    if (normalized === normalize('계열') || containsAny(normalized, ['schooltrack'])) return 'education.*.track';
    return null;
}

function findDirectValueMatch(values, key, context = {}, control = null) {
    const exact = values.find((value) => value.key === key);
    if (exact) return exact;
    const groupWildcard = key.match(/^education\.(universities|graduateSchools)\.\*\.(.+)$/);
    if (groupWildcard) {
        const indexedKey = indexedRepeatedFieldKeyForControl(control, key);
        if (indexedKey) {
            const indexed = values.find((value) => value.key === indexedKey);
            if (indexed) return indexed;
        }
        return values.find((value) => value.key.startsWith(`education.${groupWildcard[1]}.`) && value.key.endsWith(`.${groupWildcard[2]}`)) ?? null;
    }
    const certificateWildcard = key.match(/^certificates\.(certificates|languageTests)\.\*\.(.+)$/);
    if (certificateWildcard) {
        const indexedKey = indexedRepeatedFieldKeyForControl(control, key);
        if (indexedKey) {
            const indexed = values.find((value) => value.key === indexedKey);
            if (indexed) return indexed;
        }
        return values.find((value) => value.key.startsWith(`certificates.${certificateWildcard[1]}.`) && value.key.endsWith(`.${certificateWildcard[2]}`)) ?? null;
    }
    const wildcard = key.match(/^education\.\*\.(.+)$/);
    if (wildcard) {
        return findEducationValueMatch(values, wildcard[1], context.normalized ?? '');
    }
    return null;
}

function findEducationValueMatch(values, field, context) {
    const groups = preferredEducationGroups(context);
    for (const group of groups) {
        const match = values.find((value) => {
            if (group === 'highSchool') return value.key === `education.highSchool.${field}`;
            return value.key.startsWith(`education.${group}.`) && value.key.endsWith(`.${field}`);
        });
        if (match) return match;
    }
    return values.find((value) => value.key.startsWith('education.') && value.key.endsWith(`.${field}`)) ?? null;
}

function preferredEducationGroups(context) {
    if (context.includes(normalize('대학원')) || context.includes('graduate')) return ['graduateSchools', 'universities', 'highSchool'];
    if (context.includes(normalize('대학교')) || context.includes(normalize('대학')) || context.includes('university')) return ['universities', 'graduateSchools', 'highSchool'];
    if (context.includes(normalize('고등학교')) || context.includes('highschool')) return ['highSchool', 'universities', 'graduateSchools'];
    return ['highSchool', 'universities', 'graduateSchools'];
}

function findBestValue(context, values) {
    let best = null;
    let bestScore = 0;
    for (const value of values) {
        const score = value.terms.reduce((current, term) => Math.max(current, term && context.includes(term) ? term.length : 0), 0);
        if (score > bestScore) {
            best = value;
            bestScore = score;
        }
    }
    return best;
}

function findBestChoiceValue(optionText, context, values, usedFieldKeys) {
    const normalizedOption = normalize(optionText);
    let best = null;
    let bestScore = 0;
    for (const value of values) {
        if (usedFieldKeys.has(value.key) || value.key === 'military.servicePeriod') continue;
        const optionTerms = optionTermsForValue(value).map(normalize);
        if (!optionTerms.includes(normalizedOption)) continue;
        const score = value.terms.reduce((current, term) => Math.max(current, term && context.includes(term) ? term.length : 0), 0);
        if (score > bestScore) {
            best = value;
            bestScore = score || 1;
        }
    }
    return best;
}

function setControlValue(control, value, item = {}) {
    if (!control) return { success: false, reason: 'control_not_ready' };
    if (control.disabled && item.requiresEnabledBeforeFill) return { success: false, reason: 'control_not_ready' };
    let displayValue = value;
    if (item.customSelectControl) {
        const result = setCustomSelectValue(control, value);
        if (!result.success) return result;
        displayValue = result.value;
    }
    else if (item.choiceControl || isButtonLikeChoiceControl(control)) {
        control.click();
        setChoiceState(control);
        displayValue = choiceElementText(control) || value;
    }
    else if (control.tagName.toLowerCase() === 'input' && ['radio', 'checkbox'].includes((control.getAttribute('type') ?? '').toLowerCase())) {
        control.click();
        control.checked = true;
        displayValue = cleanText(labelText(control)) || cleanText(control.getAttribute('value')) || value;
    }
    else if (control.tagName.toLowerCase() === 'select') {
        const selectedValue = findMatchingSelectValue(control, value);
        if (selectedValue === null) return { success: false, reason: 'select_option_not_found' };
        setNativeControlValue(control, selectedValue);
        displayValue = value;
    }
    else {
        setNativeControlValue(control, value);
    }
    dispatchInputEvents(control);
    return { success: true, value: displayValue };
}

async function setControlValueAsync(control, value, item = {}) {
    if (!control) return { success: false, reason: 'control_not_ready' };
    if (control.disabled && item.requiresEnabledBeforeFill) return { success: false, reason: 'control_not_ready' };
    let displayValue = value;
    if (item.autocompleteSearchControl) {
        const result = await setAutocompleteSearchValueAsync(control, value, item);
        if (!result.success) return result;
        displayValue = result.value;
        return { success: true, value: displayValue, extraFilled: result.extraFilled };
    }
    if (item.customSelectControl) {
        const result = await setCustomSelectValueAsync(control, value);
        if (!result.success) return result;
        displayValue = result.value;
    }
    else {
        const result = setControlValue(control, value, item);
        if (!result.success) return result;
        displayValue = result.value;
    }
    if (MILITARY_DEPENDENT_DATE_KEYS.has(item.fieldKey)) {
        await sleep(AUTOFILL_DEPENDENT_FIELD_SETTLE_MS);
    }
    return { success: true, value: displayValue };
}

function setCustomSelectValue(control, value) {
    activateElement(control);
    if (control.hasAttribute('aria-expanded')) control.setAttribute('aria-expanded', 'true');
    const option = findMatchingCustomOption(control.ownerDocument, value, control);
    if (!option) return { success: false, reason: 'select_option_not_found' };
    activateElement(option);
    setChoiceState(option);
    return { success: true, value: choiceElementText(option) || value };
}

async function setCustomSelectValueAsync(control, value) {
    activateElement(control);
    if (control.hasAttribute('aria-expanded')) control.setAttribute('aria-expanded', 'true');
    const option = await waitForValue(() => findMatchingCustomOption(control.ownerDocument, value, control));
    if (!option) return { success: false, reason: 'select_option_not_found' };
    activateElement(option);
    setChoiceState(option);
    await sleep(AUTOFILL_ASYNC_WAIT_INTERVAL_MS);
    return { success: true, value: choiceElementText(option) || value };
}

async function setAutocompleteSearchValueAsync(control, value, item = {}) {
    control.click();
    control.focus?.();
    setNativeControlValue(control, value);
    dispatchInputEvents(control);
    if (control.hasAttribute('aria-expanded')) control.setAttribute('aria-expanded', 'true');
    const option = await waitForValue(() => findMatchingCustomOption(control.ownerDocument, value, control));
    if (!option) return { success: false, reason: 'select_option_not_found' };
    option.click();
    setChoiceState(option);
    await sleep(AUTOFILL_DEPENDENT_FIELD_SETTLE_MS);
    return {
        success: true,
        value: choiceElementText(option) || value,
        extraFilled: await fillRelatedAutocompleteValues(control, item.relatedValues ?? [])
    };
}

async function fillRelatedAutocompleteValues(sourceControl, relatedValues) {
    const filled = [];
    for (const value of relatedValues) {
        const target = await waitForValue(() => findCurrentControlForFieldKey(sourceControl.ownerDocument, value.key));
        if (!target || target.disabled || target.readOnly) continue;
        const result = setControlValue(target, formatValueForControl(target, value.value, value.key), { fieldKey: value.key });
        if (result.success) {
            filled.push({ fieldKey: value.key, label: value.label, value: result.value });
        }
    }
    return filled;
}

function setChoiceState(control) {
    const role = (control.getAttribute('role') ?? '').toLowerCase();
    if (['radio', 'checkbox', 'switch'].includes(role)) control.setAttribute('aria-checked', 'true');
    if (control.hasAttribute('aria-selected')) control.setAttribute('aria-selected', 'true');
    if (control.hasAttribute('aria-pressed')) control.setAttribute('aria-pressed', 'true');
}

function activateElement(element) {
    const eventWindow = element.ownerDocument?.defaultView ?? window;
    for (const type of ['mousedown', 'mouseup', 'click']) {
        element.dispatchEvent(new eventWindow.MouseEvent(type, { bubbles: true, cancelable: true }));
    }
}

function findMatchingCustomOption(documentRef, value, sourceControl) {
    const normalizedValue = normalize(value);
    const candidates = Array.from(documentRef.querySelectorAll('[role="option"], [data-value], [data-option], li, button[type="button"], button:not([type]), [role="button"], [tabindex]:not(input):not(textarea):not(select)'))
        .filter((element) => element !== sourceControl && !element.disabled && element.getAttribute('aria-disabled') !== 'true' && !isAutomationControl(element))
        .filter((element) => !(element.matches('li') && element.querySelector('button, [role="option"], [data-value], [data-option]')));
    return candidates.find((element) => {
        const optionText = normalize(choiceElementText(element));
        const optionValue = normalize(element.getAttribute('data-value') || element.getAttribute('data-option') || element.getAttribute('value'));
        return (optionText && (optionText === normalizedValue || optionText.includes(normalizedValue) || normalizedValue.includes(optionText))) ||
            (optionValue && optionValue === normalizedValue);
    }) ?? null;
}

function resolveControlForFill(item) {
    if (!item.requiresEnabledBeforeFill) return item.element;
    if (item.element?.isConnected && !item.element.disabled) return item.element;
    return findCurrentControlForFieldKey(item.element?.ownerDocument, item.fieldKey) ?? item.element;
}

async function resolveControlForFillAsync(item) {
    if (!item.requiresEnabledBeforeFill) return item.element;
    if (item.element?.isConnected && !item.element.disabled) return item.element;
    return await waitForValue(() => {
        const current = findCurrentControlForFieldKey(item.element?.ownerDocument, item.fieldKey);
        return current && !current.disabled ? current : null;
    }, item.element);
}

function findCurrentControlForFieldKey(documentRef, fieldKey) {
    if (!documentRef) return null;
    const controls = [
        ...getApplicationFormElements(documentRef, 'input, textarea, select').filter(isFillableControl),
        ...getApplicationFormElements(documentRef, '[role="combobox"], [aria-haspopup="listbox"], [aria-haspopup="true"], button[type="button"], button:not([type]), [tabindex]:not(input):not(textarea):not(select)').filter(isPotentialCustomSelectControl)
    ];
    return controls.find((control) => {
        const context = ['input', 'textarea', 'select'].includes(control.tagName.toLowerCase())
            ? collectControlText(control)
            : collectCustomSelectText(control);
        const directKey = directFieldKeyForControl(control, context) || directFieldKeyFromText(choiceElementText(control)) || directFieldKeyFromText(context.displayLabel);
        if (directKey === fieldKey) return true;
        const match = directKey ? findDirectValueMatch([{ key: fieldKey, label: fieldKey, value: fieldKey, terms: [] }], directKey, context, control) : null;
        return match?.key === fieldKey;
    }) ?? null;
}

function setNativeControlValue(control, value) {
    const descriptor = nativeValueDescriptor(control);
    if (descriptor?.set) {
        descriptor.set.call(control, value);
        return;
    }
    control.value = value;
}

function nativeValueDescriptor(control) {
    const tagName = control.tagName?.toLowerCase();
    const eventWindow = control.ownerDocument?.defaultView ?? globalThis.window;
    const prototype = tagName === 'textarea'
        ? eventWindow?.HTMLTextAreaElement?.prototype
        : tagName === 'select'
            ? eventWindow?.HTMLSelectElement?.prototype
            : eventWindow?.HTMLInputElement?.prototype;
    return prototype ? Object.getOwnPropertyDescriptor(prototype, 'value') : null;
}

function dispatchInputEvents(control) {
    const eventWindow = control.ownerDocument.defaultView ?? window;
    control.dispatchEvent(new eventWindow.Event('input', { bubbles: true }));
    control.dispatchEvent(new eventWindow.Event('change', { bubbles: true }));
}

function findMatchingSelectValue(select, value) {
    const normalizedValue = normalize(value);
    const options = Array.from(select.options ?? []);
    const exact = options.find((option) => normalize(option.value) === normalizedValue || normalize(option.textContent) === normalizedValue);
    if (exact) return exact.value;
    const contained = options.find((option) => {
        const optionText = normalize(option.textContent);
        return optionText && (optionText.includes(normalizedValue) || normalizedValue.includes(optionText));
    });
    return contained?.value ?? null;
}

function addSplitPhoneItems(controls, values, fillable, consumedControls) {
    const phoneValue = values.find((value) => value.key === 'basicInfo.phone');
    if (!phoneValue) return;
    const phoneSegments = phoneValue.value.match(/\d+/g);
    if (!phoneSegments || phoneSegments.length < 3) return;
    const labels = new Set(controls.map((control) => control.closest('label')).filter(Boolean));
    for (const label of labels) {
        const labelControls = Array.from(label.querySelectorAll('input')).filter((control) => controls.includes(control));
        const maxLengths = labelControls.map((control) => Number(control.getAttribute('maxlength')));
        const labelContext = normalize(labelTextWithoutControl(label));
        const looksLikePhoneGroup = labelControls.length >= 3 &&
            (labelContext.includes(normalize('휴대폰')) || labelContext.includes(normalize('휴대전화'))) &&
            maxLengths[0] === 3 &&
            maxLengths[1] === 4 &&
            maxLengths[2] === 4;
        if (!looksLikePhoneGroup) continue;
        labelControls.slice(0, 3).forEach((control, index) => {
            consumedControls.add(control);
            fillable.push({
                element: control,
                fieldKey: phoneValue.key,
                label: labelTextWithoutControl(label).trim() || phoneValue.label,
                value: phoneSegments[index]
            });
        });
        return;
    }
}

function addMilitaryValues(values, militarySection) {
    const record = normalizeMilitaryRecord(firstRecord(militarySection));
    if (!record) return;
    addValue(values, record, 'status', 'military.status', '병역', ['병역', '병역상태', '군필', '미필', '면제', '복무중']);
    addValue(values, record, 'branch', 'military.branch', '군별', ['군별', '군종', '육군', '해군', '공군']);
    addValue(values, record, 'enlistmentDate', 'military.enlistmentDate', '입대일', ['입대일', '입영일', 'military start']);
    addValue(values, record, 'dischargeDate', 'military.dischargeDate', '제대일', ['제대일', '전역일', 'military end']);
    addValue(values, record, 'servicePeriod', 'military.servicePeriod', '복무기간', ['복무기간', '복무개월', 'service period']);
    addValue(values, record, 'rank', 'military.rank', '계급', ['계급', 'rank']);
    addValue(values, record, 'dischargeType', 'military.dischargeType', '제대구분', ['제대구분', '전역구분']);
    addValue(values, record, 'disabilityRegistrationNumber', 'military.disabilityRegistrationNumber', '장애등록번호', ['장애등록번호', '장애번호']);
    addValue(values, record, 'disabilityType', 'military.disabilityType', '장애 유형', ['장애유형', '장애종류']);
    addApplicableValue(values, record, 'hasDisability', 'military.hasDisability', '장애 여부', ['장애여부', '장애']);
    addApplicableValue(values, record, 'isVeteran', 'military.isVeteran', '보훈 대상 여부', ['보훈여부', '보훈대상여부', '보훈']);
}

function normalizeMilitaryRecord(value) {
    const record = firstRecord(value);
    if (!record) return null;
    const nested = firstRecord(record.military);
    return { ...record, ...(nested ?? {}) };
}

function addEducationValues(values, educationSection) {
    const section = asRecord(educationSection);
    if (!section) return;
    const highSchool = asRecord(section.highSchool);
    if (highSchool) {
        addValue(values, highSchool, 'schoolName', 'education.highSchool.schoolName', '\uace0\ub4f1\ud559\uad50 \ud559\uad50\uba85', ['\ud559\uad50\uc815\ubcf4', '\ud559\uad50\uba85', 'schoolname']);
        addValue(values, highSchool, 'admissionDate', 'education.highSchool.admissionDate', '\uace0\ub4f1\ud559\uad50 \uc785\ud559\uc77c', ['\uc7ac\ud559\uae30\uac04', '\uc785\ud559\uc77c', 'startdate']);
        addValue(values, highSchool, 'graduationDate', 'education.highSchool.graduationDate', '\uace0\ub4f1\ud559\uad50 \uc878\uc5c5\uc77c', ['\uc7ac\ud559\uae30\uac04', '\uc878\uc5c5\uc77c', 'enddate']);
        addValue(values, highSchool, 'graduationStatus', 'education.highSchool.graduationStatus', '\uace0\ub4f1\ud559\uad50 \uc878\uc5c5\uad6c\ubd84', ['\uc878\uc5c5\uad6c\ubd84', 'graduationstatus']);
        addValue(values, highSchool, 'track', 'education.highSchool.track', '고등학교 계열', ['계열', '고교계열', 'track']);
        addValue(values, highSchool, 'location', 'education.highSchool.location', '고등학교 학교 소재지', ['학교소재지', '소재지', 'location']);
    }
    addEducationGroupValues(values, section.universities, 'universities', '대학교');
    addEducationGroupValues(values, section.graduateSchools, 'graduateSchools', '대학원');
}

function addEducationGroupValues(values, records, group, label) {
    (Array.isArray(records) ? records : []).forEach((record, index) => {
        addValue(values, record, 'schoolName', `education.${group}.${index}.schoolName`, `${label} \ud559\uad50\uba85`, ['\ud559\uad50\uc815\ubcf4', '\ud559\uad50\uba85', 'schoolname']);
        addValue(values, record, 'admissionDate', `education.${group}.${index}.admissionDate`, `${label} \uc785\ud559\uc77c`, ['\uc7ac\ud559\uae30\uac04', '\uc785\ud559\uc77c', 'startdate']);
        addValue(values, record, 'graduationDate', `education.${group}.${index}.graduationDate`, `${label} \uc878\uc5c5\uc77c`, ['\uc7ac\ud559\uae30\uac04', '\uc878\uc5c5\uc77c', 'enddate']);
        addValue(values, record, 'graduationStatus', `education.${group}.${index}.graduationStatus`, `${label} \uc878\uc5c5\uad6c\ubd84`, ['\uc878\uc5c5\uad6c\ubd84', 'graduationstatus']);
        addValue(values, record, 'degreeType', `education.${group}.${index}.degreeType`, `${label} \ud559\uc704\uad6c\ubd84`, ['\ud559\uc704\uad6c\ubd84', 'degreetype']);
        addValue(values, record, 'admissionType', `education.${group}.${index}.admissionType`, `${label} \uc785\ud559\uad6c\ubd84`, ['\uc785\ud559\uad6c\ubd84', 'admissiontype']);
        addValue(values, record, 'location', `education.${group}.${index}.location`, `${label} 학교 소재지`, ['학교소재지', '소재지', 'location']);
        addValue(values, record, 'campusType', `education.${group}.${index}.campusType`, `${label} 본교/분교`, ['본교', '분교', '본교분교', 'campustype']);
        addValue(values, record, 'majorCategory', `education.${group}.${index}.majorCategory`, `${label} 학과계열`, ['학과계열', '전공계열', 'majorcategory']);
        addValue(values, record, 'grade', `education.${group}.${index}.grade`, `${label} \uc131\uc801 \ud3c9\uc810`, ['\ud559\uc5c5\uc131\uc801', '\uc131\uc801\ud3c9\uc810', '\ud3c9\uc810', 'gpa', 'grade']);
        addValue(values, record, 'credits', `education.${group}.${index}.credits`, `${label} \uc774\uc218\ud559\uc810`, ['\uc774\uc218\ud559\uc810', '\ucde8\ub4dd\ud559\uc810', 'credits', 'credit']);
        addValue(values, record, 'majorName', `education.${group}.${index}.majorName`, `${label} \uc804\uacf5`, ['\uc804\uacf5', 'major']);
    });
}

function addCertificateValues(values, certificateSection) {
    const section = asRecord(certificateSection);
    if (!section) return;
    addCertificateGroupValues(values, section.certificates, 'certificates', '\uc790\uaca9\uc99d');
    addCertificateGroupValues(values, section.languageTests, 'languageTests', '\uacf5\uc778\uc678\uad6d\uc5b4\uc2dc\ud5d8');
}

function addCertificateGroupValues(values, records, group, label) {
    (Array.isArray(records) ? records : []).forEach((record, index) => {
        if (group === 'languageTests') {
            addValue(values, record, 'testName', `certificates.${group}.${index}.testName`, `${label} \uc2dc\ud5d8\uba85`, ['\uacf5\uc778\uc678\uad6d\uc5b4\uc2dc\ud5d8', '\uc5b4\ud559', '\uc2dc\ud5d8\uba85', 'language', 'testname', 'examname']);
            addValue(values, record, 'score', `certificates.${group}.${index}.score`, `${label} \uc810\uc218/\ub4f1\uae09`, ['\uacf5\uc778\uc678\uad6d\uc5b4\uc2dc\ud5d8', '\uc5b4\ud559', '\uc810\uc218', '\ub4f1\uae09', 'score', 'level']);
        }
        else {
            addValue(values, record, 'certificateName', `certificates.${group}.${index}.certificateName`, `${label} \uc790\uaca9\uc99d\uba85`, ['\uc790\uaca9\uc99d', '\uba74\ud5c8', '\uc790\uaca9\uc99d\uba85', 'certificate', 'license']);
            addValue(values, record, 'issuer', `certificates.${group}.${index}.issuer`, `${label} \ubc1c\uae09\uae30\uad00`, ['\uc790\uaca9\uc99d', '\ubc1c\uae09\uae30\uad00', '\uc2dc\ud589\uae30\uad00', 'issuer']);
        }
        addValue(values, record, 'acquiredDate', `certificates.${group}.${index}.acquiredDate`, `${label} \ucde8\ub4dd\uc77c`, [label, '\ucde8\ub4dd\uc77c', '\uc2dc\ud5d8\uc77c', 'acquireddate', 'issuedate', 'testdate']);
        addValue(values, record, 'registrationNumber', `certificates.${group}.${index}.registrationNumber`, `${label} \ub4f1\ub85d\ubc88\ud638`, [label, '\ub4f1\ub85d\ubc88\ud638', '\uc790\uaca9\ubc88\ud638', 'registrationnumber', 'certificatenumber']);
    });
}

function addActivityCopyValues(values, sections) {
    const other = asRecord(sections.other);
    const activities = Array.isArray(other?.activities)
        ? other.activities
        : Array.isArray(sections.activities)
            ? sections.activities
            : [];
    activities.forEach((item, index) => {
        const record = asRecord(item);
        if (!record) return;
        const label = `활동 ${index + 1}`;
        addCopyOnlyValue(values, `${label} 활동구분`, `activities.${index}.activityType`, record.activityType);
        addCopyOnlyValue(values, `${label} 활동명`, `activities.${index}.activityName`, record.activityName ?? record.title);
        addCopyOnlyValue(values, `${label} 기관/조직`, `activities.${index}.organization`, record.organization);
        const period = [cleanText(record.startDate), cleanText(record.endDate)].filter(Boolean).join(' ~ ');
        addCopyOnlyValue(values, `${label} 활동기간`, `activities.${index}.period`, period);
        addCopyOnlyValue(values, `${label} 역할`, `activities.${index}.role`, record.role);
        addCopyOnlyValue(values, `${label} 상세 내용`, `activities.${index}.description`, record.description ?? record.summary);
        addCopyOnlyValue(values, `${label} 성과`, `activities.${index}.outcome`, record.outcome);
    });
}

function addValue(values, record, field, key, label, terms) {
    const value = cleanText(record?.[field]);
    if (value) values.push({ key, label, value, terms: terms.map(normalize) });
}

function addCopyOnlyValue(values, label, key, rawValue) {
    const value = cleanText(rawValue);
    if (value) values.push({ key, label, value, terms: [normalize(`copyonly${key}`)] });
}

function addApplicableValue(values, record, field, key, label, terms) {
    if (!Object.prototype.hasOwnProperty.call(record, field)) return;
    const value = normalizeApplicableValue(record[field]);
    if (value) values.push({ key, label, value, terms: terms.map(normalize) });
}

function normalizeApplicableValue(value) {
    if (value === true) return '대상';
    if (value === false) return '비대상';
    const normalized = normalize(value);
    if (['true', 'yes', 'y', normalize('대상'), normalize('있음')].includes(normalized)) return '대상';
    if (['false', 'no', 'n', normalize('비대상'), normalize('아니오'), normalize('없음')].includes(normalized)) return '비대상';
    return cleanText(value);
}

function normalizeBasicValue(field, value) {
    if (field !== 'gender') return value;
    const normalized = normalize(value);
    if (['male', 'm', normalize('남'), normalize('남성')].includes(normalized)) return '남성';
    if (['female', 'f', normalize('여'), normalize('여성')].includes(normalized)) return '여성';
    return value;
}

function optionTermsForValue(value) {
    const normalized = normalize(value.value);
    if (value.key === 'basicInfo.applicationCareerType') {
        if ([normalize('신입'), 'new', 'newcomer', 'entry'].includes(normalized)) return ['신입', 'new', 'newcomer', 'entry'];
        if ([normalize('경력'), 'experienced', 'career'].includes(normalized)) return ['경력', 'experienced', 'career'];
        if ([normalize('인턴'), 'intern', 'internship'].includes(normalized)) return ['인턴', 'intern', 'internship'];
    }
    if (value.key === 'basicInfo.gender') {
        if (['male', 'm', normalize('남'), normalize('남성')].includes(normalized)) return ['남', '남성', 'male', 'm'];
        if (['female', 'f', normalize('여'), normalize('여성')].includes(normalized)) return ['여', '여성', 'female', 'f'];
    }
    if ([normalize('대상'), normalize('예'), normalize('있음'), 'true', 'yes', 'y'].includes(normalized)) return ['대상', '예', '있음', 'yes', 'y'];
    if ([normalize('비대상'), normalize('아니오'), normalize('없음'), 'false', 'no', 'n'].includes(normalized)) return ['비대상', '아니오', '없음', 'no', 'n'];
    return [value.value];
}

function isFillableControl(control) {
    if (control.disabled || control.readOnly) return false;
    if (control.tagName.toLowerCase() !== 'input') return true;
    return !SKIPPED_INPUT_TYPES.has((control.getAttribute('type') ?? 'text').toLowerCase());
}

function isAutocompleteSearchControl(control) {
    if (control.tagName.toLowerCase() !== 'input') return false;
    const type = (control.getAttribute('type') ?? 'text').toLowerCase();
    if (!['', 'text', 'search'].includes(type)) return false;
    const role = (control.getAttribute('role') ?? '').toLowerCase();
    const ariaAutocomplete = (control.getAttribute('aria-autocomplete') ?? '').toLowerCase();
    const ariaHasPopup = (control.getAttribute('aria-haspopup') ?? '').toLowerCase();
    return role === 'combobox' || ['list', 'both', 'inline'].includes(ariaAutocomplete) || ariaHasPopup === 'listbox';
}

function militaryDependentSelectKeyFromText(text) {
    const normalized = normalize(text);
    if (!normalized) return null;
    if (normalized.includes(normalize('\uacc4\uae09'))) return 'military.rank';
    if (normalized.includes(normalize('\uc81c\ub300\uad6c\ubd84')) || normalized.includes(normalize('\uc804\uc5ed\uad6c\ubd84'))) return 'military.dischargeType';
    return null;
}

function isChoiceButtonCandidate(control) {
    if (control.disabled || control.getAttribute('aria-disabled') === 'true') return false;
    if (isAutomationControl(control)) return false;
    const text = choiceElementText(control);
    if (isMilitaryServicePeriodChoiceText(text)) return false;
    if (!text || text.length > 20 || !isChoiceText(text)) return false;
    return !ACTION_BUTTON_TERMS.includes(normalize(text));
}

function isPotentialCustomSelectControl(control) {
    if (isAutomationControl(control) || isChoiceButtonCandidate(control)) return false;
    const text = choiceElementText(control);
    const normalized = normalize(text);
    if (!text || ACTION_BUTTON_TERMS.includes(normalized)) return false;
    if (normalized.includes(normalize('\uacc4\uae09')) || normalized.includes(normalize('\uc81c\ub300\uad6c\ubd84')) || normalized.includes(normalize('\uc804\uc5ed\uad6c\ubd84'))) return true;
    const directKey = directFieldKeyFromText(text);
    if (MILITARY_DEPENDENT_SELECT_KEYS.has(directKey)) return true;
    const role = (control.getAttribute('role') ?? '').toLowerCase();
    const ariaHasPopup = (control.getAttribute('aria-haspopup') ?? '').toLowerCase();
    if (role === 'combobox' || ariaHasPopup === 'listbox' || ariaHasPopup === 'true' || normalized.includes(normalize('\uc120\ud0dd'))) return true;
    return role === 'combobox' || ariaHasPopup === 'listbox' || ariaHasPopup === 'true' || normalized.includes(normalize('선택'));
}

function isChoiceText(text) {
    return CHOICE_BUTTON_TERMS.includes(normalize(text));
}

function isMilitaryServicePeriodChoiceText(text) {
    const normalized = normalize(text);
    if (['18', '21', '24'].some((months) => normalized === `${months}${normalize('\uac1c\uc6d4')}` || normalized === `${months} ${normalize('\uac1c\uc6d4')}` || normalized === months)) return true;
    return ['18', '21', '24'].some((months) => normalized === `${months}${normalize('개월')}` || normalized === months);
}

function isButtonLikeChoiceControl(control) {
    const tagName = control.tagName.toLowerCase();
    const role = (control.getAttribute('role') ?? '').toLowerCase();
    return tagName === 'button' || ['button', 'radio', 'checkbox', 'switch'].includes(role);
}

function choiceElementText(element) {
    return cleanText(element?.textContent) ||
        cleanText(element?.getAttribute?.('aria-label')) ||
        cleanText(element?.getAttribute?.('data-value')) ||
        cleanText(element?.getAttribute?.('data-option')) ||
        cleanText(element?.getAttribute?.('value'));
}

function isChoiceOnlyText(text, optionText) {
    const normalized = normalize(text);
    const normalizedOption = normalize(optionText);
    return Boolean(normalizedOption && normalized === normalizedOption);
}

function shouldSkipLongText(control, context) {
    return control.tagName.toLowerCase() === 'textarea' && ESSAY_TERMS.some((term) => context.normalized.includes(normalize(term)));
}

function isTailoredActivityControl(control, context) {
    const sectionText = normalize(closestSectionText(control));
    const normalized = normalize([context.normalized, sectionText].join(' '));
    const inActivitySection = containsAny(normalized, [
        normalize('\ud559\ub0b4\uc678\ud65c\ub3d9'),
        normalize('\ub300\uc678\ud65c\ub3d9'),
        normalize('\ud65c\ub3d9\uad6c\ubd84'),
        'activity'
    ]);
    const activityField = containsAny(normalized, [
        normalize('\ud65c\ub3d9\uad6c\ubd84'),
        normalize('\uae30\uad00\ubc0f\uc870\uc9c1\uba85'),
        normalize('\ud65c\ub3d9\uae30\uac04'),
        normalize('\uc9c1\uc704\ub610\ub294\uc5ed\ud560'),
        normalize('\uc0c1\uc138\ub0b4\uc6a9'),
        normalize('\ud65c\ub3d9\ub0b4\uc6a9')
    ]);
    return inActivitySection && activityField;
}

function closestSectionText(control) {
    const section = control.closest('section, fieldset, [role="region"], article');
    if (!section) return '';
    return [
        section.getAttribute('aria-label'),
        section.querySelector('h1, h2, h3, h4, h5, legend')?.textContent
    ].filter(Boolean).join(' ');
}

function addTailoredActivityAssist(failed) {
    if (failed.some((item) => item.fieldKey === 'activities.assist')) return;
    failed.push({
        fieldKey: 'activities.assist',
        label: '\ud559\ub0b4\uc678\ud65c\ub3d9',
        reason: 'tailored_activity_required'
    });
}

function unsupportedProfileFieldFromText(text) {
    const normalized = normalize(text);
    if (!normalized) return null;
    if (normalized.includes('expectedsalary') || normalized.includes(normalize('희망연봉')) || normalized === 'salary') return '희망연봉';
    if (normalized.includes(normalize('지원분야')) || normalized.includes(normalize('모집분야')) || normalized.includes('applicationfield')) return '지원분야';
    if (normalized.includes(normalize('우편번호')) || normalized.includes('zipcode') || normalized.includes('postalcode')) return '우편번호';
    return null;
}

function addMissingProfileValue(failed, fieldKey) {
    if (!fieldKey || failed.some((item) => item.fieldKey === fieldKey)) return;
    failed.push({ fieldKey, label: labelForFieldKey(fieldKey), reason: 'missing_profile_value' });
}

function labelForFieldKey(fieldKey) {
    const labels = {
        'basicInfo.nameKo': '이름',
        'basicInfo.nameEn': '영문 이름',
        'basicInfo.email': '이메일',
        'basicInfo.phone': '휴대폰',
        'basicInfo.birthdate': '생년월일',
        'basicInfo.gender': '성별',
        'basicInfo.address': '주소',
        'basicInfo.addressDetail': '상세주소',
        'basicInfo.applicationCareerType': '신입/경력',
        'basicInfo.applicationSource': '지원경로',
        'military.status': '병역',
        'military.branch': '군별',
        'military.enlistmentDate': '입대일',
        'military.dischargeDate': '제대일',
        'military.servicePeriod': '복무기간',
        'military.rank': '계급',
        'military.dischargeType': '제대구분',
        'military.hasDisability': '장애 여부',
        'military.isVeteran': '보훈 대상 여부'
    };
    return labels[fieldKey] ?? fieldKey;
}

function copyCandidatesFromFailures(failures) {
    const candidates = [];
    const seen = new Set();
    for (const item of failures) {
        if (!isManualCopyCandidate(item)) continue;
        const key = item.fieldKey;
        if (seen.has(key)) continue;
        seen.add(key);
        candidates.push({ key, label: item.label ?? labelForFieldKey(key), value: cleanText(item.value) });
    }
    return candidates;
}

function copyCandidatesFromValues(values, excludedFieldKeys = new Set()) {
    const candidates = [];
    const seen = new Set();
    for (const value of values) {
        if (!value?.key || excludedFieldKeys.has(value.key)) continue;
        const text = cleanText(value.value);
        if (!text) continue;
        const dedupeKey = `${value.key}|${normalize(text)}`;
        if (seen.has(dedupeKey)) continue;
        seen.add(dedupeKey);
        candidates.push({ key: value.key, label: value.label, value: text });
    }
    return candidates;
}

function mergeCopyCandidates(...groups) {
    const candidates = [];
    const seen = new Set();
    for (const group of groups) {
        for (const item of Array.isArray(group) ? group : []) {
            const value = cleanText(item?.value);
            if (!item?.key || !value) continue;
            const dedupeKey = `${item.key}|${normalize(value)}`;
            if (seen.has(dedupeKey)) continue;
            seen.add(dedupeKey);
            candidates.push({ key: item.key, label: item.label, value });
        }
    }
    return candidates;
}

function isManualCopyCandidate(item) {
    return Boolean(item?.fieldKey && cleanText(item.value) && ['disabled_control', 'control_not_ready', 'apply_failed'].includes(item.reason));
}

function uniqueAutoFillResultItems(items) {
    const seen = new Set();
    const unique = [];
    for (const item of items) {
        const key = [item?.fieldKey ?? '', normalize(String(item?.value ?? '')), item?.sectionOpenControl ? 'section' : 'field'].join('|');
        if (seen.has(key)) continue;
        seen.add(key);
        unique.push(item);
    }
    return unique;
}

function containsAny(normalized, terms) {
    return terms.some((term) => normalized.includes(normalize(term)));
}

function formatValueForControl(control, value, fieldKey) {
    const dateValue = parseIsoDate(value);
    if (!dateValue || !fieldKey.toLowerCase().includes('date')) return value;
    const signature = [
        control.getAttribute('placeholder'),
        control.getAttribute('name'),
        control.id,
        control.getAttribute('aria-label')
    ].join(' ').toLowerCase();
    if (signature.includes('yyyy.mm.dd') || signature.includes('yyyy.')) return dateValue.replace(/-/g, '.');
    if (signature.includes('yyyymmdd')) return dateValue.replace(/-/g, '');
    return dateValue;
}

function parseIsoDate(value) {
    const match = cleanText(value)?.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    return match ? `${match[1]}-${match[2]}-${match[3]}` : null;
}

function waitForValue(resolveValue, fallback = null, timeoutMs = AUTOFILL_ASYNC_WAIT_TIMEOUT_MS) {
    return new Promise((resolve) => {
        const startedAt = Date.now();
        const tick = () => {
            const value = resolveValue();
            if (value || Date.now() - startedAt >= timeoutMs) {
                resolve(value ?? fallback);
                return;
            }
            setTimeout(tick, AUTOFILL_ASYNC_WAIT_INTERVAL_MS);
        };
        tick();
    });
}

function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

function cleanText(value) {
    const cleaned = typeof value === 'string' ? value.replace(/\s+/g, ' ').trim() : '';
    return cleaned || null;
}

function normalize(value) {
    return (value ?? '').toString().toLowerCase().replace(/[\s_\-()[\].:：/\\]/g, '');
}

function customFieldTerms(label) {
    const terms = [normalize(label)];
    const normalized = normalize(label);
    if (normalized.includes('portfolio')) terms.push(normalize('portfolio'), normalize('portfolio url'), normalize('포트폴리오'));
    if (normalized.includes('blog')) terms.push(normalize('블로그'));
    if (normalized.includes('github')) terms.push(normalize('깃허브'));
    return terms;
}

function asRecord(value) {
    return value && typeof value === 'object' ? value : null;
}

function firstRecord(value) {
    return Array.isArray(value) ? asRecord(value[0]) : asRecord(value);
}

function isAutomationControl(element) {
    return Boolean(element?.closest?.(`#${PANEL_HOST_ID}`));
}

function isHiddenElement(element) {
    if (element.hidden) return true;
    const style = (element.getAttribute('style') ?? '').toLowerCase().replace(/\s+/g, '');
    return style.includes('display:none') || style.includes('visibility:hidden');
}

function mutationTouchesApplicationForm(mutation) {
    if (isAutomationControl(mutation.target)) return false;
    if (mutation.type === 'attributes') return isApplicationFormNode(mutation.target);
    return [...mutation.addedNodes, ...mutation.removedNodes].some(isApplicationFormNode);
}

function isApplicationFormNode(node) {
    return node?.nodeType === 1 && !isAutomationControl(node) &&
        (node.matches?.(APPLICATION_FORM_SELECTOR) || node.querySelectorAll?.(APPLICATION_FORM_SELECTOR).length > 0);
}

function canSendRuntimeMessage() {
    return typeof chrome !== 'undefined' && Boolean(chrome.runtime?.sendMessage);
}

function sendRuntimeMessageSafely(message) {
    if (!canSendRuntimeMessage()) return;
    try {
        const response = chrome.runtime.sendMessage(message);
        response?.catch?.(() => {});
    }
    catch {
        // Extension contexts can be invalidated while this content script is still alive.
    }
}

function startApplicationFormChangeObserver() {
    if (typeof MutationObserver !== 'function' || !canSendRuntimeMessage()) return;
    const root = document.body ?? document.documentElement;
    if (!root) return;
    let lastSignature = buildApplicationFormSignature(document);
    let timer = null;
    new MutationObserver((mutations) => {
        if (!mutations.some(mutationTouchesApplicationForm)) return;
        if (timer !== null) clearTimeout(timer);
        timer = setTimeout(() => {
            timer = null;
            const signature = buildApplicationFormSignature(document);
            if (!signature || signature === lastSignature) return;
            lastSignature = signature;
            sendRuntimeMessageSafely({
                type: APPLICATION_FORM_CHANGED_MESSAGE,
                signature,
                url: location.href
            });
        }, APPLICATION_FORM_CHANGE_DEBOUNCE_MS);
    }).observe(root, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ['class', 'style', 'hidden', 'aria-hidden', 'disabled']
    });
}

if (typeof chrome !== 'undefined' && chrome.runtime?.onMessage && !window.ezOneAutoFillApplicationLoaded) {
    window.ezOneAutoFillApplicationLoaded = true;
    chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
        if (!['EZONE_PREVIEW_APPLICATION_AUTOFILL', 'EZONE_APPLY_APPLICATION_AUTOFILL', 'EZONE_AUTOFILL_APPLICATION'].includes(message?.type)) {
            return false;
        }
        const plan = buildAutoFillPlan(document, message.profile);
        if (message.type === 'EZONE_PREVIEW_APPLICATION_AUTOFILL') {
            sendResponse(previewAutoFillPlan(plan));
            return true;
        }
        applyAutoFillPlanAsync(plan)
            .then(sendResponse)
            .catch((error) => {
                sendResponse({
                    mode: 'applied',
                    filledCount: 0,
                    failedCount: 1,
                    filled: [],
                    failed: [{ label: '자동 입력', value: error instanceof Error ? error.message : '', reason: 'apply_failed' }],
                    copyCandidates: plan.copyCandidates
                });
            });
        return true;
    });
    startApplicationFormChangeObserver();
}
