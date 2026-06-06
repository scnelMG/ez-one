const BASIC_FIELDS = [
    { key: 'basicInfo.nameKo', label: '이름', section: 'basicInfo', field: 'nameKo', terms: ['이름', '성명', '지원자명', 'applicantname', 'username', 'name'] },
    { key: 'basicInfo.nameEn', label: '영문 이름', section: 'basicInfo', field: 'nameEn', terms: ['영문', '영어이름', 'englishname', 'nameen'] },
    { key: 'basicInfo.email', label: '이메일', section: 'basicInfo', field: 'email', terms: ['이메일', '메일', 'emailaddress', 'email', 'mail'] },
    { key: 'basicInfo.phone', label: '휴대폰', section: 'basicInfo', field: 'phone', terms: ['휴대폰', '휴대전화', '전화번호', '연락처', '핸드폰', 'mobile', 'phone', 'tel'] },
    { key: 'basicInfo.birthdate', label: '생년월일', section: 'basicInfo', field: 'birthdate', terms: ['생년월일', '생년', 'birth', 'birthday', 'birthdate'] },
    { key: 'basicInfo.gender', label: '성별', section: 'basicInfo', field: 'gender', terms: ['성별', 'gender', 'sex'] },
    { key: 'basicInfo.addressDetail', label: '상세주소', section: 'basicInfo', field: 'addressDetail', terms: ['상세주소', 'addressdetail', 'detailaddress'] },
    { key: 'basicInfo.address', label: '주소', section: 'basicInfo', field: 'address', terms: ['주소', '거주지', 'address'] }
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

const SKIPPED_INPUT_TYPES = new Set(['button', 'checkbox', 'color', 'file', 'hidden', 'image', 'password', 'radio', 'range', 'reset', 'submit']);
const ESSAY_TERMS = [
    '자기소개',
    '자소서',
    '지원동기',
    '입사후',
    '성장과정',
    '장단점',
    'essay',
    'motivation',
    'coverletter',
    'selfintroduction'
];

export function flattenDocumentProfileValues(profile) {
    const values = [];
    const sections = profile?.sections ?? {};
    const basicInfo = asRecord(sections.basicInfo);
    for (const config of BASIC_FIELDS) {
        const value = cleanText(basicInfo?.[config.field]);
        if (value) {
            values.push({ key: config.key, label: config.label, value, terms: config.terms.map(normalize) });
        }
    }
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
    const controls = Array.from(documentRef.querySelectorAll('input, textarea, select')).filter(isFillableControl);
    const fillable = [];
    const failed = [];
    const skipped = [];
    for (const control of controls) {
        const context = collectControlText(control);
        if (shouldSkipLongText(control, context)) {
            skipped.push({ label: context.displayLabel, reason: 'essay_or_long_text' });
            continue;
        }
        const match = findBestValue(context.normalized, values);
        if (match) {
            fillable.push({ element: control, fieldKey: match.key, label: context.displayLabel || match.label, value: match.value });
        }
        else {
            failed.push({ label: context.displayLabel || control.name || control.id || '알 수 없는 입력칸', reason: 'no_match' });
        }
    }
    return { fillable, failed, skipped, copyCandidates: values.map(({ key, label, value }) => ({ key, label, value })) };
}

export function applyAutoFillPlan(plan) {
    const filled = [];
    for (const item of plan.fillable) {
        setControlValue(item.element, item.value);
        filled.push({ fieldKey: item.fieldKey, label: item.label, value: item.value });
    }
    return {
        filledCount: filled.length,
        failedCount: plan.failed.length + plan.skipped.length,
        filled,
        failed: [...plan.failed, ...plan.skipped],
        copyCandidates: plan.copyCandidates
    };
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

function collectControlText(control) {
    const texts = [
        control.getAttribute('aria-label'),
        control.getAttribute('placeholder'),
        control.getAttribute('name'),
        control.id,
        labelText(control),
        tableHeaderText(control),
        previousSiblingText(control),
        nearbyText(control)
    ].filter(Boolean);
    return { displayLabel: cleanText(texts[0]) || '', normalized: normalize(texts.join(' ')) };
}

function labelText(control) {
    const labels = Array.from(control.labels ?? []);
    return labels.map((label) => labelTextWithoutControl(label)).join(' ');
}

function labelTextWithoutControl(label) {
    const clone = label.cloneNode(true);
    clone.querySelectorAll('input, textarea, select').forEach((item) => item.remove());
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

function nearbyText(control) {
    const parent = control.closest('label, .field, .form-group, .input-group, li, div, p');
    if (!parent) {
        return '';
    }
    const clone = parent.cloneNode(true);
    clone.querySelectorAll('input, textarea, select, button').forEach((item) => item.remove());
    return clone.textContent;
}

function setControlValue(control, value) {
    control.value = value;
    const eventWindow = control.ownerDocument.defaultView ?? window;
    control.dispatchEvent(new eventWindow.Event('input', { bubbles: true }));
    control.dispatchEvent(new eventWindow.Event('change', { bubbles: true }));
}

function isFillableControl(control) {
    if (control.disabled || control.readOnly) {
        return false;
    }
    if (control.tagName.toLowerCase() !== 'input') {
        return true;
    }
    return !SKIPPED_INPUT_TYPES.has((control.getAttribute('type') ?? 'text').toLowerCase());
}

function shouldSkipLongText(control, context) {
    return control.tagName.toLowerCase() === 'textarea' && ESSAY_TERMS.some((term) => context.normalized.includes(normalize(term)));
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

if (typeof chrome !== 'undefined' && chrome.runtime?.onMessage && !window.ezOneAutoFillApplicationLoaded) {
    window.ezOneAutoFillApplicationLoaded = true;
    chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
        if (message?.type !== 'EZONE_AUTOFILL_APPLICATION') {
            return false;
        }
        const plan = buildAutoFillPlan(document, message.profile);
        sendResponse(applyAutoFillPlan(plan));
        return true;
    });
}
