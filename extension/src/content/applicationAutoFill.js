const AUTOFILL_ASYNC_WAIT_TIMEOUT_MS = 1200;
const AUTOFILL_CUSTOM_SELECT_WAIT_TIMEOUT_MS = 350;
const AUTOFILL_ASYNC_WAIT_INTERVAL_MS = 40;
const AUTOFILL_DEPENDENT_FIELD_SETTLE_MS = 80;
const AUTOFILL_DEPENDENT_CONTROL_WAIT_TIMEOUT_MS = 2200;
const AUTOFILL_EDUCATION_AUTOCOMPLETE_OPTION_WAIT_TIMEOUT_MS = 1600;
const AUTOFILL_RELATED_IDLE_AFTER_PROGRESS_MS = 240;
const AUTOFILL_RELATED_INITIAL_IDLE_MS = 280;
const AUTOFILL_RELATED_GROUP_INITIAL_IDLE_MS = 450;
const AUTOFILL_RELATED_SCHOOL_GROUP_FAST_IDLE_MS = 280;
const AUTOFILL_RELATED_SCHOOL_GROUP_INITIAL_IDLE_MS = 1550;
const AUTOFILL_RELATED_MAJOR_DETAIL_IDLE_MS = 180;
const AUTOFILL_RELATED_MAJOR_DETAIL_WAIT_TIMEOUT_MS = 900;
const AUTOFILL_RELATED_CERTIFICATE_DETAIL_IDLE_MS = 180;
const AUTOFILL_RELATED_CERTIFICATE_DATE_IDLE_MS = 760;
const AUTOFILL_CERTIFICATE_OPTION_COMMIT_WAIT_MS = 180;
const AUTOFILL_CERTIFICATE_DATE_MISSING_WAIT_MS = 0;
const AUTOFILL_APPLY_MAX_DURATION_MS = 15000;
const PANEL_HOST_ID = 'ezone-extension-panel-host';
const APPLICATION_FORM_SELECTOR = 'input, textarea, select, button, [role="combobox"], [role="radio"], [role="checkbox"], [role="switch"], [aria-haspopup], [data-value], [data-option]';
const EDUCATION_MAJOR_DETAIL_FIELDS = new Set(['majorName', 'majorType', 'majorCategory', 'dayNight']);
const PERSISTENT_COPY_CANDIDATE_KEYS = new Set(['basicInfo.address', 'basicInfo.addressDetail']);
const ACTIVITY_COPY_CANDIDATE_MARKER = 'activities.*';
const PROFILE_PHOTO_FIELD_KEY = 'basicInfo.profilePhoto';
const AUTOFILL_CONTEXT_TEXT_MAX_LENGTH = 240;
const AUTOFILL_CONTEXT_TEXT_MAX_NODES = 80;
const openedEducationMajorControls = new WeakMap();
const applicationFormElementCaches = new WeakMap();
const activeApplicationFormElementCacheDocuments = new Set();
let applicationFormElementCacheDepth = 0;
let applicationAutoFillPlanCache = null;

const BASIC_FIELDS = [
    { key: 'basicInfo.nameKo', label: '이름', section: 'basicInfo', field: 'nameKo', terms: ['이름', '성명', '지원자명', 'applicantname', 'username', 'name'] },
    { key: 'basicInfo.nameEn', label: '영문 이름', section: 'basicInfo', field: 'nameEn', terms: ['영문이름', '영문 이름', '영어이름', 'englishname', 'nameen'] },
    { key: 'basicInfo.email', label: '이메일', section: 'basicInfo', field: 'email', terms: ['이메일', '메일', 'emailaddress', 'email', 'mail'] },
    { key: 'basicInfo.phone', label: '휴대폰', section: 'basicInfo', field: 'phone', terms: ['휴대폰', '휴대전화', '전화번호', '연락처', '핸드폰', 'mobile', 'phone', 'tel'] },
    { key: 'basicInfo.birthdate', label: '생년월일', section: 'basicInfo', field: 'birthdate', terms: ['생년월일', '생년', 'birth', 'birthday', 'birthdate'] },
    { key: 'basicInfo.gender', label: '성별', section: 'basicInfo', field: 'gender', terms: ['성별', 'gender', 'sex'] },
    { key: 'basicInfo.addressDetail', label: '상세주소', section: 'basicInfo', field: 'addressDetail', terms: ['상세주소', 'detailaddress', 'addressdetail'] },
    { key: 'basicInfo.address', label: '주소', section: 'basicInfo', field: 'address', terms: ['주소', '거주지', 'address'] },
    { key: 'basicInfo.applicationCareerType', label: '신입/경력', section: 'basicInfo', field: 'applicationCareerType', terms: ['신입경력', '신입/경력', '경력구분', '지원구분', 'careertype', 'employmentcategory'] }
];

const ATS_CONTROL_NAME_FIELD_KEYS = new Map([
    ['basicInfoGroupAnswers.name', 'basicInfo.nameKo'],
    ['basicInfoGroupAnswers.mobilePhone', 'basicInfo.phone'],
    ['basicInfoGroupAnswers.email', 'basicInfo.email'],
    ['addressGroupResumeItemAnswers.currentAddress.address', 'basicInfo.address'],
    ['addressGroupResumeItemAnswers.currentAddress.detailAddress', 'basicInfo.addressDetail']
]);

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
const MANUAL_FREE_TEXT_TERMS = [
    '경험및경력기술서', '경험 및 경력기술서', '경력기술서', '경력 기술서',
    '주요업무', '주요 업무', '프로젝트', '전문지식', '전문 지식', '스킬',
    'portfolio', 'project', 'experience', 'careerdescription'
].map(normalize);
const MANUAL_ADD_SECTION_TERMS = ['경력기술서', '경력 기술서', '포트폴리오', 'portfolio'].map(normalize);
const ACTION_BUTTON_TERMS = ['다음', '이전', '저장', '닫기', '취소', '삭제', '추가', '복사', '주소입력', '주소 입력', '사진 등록'].map(normalize);
const CHOICE_BUTTON_TERMS = [
    '남', '여', '남성', '여성',
    '비대상', '대상', '예', '아니오',
    '군필', '미필', '면제', '복무중',
    '신입', '경력', '인턴', '신입/경력',
    '주전공', '복수전공', '부전공', '연계전공', '융합전공',
    '주간', '야간'
].map(normalize);
const ADDITIONAL_CHOICE_BUTTON_TERMS = [
    '\uc878\uc5c5', '\uc878\uc5c5\uc608\uc815', '\uc911\ud1f4', '\ud734\ud559', '\uc7ac\ud559', '\uc218\ub8cc',
    '\ud559\uc0ac', '\uc804\ubb38\ud559\uc0ac', '\uc785\ud559', '\ud3b8\uc785',
    '\ubcf8\uad50', '\ubd84\uad50',
    '\uc8fc\uc804\uacf5', '\ubcf5\uc218\uc804\uacf5', '\ubd80\uc804\uacf5', '\uc5f0\uacc4\uc804\uacf5', '\uc735\ud569\uc804\uacf5',
    '\uc8fc\uac04', '\uc57c\uac04',
    '\uc7ac\uc9c1\uc911', '\ud1f4\uc0ac'
].map(normalize);

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
    addProfilePhotoValue(values, basicInfo);
    addMilitaryValues(values, sections.military);
    addEducationValues(values, sections.education);
    addCareerValues(values, sections.career);
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
    return withApplicationFormElementCache(() => buildAutoFillPlanInternal(documentRef, profile));
}

function getApplicationAutoFillPlanForMessage(documentRef, profile, options = {}) {
    return withApplicationFormElementCache(() => {
        const profileKey = applicationAutoFillProfileCacheKey(profile);
        const signature = buildApplicationFormSignature(documentRef);
        if (options.reuseCached &&
            applicationAutoFillPlanCache?.documentRef === documentRef &&
            applicationAutoFillPlanCache.profileKey === profileKey &&
            applicationAutoFillPlanCache.signature === signature) {
            return applicationAutoFillPlanCache.plan;
        }
        const plan = buildAutoFillPlanInternal(documentRef, profile);
        if (options.cacheResult) {
            applicationAutoFillPlanCache = { documentRef, profileKey, signature, plan };
        }
        return plan;
    });
}

function applicationAutoFillProfileCacheKey(profile) {
    try {
        return JSON.stringify(profile ?? null);
    }
    catch {
        return '';
    }
}

function buildAutoFillPlanInternal(documentRef = document, profile) {
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
    addDeferredCareerControlItems(allControls, values, fillable);
    addProfilePhotoFileInputItems(documentRef, values, fillable, failed);

    for (const control of controls) {
        if (consumedControls.has(control)) continue;
        const fastCertificateKey = fastIndexedCertificateDetailFieldKeyForControl(control, values);
        if (fastCertificateKey) {
            const fastMatch = values.find((value) => value.key === fastCertificateKey) ?? null;
            if (fastMatch) {
                fillable.push({
                    element: control,
                    fieldKey: fastMatch.key,
                    label: fastMatch.label,
                    value: formatValueForControl(control, fastMatch.value, fastMatch.key),
                    waitForControlBeforeFill: true,
                    relatedValues: []
                });
                continue;
            }
        }
        const context = collectControlText(control);
        if (shouldSkipLongText(control, context)) {
            const reason = manualFreeTextReason(control, context);
            skipped.push({
                label: reason === 'manual_free_text'
                    ? manualReviewFreeTextLabel(control)
                    : context.displayLabel || manualReviewFreeTextLabel(control),
                reason,
                displayOrder: applicationControlDisplayOrder(control)
            });
            continue;
        }
        if (isTailoredActivityControl(control, context)) {
            addTailoredActivityAssist(failed);
            continue;
        }
        const directKey = directFieldKeyForControl(control, context) || directFieldKeyFromText(context.displayLabel);
        if (shouldDeferCertificateDetailUntilPrimarySelection(control, directKey)) continue;
        const directMatch = directKey ? findDirectValueMatch(values, directKey, context, control) : null;
        const fallbackMatch = !directKey ? findBestValue(context.normalized, values) : null;
        const match = indexedEducationMatchForControl(values, directMatch || fallbackMatch, control, context.normalized) || directMatch || fallbackMatch;
        if (match) {
            if (shouldSkipSectionScopedFieldForCurrentPage(documentRef, match.key)) continue;
            const autocompleteSearchControl = isAutocompleteSearchControlForField(control, match.key);
            fillable.push({
                element: control,
                fieldKey: match.key,
                label: context.displayLabel || match.label,
                value: formatValueForControl(control, match.value, match.key),
                autocompleteSearchControl,
                relatedValues: autocompleteSearchControl
                    ? relatedValuesForAutocomplete(values, match.key)
                    : relatedValuesForEducationMajorField(values, match.key)
            });
        }
        else if (directKey) {
            addMissingProfileValueForAvailableProfileScope(failed, directKey, values);
        }
        else {
            const unsupported = unsupportedProfileFieldFromText(context.displayLabel);
            if (!unsupported && isRequiredApplicationControl(control, context)) {
                failed.push({ label: cleanRequiredFieldLabel(context.displayLabel || control.name || control.id || '입력칸'), reason: 'required_field' });
                continue;
            }
            failed.push(unsupported
                ? { label: unsupported, reason: 'unsupported_profile_field' }
                : { label: context.displayLabel || control.name || control.id || '알 수 없는 입력칸', reason: 'no_match' });
        }
    }

    addDeferredMilitaryDateItems(values, fillable);
    addDeferredEducationSectionItems(documentRef, values, fillable);
    addDeferredEducationMajorItems(documentRef, values, fillable);
    addDeferredCertificateItems(documentRef, values, fillable);
    prunePlannedAutocompleteRelatedValues(fillable);
    addAddressSearchFlowWarning(documentRef, values, fillable, failed);
    addManualReviewHintItems(documentRef, skipped);

    const displayOrderMap = buildApplicationFormElementOrderMap(documentRef);
    const satisfiedFieldKeys = collectSatisfiedProfileFieldKeys(documentRef, values);
    const sortedFillable = sortAutoFillItems(fillable.filter((item) => !satisfiedFieldKeys.has(item.fieldKey)));
    assignAutoFillDisplayOrders(sortedFillable, displayOrderMap);
    const excludedFieldKeys = new Set(sortedFillable.map((item) => item.fieldKey));
    for (const fieldKey of satisfiedFieldKeys) excludedFieldKeys.add(fieldKey);
    const visibleFieldOrders = collectVisibleProfileFieldOrders(documentRef, displayOrderMap);
    const visibleFieldKeys = new Set(visibleFieldOrders.keys());
    const scopedFieldKeys = scopedCopyCandidateFieldKeys(visibleFieldKeys, sortedFillable);
    const copyCandidateKeys = visibleCopyCandidateKeys(scopedFieldKeys, excludedFieldKeys);
    return {
        fillable: sortedFillable,
        failed,
        skipped,
        copyCandidates: copyCandidatesFromValues(values, excludedFieldKeys, copyCandidateKeys, visibleFieldOrders)
    };
}

function addAddressSearchFlowWarning(documentRef, values, fillable, failed) {
    const addressValue = values.find((value) => value.key === 'basicInfo.address');
    if (!addressValue || !cleanText(addressValue.value)) return;
    if (fillable.some((item) => item.fieldKey === 'basicInfo.address')) return;
    if (failed.some((item) => item.fieldKey === 'basicInfo.address')) return;
    if (!hasAddressSearchFlow(documentRef)) return;
    failed.push({
        fieldKey: 'basicInfo.address',
        label: labelForFieldKey('basicInfo.address'),
        value: addressValue.value,
        reason: 'disabled_control'
    });
}

function hasAddressSearchFlow(documentRef) {
    const controls = getApplicationFormElements(documentRef, 'input, textarea, select, button, [role="button"], [aria-haspopup]');
    return controls.some((control) => {
        const text = normalize([
            control.getAttribute?.('name'),
            control.id,
            control.getAttribute?.('placeholder'),
            control.getAttribute?.('aria-label'),
            choiceElementText(control),
            labelText(control),
            nearbyText(control)
        ].filter(Boolean).join(' '));
        if (!text) return false;
        if (text.includes(normalize('\uc8fc\uc18c\uc785\ub825')) || text.includes(normalize('\uc8fc\uc18c \uc785\ub825'))) return true;
        if (!text.includes(normalize('\uc8fc\uc18c')) && !text.includes('address') && !text.includes('zipcode') && !text.includes('postalcode')) return false;
        return control.readOnly || control.disabled || control.tagName?.toLowerCase() === 'button' || control.getAttribute?.('role') === 'button';
    });
}

function withApplicationFormElementCache(callback) {
    applicationFormElementCacheDepth += 1;
    try {
        return callback();
    }
    finally {
        applicationFormElementCacheDepth -= 1;
        releaseApplicationFormElementCachesIfIdle();
    }
}

async function withApplicationFormElementCacheAsync(callback) {
    applicationFormElementCacheDepth += 1;
    try {
        return await callback();
    }
    finally {
        applicationFormElementCacheDepth -= 1;
        releaseApplicationFormElementCachesIfIdle();
    }
}

function releaseApplicationFormElementCachesIfIdle() {
    if (applicationFormElementCacheDepth > 0) return;
    for (const documentRef of activeApplicationFormElementCacheDocuments) {
        const cache = applicationFormElementCaches.get(documentRef);
        cache?.observer?.disconnect?.();
        applicationFormElementCaches.delete(documentRef);
    }
    activeApplicationFormElementCacheDocuments.clear();
}

function prunePlannedAutocompleteRelatedValues(fillable) {
    const plannedFieldKeys = new Set(fillable.map((item) => item.fieldKey).filter(Boolean));
    for (const item of fillable) {
        if (!Array.isArray(item.relatedValues) || !item.relatedValues.length) continue;
        if (!isEducationSchoolNameField(item.fieldKey)) continue;
        item.relatedValues = item.relatedValues.filter((value) => {
            if (!value?.key) return false;
            if (isSchoolSelectionDependentEducationValue(value)) return true;
            if (plannedFieldKeys.has(value.key) || plannedFieldKeys.has(`${value.key}.open`)) return false;
            const majorNameKey = educationMajorNameKeyForNestedFieldKey(value.key);
            if (majorNameKey && (plannedFieldKeys.has(majorNameKey) || plannedFieldKeys.has(`${majorNameKey}.open`))) {
                return false;
            }
            return true;
        });
    }
}

export function applyAutoFillPlan(plan) {
    return withApplicationFormElementCache(() => applyAutoFillPlanInternal(plan));
}

function applyAutoFillPlanInternal(plan) {
    const filled = [];
    const failed = [...plan.failed];
    for (const item of plan.fillable) {
        const result = setControlValue(resolveControlForFill(item), item.value, item);
        if (result.success) {
            filled.push(autoFillResultItem(item, result.value));
        }
        else {
            if (shouldIgnoreMissingControl(item, result.reason)) continue;
            failed.push(autoFillFailureItem(item, result.reason));
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

function autoFillResultItem(item, value) {
    return {
        fieldKey: item.fieldKey,
        label: item.label,
        value,
        sectionOpenControl: Boolean(item.sectionOpenControl),
        displayOrder: item.displayOrder
    };
}

function autoFillFailureItem(item, reason) {
    return {
        fieldKey: item.fieldKey,
        label: item.label,
        value: item.value,
        reason,
        displayOrder: item.displayOrder
    };
}

export async function applyAutoFillPlanAsync(plan) {
    return await withApplicationFormElementCacheAsync(() => applyAutoFillPlanAsyncInternal(plan));
}

export function applyAutoFillPlanFast(plan) {
    return withApplicationFormElementCache(() => {
        const filled = [];
        const failed = [...plan.failed];
        const completedFieldKeys = new Set();
        const blockedSectionPrefixes = [];

        for (const item of plan.fillable) {
            if (completedFieldKeys.has(item.fieldKey)) continue;
            if (blockedSectionPrefixes.some((prefix) => String(item.fieldKey ?? '').startsWith(prefix))) {
                failed.push(autoFillFailureItem(item, 'control_not_ready'));
                continue;
            }
            const element = resolveControlForFastFill(item);
            if (!element) {
                if (shouldIgnoreMissingControl(item, 'control_not_ready')) {
                    completedFieldKeys.add(item.fieldKey);
                    continue;
                }
                failed.push(autoFillFailureItem(item, 'control_not_ready'));
                addBlockedSectionPrefix(blockedSectionPrefixes, item);
                continue;
            }
            const result = setControlValueFast(element, item.value, item);
            if (!result.success) {
                if (shouldIgnoreMissingControl(item, result.reason)) {
                    completedFieldKeys.add(item.fieldKey);
                    continue;
                }
                failed.push(autoFillFailureItem(item, result.reason));
                if (result.reason === 'control_not_ready') addBlockedSectionPrefix(blockedSectionPrefixes, item);
                continue;
            }
            filled.push(autoFillResultItem(item, result.value));
            completedFieldKeys.add(item.fieldKey);
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
    });
}

export async function applyAutoFillPlanFastAsync(plan) {
    return await withApplicationFormElementCacheAsync(async () => {
        const filled = [];
        const failed = [...plan.failed];
        const completedFieldKeys = new Set();
        const blockedSectionPrefixes = [];
        const deadlineAt = Date.now() + AUTOFILL_APPLY_MAX_DURATION_MS;

        for (const item of plan.fillable) {
            if (completedFieldKeys.has(item.fieldKey)) continue;
            if (blockedSectionPrefixes.some((prefix) => String(item.fieldKey ?? '').startsWith(prefix))) {
                failed.push(autoFillFailureItem(item, 'control_not_ready'));
                continue;
            }
            const element = await resolveControlForFastFillAsync(item, deadlineAt);
            if (!element) {
                if (shouldIgnoreMissingControl(item, 'control_not_ready')) {
                    completedFieldKeys.add(item.fieldKey);
                    continue;
                }
                failed.push(autoFillFailureItem(item, 'control_not_ready'));
                addBlockedSectionPrefix(blockedSectionPrefixes, item);
                continue;
            }
            const result = await setControlValueFastAsync(element, item.value, item, deadlineAt);
            if (!result.success) {
                if (shouldIgnoreMissingControl(item, result.reason)) {
                    completedFieldKeys.add(item.fieldKey);
                    await yieldToBrowser();
                    continue;
                }
                failed.push(autoFillFailureItem(item, result.reason));
                if (result.reason === 'control_not_ready') addBlockedSectionPrefix(blockedSectionPrefixes, item);
                await yieldToBrowser();
                continue;
            }
            filled.push(autoFillResultItem(item, result.value));
            completedFieldKeys.add(item.fieldKey);
            if (Array.isArray(result.extraFilled)) {
                filled.push(...result.extraFilled);
                result.extraFilled.forEach((extraItem) => completedFieldKeys.add(extraItem.fieldKey));
            }
            await yieldToBrowser();
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
    });
}

function yieldToBrowser() {
    return new Promise((resolve) => {
        const eventWindow = typeof window !== 'undefined' ? window : null;
        if (eventWindow?.requestAnimationFrame) {
            eventWindow.requestAnimationFrame(() => eventWindow.setTimeout(resolve, 0));
            return;
        }
        setTimeout(resolve, 0);
    });
}

function addBlockedSectionPrefix(blockedSectionPrefixes, item) {
    const prefix = sectionPrefixForOpenFieldKey(item?.sectionOpenControl ? item.fieldKey : '');
    if (prefix && !blockedSectionPrefixes.includes(prefix)) blockedSectionPrefixes.push(prefix);
}

function sectionPrefixForOpenFieldKey(fieldKey) {
    const key = String(fieldKey ?? '');
    if (key === 'education.highSchool.open') return 'education.highSchool.';
    const repeatedEducationMatch = key.match(/^education\.(universities|graduateSchools)\.(\d+)\.open$/);
    if (repeatedEducationMatch) return `education.${repeatedEducationMatch[1]}.${repeatedEducationMatch[2]}.`;
    const certificateMatch = key.match(/^certificates\.(certificates|languageTests)\.(\d+)\.open$/);
    if (certificateMatch) return `certificates.${certificateMatch[1]}.${certificateMatch[2]}.`;
    return '';
}

async function applyAutoFillPlanAsyncInternal(plan) {
    const filled = [];
    const failed = [...plan.failed];
    const completedFieldKeys = new Set();
    const deadlineAt = Date.now() + AUTOFILL_APPLY_MAX_DURATION_MS;
    for (let index = 0; index < plan.fillable.length; index += 1) {
        const item = plan.fillable[index];
        if (completedFieldKeys.has(item.fieldKey)) continue;
        if (!hasAutoFillTimeRemaining(deadlineAt)) {
            addAutofillTimeoutFailures(failed, plan.fillable.slice(index), completedFieldKeys);
            break;
        }
        if (certificatePrimaryAlreadySelected(item.element?.ownerDocument, item.fieldKey, item.value)) {
            filled.push(autoFillResultItem(item, item.value));
            completedFieldKeys.add(item.fieldKey);
            continue;
        }
        const element = await resolveControlForFillAsync(item, deadlineAt);
        if (!element && !hasAutoFillTimeRemaining(deadlineAt)) {
            failed.push(autofillTimeoutFailure(item));
            addAutofillTimeoutFailures(failed, plan.fillable.slice(index + 1), completedFieldKeys);
            break;
        }
        if (!element && shouldIgnoreMissingControl(item, 'control_not_ready')) {
            completedFieldKeys.add(item.fieldKey);
            continue;
        }
        if (!element && educationMajorDetailAlreadySelected(item.element?.ownerDocument, item.fieldKey, item.value, item.relatedValues)) {
            filled.push(autoFillResultItem(item, item.value));
            completedFieldKeys.add(item.fieldKey);
            continue;
        }
        const result = await setControlValueAsync(element, item.value, item, deadlineAt);
        if (result.success) {
            filled.push(autoFillResultItem(item, result.value));
            completedFieldKeys.add(item.fieldKey);
            if (Array.isArray(result.extraFilled)) {
                filled.push(...result.extraFilled);
                result.extraFilled.forEach((extraItem) => completedFieldKeys.add(extraItem.fieldKey));
            }
        }
        else {
            if (shouldIgnoreMissingControl(item, result.reason)) {
                completedFieldKeys.add(item.fieldKey);
                continue;
            }
            if (result.reason === 'control_not_ready' && educationMajorDetailAlreadySelected(item.element?.ownerDocument, item.fieldKey, item.value, item.relatedValues)) {
                filled.push(autoFillResultItem(item, item.value));
                completedFieldKeys.add(item.fieldKey);
                continue;
            }
            const reason = !hasAutoFillTimeRemaining(deadlineAt) && result.reason === 'control_not_ready'
                ? 'autofill_timeout'
                : result.reason;
            failed.push(autoFillFailureItem(item, reason));
            if (reason === 'autofill_timeout') {
                addAutofillTimeoutFailures(failed, plan.fillable.slice(index + 1), completedFieldKeys);
                break;
            }
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

function resolveControlForFastFill(item) {
    if (!item.waitForControlBeforeFill && !item.requiresEnabledBeforeFill) return item.element ?? null;
    if (item.element?.isConnected && (isEffectivelyDisabled(item.element) || (item.element.readOnly && !canFillReadonlyControlForField(item.element, item.fieldKey)))) return null;
    const nestedMajorNameKey = educationMajorNameKeyForNestedFieldKey(item.fieldKey);
    if (nestedMajorNameKey && item.waitForControlBeforeFill) return null;
    const current = findCurrentControlForFieldKey(item.element?.ownerDocument, item.fieldKey, item.value, { relatedValues: item.relatedValues });
    return current && canFillControlForField(current, item.fieldKey) ? current : null;
}

async function resolveControlForFastFillAsync(item, deadlineAt = Number.POSITIVE_INFINITY) {
    if (!item.waitForControlBeforeFill && !item.requiresEnabledBeforeFill) return item.element ?? null;
    if (item.waitForControlBeforeFill) {
        return await resolveControlForFillAsync(item, deadlineAt);
    }
    return resolveControlForFastFill(item);
}

function setControlValueFast(control, value, item = {}) {
    if (!control) return { success: false, reason: 'control_not_ready' };
    if (item.sectionOpenControl) return { success: false, reason: 'control_not_ready' };

    const fillValue = item.waitForControlBeforeFill ? formatValueForControl(control, value, item.fieldKey) : value;
    if (item.autocompleteSearchControl ||
        (isAutocompletePrimaryFieldKey(item.fieldKey) && isAutocompleteSearchControl(control)) ||
        shouldForceAutocompleteSearchControl(control, item.fieldKey)) {
        return setAutocompleteSearchValueFast(control, fillValue, item);
    }
    if (item.customSelectControl || isDeferredLanguageScoreSelectControl(control, item)) {
        return setCustomSelectValue(control, fillValue, item);
    }
    return setControlValue(control, fillValue, item);
}

async function setControlValueFastAsync(control, value, item = {}, deadlineAt = Number.POSITIVE_INFINITY) {
    if (!control) return { success: false, reason: 'control_not_ready' };

    const fillValue = item.waitForControlBeforeFill ? formatValueForControl(control, value, item.fieldKey) : value;
    if (item.sectionOpenControl) {
        return await setSectionOpenControlValueAsync(control, fillValue, item, deadlineAt);
    }
    if (item.autocompleteSearchControl ||
        (isAutocompletePrimaryFieldKey(item.fieldKey) && isAutocompleteSearchControl(control)) ||
        shouldForceAutocompleteSearchControl(control, item.fieldKey)) {
        return await setAutocompleteSearchValueAsync(control, fillValue, item, deadlineAt);
    }
    if (item.customSelectControl || isDeferredLanguageScoreSelectControl(control, item)) {
        return await setCustomSelectValueFastAsync(control, fillValue, item);
    }
    return setControlValueFast(control, value, item);
}

function setAutocompleteSearchValueFast(control, value, item = {}) {
    control.click();
    control.focus?.();
    setNativeControlValue(control, value);
    dispatchInputEvents(control);
    const option = findMatchingAutocompleteOptionForValues(
        control.ownerDocument,
        autocompleteCandidateValues(value, item),
        control,
        {
            exactOptionOnly: isEducationSchoolNameField(item.fieldKey) ||
                isEducationMajorNameField(item.fieldKey) ||
                isCertificatePrimaryFieldKey(item.fieldKey)
        }
    );
    if (option) {
        activateElement(option);
        setChoiceState(option);
        return { success: true, value: choiceElementText(option) || value };
    }
    return { success: true, value };
}

function addAutofillTimeoutFailures(failed, items, completedFieldKeys) {
    for (const item of items) {
        if (completedFieldKeys.has(item.fieldKey)) continue;
        if (failed.some((failure) => failure.fieldKey === item.fieldKey && failure.reason === 'autofill_timeout')) continue;
        failed.push(autofillTimeoutFailure(item));
    }
}

function shouldIgnoreMissingControl(item, reason) {
    return Boolean(item?.ignoreMissingControl && ['control_not_ready', 'autofill_timeout'].includes(reason));
}

function autofillTimeoutFailure(item) {
    return {
        fieldKey: item.fieldKey,
        label: item.label,
        value: item.value,
        reason: 'autofill_timeout',
        displayOrder: item.displayOrder
    };
}

export function previewAutoFillPlan(plan) {
    const planned = uniqueAutoFillResultItems(plan.fillable.map(({ fieldKey, label, value, sectionOpenControl, displayOrder }) => ({
        fieldKey,
        label,
        value,
        sectionOpenControl: Boolean(sectionOpenControl),
        displayOrder
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
    const readinessCache = new WeakMap();
    return items
        .map((item, index) => ({ item, index }))
        .sort((left, right) => compareAutoFillItemOrder(left, right, readinessCache))
        .map(({ item }) => item);
}

function assignAutoFillDisplayOrders(items, orderMap) {
    items.forEach((item, index) => {
        item.displayOrder = autoFillItemDisplayOrder(item, orderMap, index);
    });
}

function autoFillItemDisplayOrder(item, orderMap, fallbackIndex = 0) {
    const element = autoFillOrderElement(item);
    const order = element ? orderMap.get(element) : null;
    return Number.isFinite(order) ? order : 100000 + fallbackIndex;
}

function buildApplicationFormElementOrderMap(documentRef) {
    const orderMap = new WeakMap();
    const root = documentRef?.body ?? documentRef;
    const nodeFilter = documentRef?.defaultView?.NodeFilter?.SHOW_ELEMENT ?? 1;
    const walker = documentRef?.createTreeWalker?.(root, nodeFilter);
    if (!walker) return orderMap;
    let index = 0;
    let node = walker.currentNode;
    while (node) {
        if (node.matches?.(APPLICATION_FORM_SELECTOR) && !isAutomationControl(node) && !isHiddenElement(node)) {
            orderMap.set(node, index);
            index += 1;
        }
        node = walker.nextNode();
    }
    return orderMap;
}

function compareAutoFillItemOrder(left, right, readinessCache = new WeakMap()) {
    const dependencyOrder = compareAutoFillDependencyOrder(left.item, right.item);
    if (dependencyOrder !== 0) return dependencyOrder;
    const leftPriority = autoFillFieldPriority(left.item.fieldKey);
    const rightPriority = autoFillFieldPriority(right.item.fieldKey);
    if (leftPriority !== null && rightPriority !== null && leftPriority !== rightPriority) {
        return leftPriority - rightPriority;
    }
    if (leftPriority !== null && rightPriority === null) return -1;
    if (leftPriority === null && rightPriority !== null) return 1;
    const domOrder = compareAutoFillItemDomOrder(left.item, right.item);
    if (domOrder !== 0) return domOrder;
    const readinessOrder = compareAutoFillReadinessOrder(left.item, right.item, readinessCache);
    if (readinessOrder !== 0) return readinessOrder;
    return left.index - right.index;
}

function compareAutoFillReadinessOrder(left, right, readinessCache = new WeakMap()) {
    return autoFillItemReadinessRank(left, readinessCache) - autoFillItemReadinessRank(right, readinessCache);
}

function autoFillItemReadinessRank(item, readinessCache = new WeakMap()) {
    if (readinessCache.has(item)) return readinessCache.get(item);
    let rank;
    if (item?.waitForControlBeforeFill) {
        const current = findCurrentControlForFieldKey(item.element?.ownerDocument, item.fieldKey, item.value, {
            relatedValues: item.relatedValues
        });
        rank = current && canFillControlForField(current, item.fieldKey) ? 0 : 2;
    }
    else if (item?.sectionOpenControl || item?.requiresEnabledBeforeFill) {
        rank = 1;
    }
    else {
        rank = autoFillOrderElement(item) ? 0 : 2;
    }
    readinessCache.set(item, rank);
    return rank;
}

function compareAutoFillDependencyOrder(left, right) {
    const leftBase = autoFillDependencyBase(left?.fieldKey);
    const rightBase = autoFillDependencyBase(right?.fieldKey);
    if (!leftBase || leftBase !== rightBase) return 0;
    const leftPriority = autoFillFieldPriority(left.fieldKey);
    const rightPriority = autoFillFieldPriority(right.fieldKey);
    if (leftPriority === null || rightPriority === null || leftPriority === rightPriority) return 0;
    return leftPriority - rightPriority;
}

function autoFillDependencyBase(fieldKey) {
    const key = String(fieldKey ?? '');
    return key.match(/^(education\.(?:universities|graduateSchools)\.\d+\.majors\.\d+)\./)?.[1] ??
        key.match(/^(certificates\.(?:languageTests|certificates)\.\d+)\./)?.[1] ??
        null;
}

function compareAutoFillItemDomOrder(left, right) {
    const leftElement = autoFillOrderElement(left);
    const rightElement = autoFillOrderElement(right);
    if (!leftElement || !rightElement || leftElement === rightElement) return 0;
    const position = leftElement.compareDocumentPosition(rightElement);
    if (position & Node.DOCUMENT_POSITION_FOLLOWING) return -1;
    if (position & Node.DOCUMENT_POSITION_PRECEDING) return 1;
    if (position & Node.DOCUMENT_POSITION_CONTAINED_BY) return 1;
    if (position & Node.DOCUMENT_POSITION_CONTAINS) return -1;
    return 0;
}

function autoFillOrderElement(item) {
    const element = item?.element;
    if (!element || !element.ownerDocument || element === element.ownerDocument.body) return null;
    return element;
}

function autoFillFieldPriority(fieldKey) {
    if (Object.prototype.hasOwnProperty.call(AUTO_FILL_FIELD_PRIORITY, fieldKey)) {
        return AUTO_FILL_FIELD_PRIORITY[fieldKey];
    }
    const educationPriority = educationAutoFillFieldPriority(fieldKey);
    if (educationPriority != null) return educationPriority;
    return certificateAutoFillFieldPriority(fieldKey);
}

function certificateAutoFillFieldPriority(fieldKey) {
    const key = String(fieldKey ?? '');
    const match = key.match(/^certificates\.(languageTests|certificates)\.(\d+)\.([^.]+)$/);
    if (!match) return null;
    const groupOrder = match[1] === 'languageTests' ? 0 : 500;
    const recordOrder = Number(match[2]) * 100;
    const fieldOrder = {
        open: 0,
        testName: 10,
        certificateName: 10,
        issuer: 20,
        registrationNumber: 30,
        score: 40,
        acquiredDate: 50
    };
    return Object.prototype.hasOwnProperty.call(fieldOrder, match[3])
        ? 700 + groupOrder + recordOrder + fieldOrder[match[3]]
        : null;
}

function educationAutoFillFieldPriority(fieldKey) {
    const key = String(fieldKey ?? '');
    const field = key.match(/\.([^.]+)$/)?.[1] ?? '';
    if (!key.startsWith('education.')) return null;
    const majorOpenMatch = key.match(/\.majors\.(\d+)\.majorName\.open$/);
    if (majorOpenMatch) return 405 + (Number(majorOpenMatch[1]) * 40);
    if (field === 'open') return 300;
    if (field === 'schoolName') return 310;
    const majorMatch = key.match(/\.majors\.(\d+)\.([^.]+)$/);
    if (majorMatch) {
        const majorIndex = Number(majorMatch[1]);
        const majorFieldOrder = {
            majorName: 0,
            majorCategory: 10,
            majorType: 20,
            dayNight: 30
        };
        const majorField = majorMatch[2];
        return Object.prototype.hasOwnProperty.call(majorFieldOrder, majorField)
            ? 410 + (majorIndex * 40) + majorFieldOrder[majorField]
            : null;
    }
    if (field === 'majorName') return 410;
    const fieldOrder = {
        degreeType: 320,
        graduationStatus: 330,
        admissionType: 340,
        location: 350,
        track: 360,
        campusType: 370,
        admissionDate: 380,
        graduationDate: 390,
        majorType: 420,
        majorCategory: 430,
        dayNight: 440,
        grade: 500,
        gradeScale: 510,
        credits: 520
    };
    return Object.prototype.hasOwnProperty.call(fieldOrder, field) ? fieldOrder[field] : null;
}

function getApplicationFormElements(documentRef, selector) {
    if (applicationFormElementCacheDepth <= 0) {
        return Array.from(documentRef.querySelectorAll(selector)).filter((element) => !isAutomationControl(element) && !isHiddenElement(element));
    }
    const cache = applicationFormElementCacheForDocument(documentRef);
    const cached = cache?.selectors.get(selector);
    if (cached?.version === cache.version) {
        return cached.elements.filter((element) => element.isConnected);
    }
    const elements = Array.from(documentRef.querySelectorAll(selector)).filter((element) => !isAutomationControl(element) && !isHiddenElement(element));
    if (cache) cache.selectors.set(selector, { version: cache.version, elements });
    return elements;
}

function applicationFormElementCacheForDocument(documentRef) {
    if (!documentRef) return null;
    activeApplicationFormElementCacheDocuments.add(documentRef);
    let cache = applicationFormElementCaches.get(documentRef);
    if (cache) return cache;
    cache = createApplicationFormElementCache();
    const MutationObserverCtor = documentRef.defaultView?.MutationObserver;
    if (MutationObserverCtor && documentRef.body) {
        cache.observer = new MutationObserverCtor(() => {
            cache.version += 1;
            cache.selectors.clear();
            resetApplicationFormTextCache(cache);
        });
        cache.observer.observe(documentRef.body, {
            childList: true,
            subtree: true,
            attributes: true,
            attributeFilter: ['class', 'style', 'hidden', 'aria-hidden', 'disabled', 'aria-disabled']
        });
    }
    applicationFormElementCaches.set(documentRef, cache);
    return cache;
}

function createApplicationFormElementCache() {
    return {
        version: 0,
        selectors: new Map(),
        observer: null,
        text: createApplicationFormTextCache()
    };
}

function createApplicationFormTextCache() {
    return {
        labelWithoutControl: new WeakMap(),
        elementOwnText: new WeakMap(),
        nearbyRawText: new WeakMap(),
        normalizedBodyText: ''
    };
}

function resetApplicationFormTextCache(cache) {
    cache.text = createApplicationFormTextCache();
}

function applicationFormTextCacheForElement(element) {
    if (applicationFormElementCacheDepth <= 0 || !element?.ownerDocument) return null;
    return applicationFormElementCacheForDocument(element.ownerDocument)?.text ?? null;
}

function applicationFormTextCacheForDocument(documentRef) {
    if (applicationFormElementCacheDepth <= 0 || !documentRef) return null;
    return applicationFormElementCacheForDocument(documentRef)?.text ?? null;
}

function invalidateApplicationFormElementCache(documentRef) {
    const cache = documentRef ? applicationFormElementCaches.get(documentRef) : null;
    if (!cache) return;
    cache.version += 1;
    cache.selectors.clear();
    resetApplicationFormTextCache(cache);
}

function addChoiceItems(documentRef, values, fillable) {
    const usedFieldKeys = new Set(fillable.map((item) => item.fieldKey));
    const controls = Array.from(new Set(getApplicationFormElements(documentRef, 'input[type="radio"], input[type="checkbox"], button[type="button"], button:not([type]), [role="button"], [role="radio"], [role="checkbox"], [role="switch"], [aria-pressed], [aria-selected], [data-value], [data-option]')))
        .filter((control) => !control.closest?.('#dropdown-body, [role="listbox"]'))
        .filter(isChoiceButtonCandidate);
    for (const control of controls) {
        const optionText = choiceCandidateText(control);
        const context = collectChoiceText(control, optionText);
        if (isTailoredActivityControl(control, context)) continue;
        const directKey = directFieldKeyForControl(control, context) || directFieldKeyFromText(context.displayLabel);
        const directMatch = directKey ? findDirectValueMatch(values, directKey, context, control) : null;
        const match = choiceValueMatchesOption(directMatch, optionText, usedFieldKeys)
            ? directMatch
            : findBestChoiceValue(optionText, context.normalized, values, usedFieldKeys);
        if (!match) continue;
        if (shouldSkipSectionScopedFieldForCurrentPage(documentRef, match.key)) continue;
        if (educationMajorControlHasTopLevelEducationMatch(control, match.key)) continue;
        if (educationMajorControlTargetsDifferentMajorName(control, values, match.key)) continue;
        if (shouldDeferEducationMajorDependentControl(control, match.key)) continue;
        usedFieldKeys.add(match.key);
        fillable.push({
            element: control,
            fieldKey: match.key,
            label: match.label,
            value: optionText || match.value,
            choiceControl: true,
            relatedValues: relatedValuesForEducationMajorField(values, match.key)
        });
    }
}

function addCustomSelectItems(documentRef, values, fillable, failed) {
    const usedFieldKeys = new Set(fillable.map((item) => item.fieldKey));
    const controls = Array.from(new Set(getApplicationFormElements(documentRef, '[role="combobox"], [aria-haspopup="listbox"], [aria-haspopup="true"], button[type="button"], button:not([type]), [tabindex]:not(input):not(textarea):not(select)')))
        .filter((control) => !control.closest?.('#dropdown-body, [role="listbox"]'))
        .filter((control) => militaryDependentSelectKeyFromText(choiceElementText(control)) || isCustomSelectLikeControl(control));
    for (const control of controls) {
        const context = collectCustomSelectText(control);
        if (isTailoredActivityControl(control, context)) {
            addTailoredActivityAssist(failed);
            continue;
        }
        const key = militaryDependentSelectKeyFromText(choiceElementText(control)) || directFieldKeyForControl(control, context) || directFieldKeyFromText(choiceElementText(control)) || directFieldKeyFromText(context.displayLabel);
        if (!key || usedFieldKeys.has(key)) continue;
        if (shouldSkipSectionScopedFieldForCurrentPage(documentRef, key)) continue;
        const match = findDirectValueMatch(values, key, context, control);
        if (match && isNestedEducationMajorValueKey(match.key) && !closestEducationMajorEntry(control)) {
            continue;
        }
        if (match && educationMajorControlHasTopLevelEducationMatch(control, match.key)) {
            continue;
        }
        if (match && educationMajorControlTargetsDifferentMajorName(control, values, match.key)) {
            continue;
        }
        if (match && isAutocompleteSearchControlForField(control, match.key)) {
            continue;
        }
        if (!match) {
            if (shouldDeferEducationMajorDependentControl(control, key) || isMajorCategoryPromptControl(control, context)) continue;
            addMissingProfileValueForAvailableProfileScope(failed, key, values);
            continue;
        }
        if (shouldDeferEducationMajorDependentControl(control, match.key)) continue;
        usedFieldKeys.add(match.key);
        fillable.push({
            element: control,
            fieldKey: match.key,
            label: match.label,
            value: match.value,
            customSelectControl: true,
            requiresEnabledBeforeFill: control.disabled || control.getAttribute('aria-disabled') === 'true',
            relatedValues: relatedValuesForEducationMajorField(values, match.key)
        });
    }
}

function shouldSkipSectionScopedFieldForCurrentPage(documentRef, fieldKey) {
    const key = String(fieldKey ?? '');
    const certificateGroup = certificateGroupFromFieldKey(key);
    if (certificateGroup) return !documentHasCertificateGroupSurface(documentRef, certificateGroup);
    if (key.startsWith('military.')) return !documentHasMilitarySurface(documentRef);
    return false;
}

function certificateGroupFromFieldKey(fieldKey) {
    return String(fieldKey ?? '').match(/^certificates\.(languageTests|certificates)\.(?:\*|\d+)\./)?.[1] ?? null;
}

function documentHasCertificateGroupSurface(documentRef, group) {
    if (!documentRef || !group) return false;
    if (certificateGroupHasVisibleFieldSurface(documentRef, group)) return true;
    if (findCertificateAddControl(documentRef, group)) return true;
    const navigation = findCertificateNavigationOpenControl(documentRef, group);
    return Boolean(navigation && !documentHasActiveNonCertificateDataEntrySurface(documentRef));
}

function certificateGroupHasVisibleFieldSurface(documentRef, group) {
    const controls = getApplicationFormElements(documentRef, 'input, textarea, select, [role="combobox"], [aria-haspopup="listbox"], [aria-haspopup="true"], button[type="button"], button:not([type]), [tabindex]:not(input):not(textarea):not(select)')
        .filter((control) => !control.closest?.('#dropdown-body, [role="listbox"]'));
    return controls.some((control) => {
        const signature = normalizedDirectControlSignature(control);
        const key = directCertificateFieldKeyForControl(control, signature);
        if (certificateGroupFromFieldKey(key) === group) return true;
        return false;
    });
}

function documentHasActiveNonCertificateDataEntrySurface(documentRef) {
    const controls = getApplicationFormElements(documentRef, 'input, textarea, select');
    return controls.some((control) => {
        const context = collectControlText(control);
        const key = directFieldKeyForControl(control, context) || directFieldKeyFromText(context.displayLabel);
        return !certificateGroupFromFieldKey(key);
    });
}

function documentHasMilitarySurface(documentRef) {
    if (!documentRef) return false;
    const controls = getApplicationFormElements(documentRef, 'input, textarea, select, button[type="button"], button:not([type]), [role="button"], [role="radio"], [role="checkbox"], [role="switch"], [role="combobox"], [aria-haspopup="listbox"], [aria-haspopup="true"], [data-value], [data-option]')
        .filter((control) => !control.closest?.('#dropdown-body, [role="listbox"]'));
    return controls.some((control) => {
        const context = control.matches?.('input, textarea, select')
            ? collectControlText(control)
            : collectCustomSelectText(control);
        const key = directFieldKeyForControl(control, context) || directFieldKeyFromText(context.displayLabel);
        if (String(key ?? '').startsWith('military.')) return true;
        const optionKey = directFieldKeyFromText(choiceElementText(control));
        return String(optionKey ?? '').startsWith('military.') && militaryControlHasNearbyContext(control);
    });
}

function militaryControlHasNearbyContext(control) {
    const context = normalize([
        choiceElementText(control),
        nearbyText(control),
        previousChoiceContextText(control, choiceElementText(control)),
        ancestorPreviousSiblingText(control),
        closestSectionText(control),
        precedingHeadingText(control)
    ].filter(Boolean).join(' '));
    return context.includes(normalize('\uBCD1\uC5ED')) ||
        context.includes('military') ||
        context.includes(normalize('\uACC4\uAE09')) ||
        context.includes(normalize('\uC81C\uB300\uAD6C\uBD84')) ||
        context.includes(normalize('\uC804\uC5ED\uAD6C\uBD84')) ||
        context.includes(normalize('\uC7A5\uC560')) ||
        context.includes(normalize('\uBCF4\uD6C8'));
}

function addDeferredCareerControlItems(allControls, values, fillable) {
    const usedFieldKeys = new Set(fillable.map((item) => item.fieldKey));
    for (const control of allControls) {
        if (!isEffectivelyDisabled(control) && !control.readOnly) continue;
        const context = collectControlText(control);
        const directKey = directCareerFieldKeyForControl(control, context.normalized) || deferredCareerFieldKeyForControl(control, context);
        if (!directKey) continue;
        const match = findDirectValueMatch(values, directKey, context, control);
        if (!match || usedFieldKeys.has(match.key)) continue;
        usedFieldKeys.add(match.key);
        fillable.push({
            element: control,
            fieldKey: match.key,
            label: context.displayLabel || match.label,
            value: formatValueForControl(control, match.value, match.key),
            requiresEnabledBeforeFill: true
        });
    }
}

function deferredCareerFieldKeyForControl(control, context = {}) {
    const sectionContext = normalize([context.normalized, careerSectionContextText(control)].filter(Boolean).join(' '));
    if (!closestCareerSection(control) && !sectionContext.includes(normalize('\uacbd\ub825')) && !sectionContext.includes('career')) return null;
    const ownSignature = normalize([
        control.getAttribute?.('placeholder'),
        control.getAttribute?.('name'),
        control.id,
        control.getAttribute?.('aria-label')
    ].filter(Boolean).join(' '));
    if (ownSignature.includes(normalize('\ud1f4\uc0ac\uc77c')) || ownSignature.includes('enddate')) return 'career.careers.*.endDate';
    if (ownSignature.includes(normalize('\uc785\uc0ac\uc77c')) || ownSignature.includes('startdate')) return 'career.careers.*.startDate';
    return null;
}

function isMajorCategoryPromptControl(control, context = {}) {
    const text = normalize([
        context.displayLabel,
        choiceElementText(control),
        control.getAttribute?.('placeholder'),
        control.getAttribute?.('aria-label')
    ].filter(Boolean).join(' '));
    return text.includes(normalize('\uc804\uacf5\uacc4\uc5f4')) && !text.includes(normalize('\ud559\uacfc\uacc4\uc5f4'));
}

function isEducationCustomSelectControl(control) {
    if (isChoiceButtonCandidate(control)) return false;
    const context = collectCustomSelectText(control);
    const key = directEducationFieldKeyForControl(control, normalize([
        control.getAttribute('name'),
        control.id,
        control.getAttribute('placeholder'),
        control.getAttribute('aria-label'),
        context.displayLabel,
        choiceElementText(control)
    ].filter(Boolean).join(' '))) || directFieldKeyFromText(choiceElementText(control)) || directFieldKeyFromText(context.displayLabel);
    return /^education\.(?:highSchool|universities|graduateSchools|\*)/.test(String(key ?? '')) &&
        /\.(?:location|gradeScale|majorCategory|campusType)$/.test(String(key));
}

function isCustomSelectLikeControl(control) {
    return isPotentialCustomSelectControl(control) ||
        isEducationCustomSelectControl(control) ||
        isLanguageScoreCustomSelectControl(control);
}

function isLanguageScoreCustomSelectControl(control) {
    if (!control || isActionButtonControl(control) || isIconOnlyActionButton(control)) return false;
    if (['input', 'textarea', 'select'].includes(control.tagName?.toLowerCase())) return false;
    const ownText = normalize(choiceElementText(control));
    if (!ownText ||
        (!ownText.includes(normalize('\ub4f1\uae09')) &&
            !ownText.includes('score') &&
            !ownText.includes('level'))) {
        return false;
    }
    const context = collectCustomSelectText(control);
    const signature = normalize([
        ownText,
        context.displayLabel,
        context.nearby,
        certificateSectionContextText(control)
    ].filter(Boolean).join(' '));
    return directCertificateFieldKeyForControl(control, signature) === 'certificates.languageTests.*.score';
}

function addDeferredMilitaryDateItems(values, fillable) {
    const statusItem = fillable.find((item) => item.fieldKey === 'military.status' && isCompletedMilitaryStatus(item.value));
    if (!statusItem) return;
    for (const fieldKey of MILITARY_DEPENDENT_DATE_KEYS) {
        if (fillable.some((item) => item.fieldKey === fieldKey)) continue;
        const match = values.find((value) => value.key === fieldKey);
        if (!match) continue;
        fillable.push({
            element: statusItem.element,
            fieldKey,
            label: match.label,
            value: match.value,
            waitForControlBeforeFill: true
        });
    }
}

function addDeferredEducationSectionItems(documentRef, values, fillable) {
    addDeferredEducationGroupItems({
        documentRef,
        values: values.filter((value) => value.key.startsWith('education.highSchool.')),
        fillable,
        openKey: 'education.highSchool.open',
        openLabel: '\uACE0\uB4F1\uD559\uAD50 \uC785\uB825\uCE78 \uC5F4\uAE30',
        buttonTerms: ['\uACE0\uB4F1\uD559\uAD50']
    });
    addDeferredRepeatedEducationGroupItems(documentRef, values, fillable, {
        group: 'universities',
        openLabel: '\uB300\uD559\uAD50 \uC785\uB825\uCE78 \uC5F4\uAE30',
        buttonTerms: ['\uB300\uD559\uAD50']
    });
    addDeferredRepeatedEducationGroupItems(documentRef, values, fillable, {
        group: 'graduateSchools',
        openLabel: '\uB300\uD559\uC6D0 \uC785\uB825\uCE78 \uC5F4\uAE30',
        buttonTerms: ['\uB300\uD559\uC6D0']
    });
}

function addDeferredRepeatedEducationGroupItems(documentRef, values, fillable, config) {
    const grouped = new Map();
    const pattern = new RegExp(`^education\\.${config.group}\\.(\\d+)\\.`);
    for (const value of values) {
        const match = value.key.match(pattern);
        if (!match) continue;
        const index = match[1];
        if (!grouped.has(index)) grouped.set(index, []);
        grouped.get(index).push(value);
    }
    for (const [index, groupValues] of grouped) {
        addDeferredEducationGroupItems({
            documentRef,
            values: groupValues,
            fillable,
            openKey: `education.${config.group}.${index}.open`,
            openLabel: config.openLabel,
            buttonTerms: config.buttonTerms
        });
    }
}

function addDeferredEducationGroupItems({ documentRef, values, fillable, openKey, openLabel, buttonTerms }) {
    const missingValues = values.filter((value) => !fillable.some((item) => item.fieldKey === value.key));
    if (!missingValues.length) return;
    const opener = findEducationSectionOpenControl(documentRef, buttonTerms);
    if (!opener) return;
    if (!fillable.some((item) => item.fieldKey === openKey)) {
        fillable.push({
            element: opener,
            fieldKey: openKey,
            label: openLabel,
            value: '\uC785\uB825\uCE78 \uC5F4\uAE30',
            sectionOpenControl: true
        });
    }
    for (const value of missingValues) {
        fillable.push({
            element: opener,
            fieldKey: value.key,
            label: value.label,
            value: value.value,
            waitForControlBeforeFill: true,
            ignoreMissingControl: isOptionalDeferredEducationFieldKey(value.key),
            relatedValues: isEducationSchoolNameField(value.key) ? relatedValuesForAutocomplete(values, value.key) : []
        });
    }
}

function isOptionalDeferredEducationFieldKey(fieldKey) {
    const key = String(fieldKey ?? '');
    const field = key.match(/\.([^.]+)$/)?.[1] ?? '';
    if (key.startsWith('education.highSchool.')) return ['location', 'track'].includes(field);
    if (/^education\.(universities|graduateSchools)\.\d+\./.test(key)) {
        return ['location', 'campusType', 'majorCategory', 'grade', 'gradeScale', 'credits'].includes(field);
    }
    return false;
}

function findEducationSectionOpenControl(documentRef, buttonTerms) {
    const controls = getApplicationFormElements(documentRef, 'button[type="button"], button:not([type]), [role="button"]');
    return controls.find((control) => {
        const text = normalize(choiceCandidateText(control));
        if (!text) return false;
        return buttonTerms.some((term) => text.includes(normalize(term)));
    }) ?? null;
}

function addDeferredEducationMajorItems(documentRef, values, fillable) {
    const majorValues = values.filter((value) => /\.majorName$/.test(value.key) &&
        !fillable.some((item) => item.fieldKey === value.key))
        .sort((left, right) => educationMajorValueOrder(left.key) - educationMajorValueOrder(right.key));
    for (const value of majorValues) {
        const rowExists = educationMajorEntryExistsForFieldKey(documentRef, value.key, value.value);
        const opener = rowExists ? documentRef.body : findEducationMajorOpenControl(documentRef, value.key);
        if (!opener) continue;
        const majorRelatedValues = values.filter((candidate) => educationMajorDetailBase(candidate.key) === educationMajorDetailBase(value.key));
        const majorDetailValues = majorRelatedValues.filter((candidate) => {
            if (fillable.some((item) => item.fieldKey === candidate.key)) return false;
            if (candidate.key === value.key && educationMajorNameAlreadySelected(documentRef, value.key, value.value)) return false;
            if (rowExists &&
                candidate.key !== value.key &&
                !educationMajorDetailControlAvailable(documentRef, candidate.key, candidate.value, majorRelatedValues) &&
                !educationMajorDetailAlreadySelected(documentRef, candidate.key, candidate.value, majorRelatedValues)) {
                return false;
            }
            return true;
        });
        const openKey = `${value.key}.open`;
        if (!rowExists && !fillable.some((item) => item.fieldKey === openKey)) {
            fillable.push({
                element: opener,
                fieldKey: openKey,
                label: `${value.label} \uC785\uB825\uCE78 \uC5F4\uAE30`,
                value: '\uC785\uB825\uCE78 \uC5F4\uAE30',
                sectionOpenControl: true
            });
        }
        for (const detailValue of majorDetailValues) {
            fillable.push({
                element: opener,
                fieldKey: detailValue.key,
                label: detailValue.label,
                value: detailValue.value,
                waitForControlBeforeFill: true,
                relatedValues: majorRelatedValues
            });
        }
    }
}

function addDeferredCertificateItems(documentRef, values, fillable) {
    addDeferredCertificateGroupItems(documentRef, values, fillable, {
        group: 'languageTests',
        primaryField: 'testName',
        openLabel: '\uACF5\uC778\uC678\uAD6D\uC5B4\uC2DC\uD5D8 \uC785\uB825\uCE78 \uC5F4\uAE30'
    });
    addDeferredCertificateGroupItems(documentRef, values, fillable, {
        group: 'certificates',
        primaryField: 'certificateName',
        openLabel: '\uC790\uACA9\uC99D \uC785\uB825\uCE78 \uC5F4\uAE30'
    });
}

function addDeferredCertificateGroupItems(documentRef, values, fillable, config) {
    const grouped = new Map();
    const plannedFieldKeys = new Set(fillable.map((item) => item.fieldKey));
    const pattern = new RegExp(`^certificates\\.${config.group}\\.(\\d+)\\.`);
    for (const value of values) {
        if (value.copyOnly) continue;
        const match = value.key.match(pattern);
        if (!match) continue;
        const index = match[1];
        if (!grouped.has(index)) grouped.set(index, []);
        grouped.get(index).push(value);
    }
    if (!grouped.size || !documentHasCertificateGroupSurface(documentRef, config.group)) return;

    for (const [index, groupValues] of grouped) {
        const primaryKey = `certificates.${config.group}.${index}.${config.primaryField}`;
        const primaryPlanned = plannedFieldKeys.has(primaryKey);
        const allDetailValuesPlanned = groupValues
            .filter((value) => value.key !== primaryKey)
            .every((value) => plannedFieldKeys.has(value.key));
        if (!primaryPlanned && allDetailValuesPlanned) continue;
        const primaryValue = groupValues.find((value) => value.key === primaryKey)?.value ?? '';
        const rowExists = certificateRecordReady(documentRef, primaryKey, primaryValue);
        const primaryAutocompletePlanned = fillable.some((item) => item.fieldKey === primaryKey && item.autocompleteSearchControl);
        const primaryAlreadySelected = certificateCommittedPrimarySelectionExists(documentRef, primaryKey, primaryValue);
        const primaryPendingSelection = config.group === 'certificates' && !primaryAlreadySelected &&
            (primaryAutocompletePlanned || certificatePrimaryAutocompletePendingSelection(documentRef, primaryKey, primaryValue));
        const missingValues = groupValues.filter((value) => {
            if (plannedFieldKeys.has(value.key)) return false;
            if (value.key !== primaryKey && primaryPendingSelection) return false;
            return !(value.key === primaryKey && rowExists);
        });
        if (!missingValues.length) continue;

        const opener = rowExists ? documentRef.body : findCertificateSectionOpenControl(documentRef, config.group);
        if (!opener) continue;

        const openKey = `certificates.${config.group}.${index}.open`;
        if (!rowExists && !plannedFieldKeys.has(openKey)) {
            fillable.push({
                element: opener,
                fieldKey: openKey,
                label: config.openLabel,
                value: '\uC785\uB825\uCE78 \uC5F4\uAE30',
                sectionOpenControl: true,
                relatedValues: groupValues
            });
            plannedFieldKeys.add(openKey);
        }

        for (const value of missingValues) {
            fillable.push({
                element: opener,
                fieldKey: value.key,
                label: value.label,
                value: value.value,
                waitForControlBeforeFill: true,
                relatedValues: value.key === primaryKey ? relatedValuesForAutocomplete(values, value.key) : groupValues
            });
            plannedFieldKeys.add(value.key);
        }
    }
}

function certificatePrimaryAutocompletePendingSelection(documentRef, primaryKey, primaryValue = '') {
    const target = parseCertificatePrimaryFieldKey(primaryKey);
    if (!target) return false;
    const wildcardKey = certificateFieldKey(target.group, target.field);
    const indexedPrimaryControl = getApplicationFormElements(documentRef, 'input, textarea, select, [role="combobox"], [aria-haspopup="listbox"], [aria-haspopup="true"]')
        .find((candidate) => {
            if (repeatedWildcardKeyForControl(candidate, wildcardKey) !== wildcardKey) return false;
            if (certificateRecordIndexForControl(candidate, wildcardKey, target.field) !== target.index) return false;
            return isAutocompleteSearchControlForField(candidate, primaryKey);
        });
    if (indexedPrimaryControl) {
        const entry = closestCertificateEntry(indexedPrimaryControl, wildcardKey);
        return !entry || !certificateEntryHasCommittedPrimaryValue(entry, primaryValue);
    }
    const control = findCurrentControlForFieldKey(documentRef, primaryKey, primaryValue);
    if (!control || !isAutocompleteSearchControlForField(control, primaryKey)) return false;
    const entry = closestCertificateEntry(control, wildcardKey);
    return !entry || !certificateEntryHasCommittedPrimaryValue(entry, primaryValue);
}

function findCertificateSectionOpenControl(documentRef, group) {
    return findCertificateAddControl(documentRef, group) ?? findCertificateNavigationOpenControl(documentRef, group);
}

function findCertificateAddControl(documentRef, group, target = null) {
    const fastControl = findCertificateAddControlFast(documentRef, group, target);
    if (fastControl) return fastControl;
    const controls = getApplicationFormElements(documentRef, 'button[type="button"], button:not([type]), [role="button"], [tabindex]:not(input):not(textarea):not(select)');
    return controls.find((control) => {
        const buttonText = normalize(choiceCandidateText(control));
        if (!buttonText || (!buttonText.includes(normalize('\uCD94\uAC00')) && !buttonText.includes('add'))) return false;
        if (isAttachmentUploadAddControl(control)) return false;
        return certificateAddControlHasGroupContext(control, group);
    }) ?? null;
}

function findCertificateAddControlFast(documentRef, group, target = null) {
    if (!documentRef || !group) return null;
    const section = closestCertificateSectionForGroup(documentRef, group) ?? documentRef;
    const controls = Array.from(section.querySelectorAll('button[type="button"], button:not([type]), [role="button"]'))
        .filter((control) => !isHiddenElement(control) && !isEffectivelyDisabled(control) && !isAutomationControl(control));
    const slots = certificatePrimarySlotsFast(documentRef, group);
    const lastSlotEntry = slots.length ? slots[slots.length - 1].entry : null;
    const targetNeedsAdd = target?.index == null || slots.length <= target.index;
    const candidates = controls.map((control) => {
        const text = normalize(choiceElementText(control));
        if (!text || (!text.includes(normalize('\uCD94\uAC00')) && !text.includes('add'))) return null;
        if (isAttachmentUploadAddControl(control)) return null;
        const localContext = normalize([
            text,
            ancestorPreviousSiblingText(control)
        ].filter(Boolean).join(' '));
        const localGroup = certificateGroupFromSpecificContext(localContext);
        if (localGroup && localGroup !== group) return null;
        if (!certificateAddControlHasGroupContext(control, group)) return null;
        let score = 1;
        if (localGroup === group) score += 20;
        if (targetNeedsAdd && lastSlotEntry && elementComesAfter(control, lastSlotEntry)) score += 30;
        if (certificateAddControlLooksNearGroup(control, group)) score += 10;
        return { control, score };
    }).filter(Boolean);
    candidates.sort((left, right) => right.score - left.score);
    return candidates[0]?.control ?? null;
}

function certificateAddControlHasGroupContext(control, group) {
    const localContext = normalize([
        choiceCandidateText(control),
        choiceElementText(control),
        ancestorPreviousSiblingText(control),
        nearbyText(control),
        precedingHeadingText(control)
    ].filter(Boolean).join(' '));
    const localGroup = certificateGroupFromSpecificContext(localContext) ?? certificateGroupFromContext(localContext);
    if (localGroup) return localGroup === group;
    const sectionGroup = certificateGroupFromContext(normalize([
        certificateSectionContextText(control),
        closestSectionText(control)
    ].filter(Boolean).join(' ')));
    return sectionGroup === group;
}

function isAttachmentUploadAddControl(control) {
    const text = normalize([
        choiceCandidateText(control),
        choiceElementText(control),
        control?.getAttribute?.('aria-label'),
        control?.getAttribute?.('title')
    ].filter(Boolean).join(' '));
    if (!text) return false;
    return text.includes(normalize('\uCCA8\uBD80\uD30C\uC77C')) ||
        text.includes(normalize('\uD30C\uC77C\uCCA8\uBD80')) ||
        text.includes(normalize('\uC99D\uBE59\uC790\uB8CC\uCCA8\uBD80')) ||
        text.includes('fileupload') ||
        text.includes('uploadfile') ||
        text.includes('attachment');
}

function elementComesAfter(element, reference) {
    if (!element || !reference || element === reference) return false;
    const position = reference.compareDocumentPosition?.(element) ?? 0;
    return Boolean(position & Node.DOCUMENT_POSITION_FOLLOWING);
}

function certificateAddControlLooksNearGroup(control, group) {
    const context = normalize([
        ancestorPreviousSiblingText(control),
        nearbyText(control),
        precedingHeadingText(control)
    ].filter(Boolean).join(' '));
    const localGroup = certificateGroupFromContext(context);
    return !localGroup || localGroup === group;
}

function findCertificateNavigationOpenControl(documentRef, group) {
    const controls = getApplicationFormElements(documentRef, 'button[type="button"], button:not([type]), [role="button"], [tabindex]:not(input):not(textarea):not(select)');
    return controls.find((control) => isCertificateNavigationControl(control, group)) ?? null;
}

function isCertificateNavigationControl(control, group) {
    if (!control || isIconOnlyActionButton(control)) return false;
    const text = normalize(choiceCandidateText(control) || choiceElementText(control));
    if (!text) return false;
    if (text.includes(normalize('\uc5b4\ud559/\uc790\uaca9/\uae30\ud0c0'))) return false;
    if (group === 'certificates') {
        return text === normalize('\uc790\uaca9\uc99d') || text.includes(normalize('\uc790\uaca9\uc99d'));
    }
    if (group === 'languageTests') {
        return text === normalize('\uc5b4\ud559') || text === normalize('\uc5b4\ud559\ub2a5\ub825') || text.includes(normalize('\uacf5\uc778\uc678\uad6d\uc5b4\uc2dc\ud5d8'));
    }
    return false;
}

function certificateRecordReady(documentRef, primaryKey, primaryValue = '') {
    if (!documentRef || !primaryKey) return false;
    if (findCurrentControlForFieldKey(documentRef, primaryKey, primaryValue)) return true;
    return certificatePrimarySelectionExists(documentRef, primaryKey, primaryValue);
}

function certificatePrimaryAlreadySelected(documentRef, fieldKey, value = '') {
    return isCertificatePrimaryFieldKey(String(fieldKey ?? '')) &&
        certificatePrimarySelectionExists(documentRef, fieldKey, value);
}

function certificatePrimarySelectionExists(documentRef, primaryKey, primaryValue = '') {
    const value = normalize(primaryValue);
    if (!documentRef || !value || !isCertificatePrimaryFieldKey(primaryKey)) return false;
    const group = primaryKey.match(/^certificates\.(languageTests|certificates)\./)?.[1];
    if (certificateEntryForSelectedPrimary(documentRef, group, primaryValue)) return true;
    const candidates = getApplicationFormElements(documentRef, 'button[type="button"], button:not([type]), [role="button"], [aria-selected], [data-value], [data-option], [tabindex]:not(input):not(textarea):not(select)');
    return candidates.some((candidate) => {
        if (candidate.closest?.('#dropdown-body, [role="listbox"]')) return false;
        const text = normalize(stripRemovableChipSuffix(choiceElementText(candidate)));
        if (!text || text !== value) return false;
        const context = normalize([
            certificateSectionContextText(candidate),
            closestSectionText(candidate),
            ancestorPreviousSiblingText(candidate)
        ].filter(Boolean).join(' '));
        const contextGroup = certificateGroupFromContext(context) ?? certificateGroupFromSpecificContext(context);
        return !contextGroup || contextGroup === group;
    });
}

function certificateCommittedPrimarySelectionExists(documentRef, primaryKey, primaryValue = '') {
    const value = normalize(primaryValue);
    if (!documentRef || !value || !isCertificatePrimaryFieldKey(primaryKey)) return false;
    const group = primaryKey.match(/^certificates\.(languageTests|certificates)\./)?.[1];
    const entry = certificateEntryForSelectedPrimary(documentRef, group, primaryValue);
    if (entry && certificateEntryHasCommittedPrimaryValue(entry, primaryValue)) return true;
    const candidates = getApplicationFormElements(documentRef, 'button[type="button"], button:not([type]), [role="button"], [aria-selected], [data-value], [data-option], [tabindex]:not(input):not(textarea):not(select)');
    return candidates.some((candidate) => {
        if (candidate.closest?.('#dropdown-body, [role="listbox"]')) return false;
        const text = normalize(stripRemovableChipSuffix(choiceElementText(candidate)));
        if (!text || text !== value) return false;
        const context = normalize([
            certificateSectionContextText(candidate),
            closestSectionText(candidate),
            ancestorPreviousSiblingText(candidate)
        ].filter(Boolean).join(' '));
        const contextGroup = certificateGroupFromContext(context) ?? certificateGroupFromSpecificContext(context);
        return !contextGroup || contextGroup === group;
    });
}

function certificateEntryHasCommittedPrimaryValue(entry, primaryValue = '') {
    const normalizedExpected = normalize(primaryValue);
    if (!entry || !normalizedExpected) return false;
    const exactChip = cleanText(entry.querySelector?.('.remix-css-zezw7x')?.textContent);
    if (exactChip && certificatePrimaryValuesMatch(primaryValue, stripRemovableChipSuffix(exactChip))) return true;
    return Array.from(entry.querySelectorAll?.('button[type="button"], button:not([type]), [role="button"], [aria-selected], [data-value], [data-option], [tabindex]:not(input):not(textarea):not(select)') ?? [])
        .some((candidate) => {
            const text = cleanText(choiceCandidateText(candidate) || choiceElementText(candidate));
            return text && certificatePrimaryValuesMatch(primaryValue, stripRemovableChipSuffix(text));
        });
}

function educationMajorValueOrder(fieldKey) {
    const match = String(fieldKey ?? '').match(/^education\.(?:universities|graduateSchools)\.(\d+)\.majors\.(\d+)\./);
    if (!match) return Number.MAX_SAFE_INTEGER;
    return (Number(match[1]) * 1000) + Number(match[2]);
}

function isNestedEducationMajorValueKey(fieldKey) {
    return /^education\.(?:universities|graduateSchools)\.\d+\.majors\.\d+\./.test(String(fieldKey ?? ''));
}

function educationMajorDetailBase(fieldKey) {
    const match = String(fieldKey ?? '').match(/^(education\.(?:universities|graduateSchools)\.\d+\.majors\.\d+)\.([^.]+)$/) ??
        String(fieldKey ?? '').match(/^(education\.(?:universities|graduateSchools)\.\d+)\.([^.]+)$/);
    if (!match || !EDUCATION_MAJOR_DETAIL_FIELDS.has(match[2])) return null;
    return match[1];
}

function findEducationMajorOpenControl(documentRef, fieldKey) {
    const controls = getApplicationFormElements(documentRef, 'button[type="button"], button:not([type]), [role="button"]');
    return controls.find((control) => {
        const context = collectChoiceText(control, choiceElementText(control));
        const signature = normalize([
            context.normalized,
            ancestorPreviousSiblingText(control),
            choiceElementText(control),
            educationSectionContextText(control)
        ].filter(Boolean).join(' '));
        return isEducationMajorAddControl(control, fieldKey, signature);
    }) ?? null;
}

function isEducationMajorAddControl(control, fieldKey, signature) {
    if (isIconOnlyActionButton(control)) return false;
    const ownText = normalize(choiceCandidateText(control) || choiceElementText(control));
    if (!signature.includes(normalize('\ucd94\uac00')) && !ownText.includes(normalize('\ucd94\uac00'))) return false;
    if (!ownText.includes(normalize('\ucd94\uac00'))) return false;
    if (ownText.includes(normalize('\uace0\ub4f1\ud559\uad50')) ||
        ownText.includes(normalize('\ub300\ud559\uad50')) ||
        ownText.includes(normalize('\ub300\ud559\uc6d0')) ||
        ownText.includes(normalize('\ud559\uad50'))) {
        return false;
    }
    if (isNestedEducationMajorValueKey(fieldKey) &&
        signature.includes(normalize('\uc804\uacf5')) &&
        !signature.includes(normalize('\uace0\ub4f1\ud559\uad50'))) {
        return true;
    }
    if (!educationFieldKeyMatchesContext(fieldKey, signature)) return false;
    if (signature.includes(normalize('\uc804\uacf5'))) return true;
    const section = closestEducationSection(control) ?? control.ownerDocument;
    const sectionContext = normalize([educationSectionContextText(control), section?.textContent].filter(Boolean).join(' '));
    return educationFieldKeyMatchesContext(fieldKey, sectionContext) &&
        (sectionContext.includes(normalize('\uc804\uacf5')) || educationMajorEntries(section).length > 0);
}

function educationFieldKeyMatchesContext(fieldKey, context) {
    if (fieldKey.startsWith('education.highSchool.')) return context.includes(normalize('\uace0\ub4f1\ud559\uad50')) || context.includes('highschool');
    if (fieldKey.startsWith('education.universities.')) return context.includes(normalize('\ub300\ud559\uad50')) || context.includes(normalize('\ub300\ud559')) || context.includes('university');
    if (fieldKey.startsWith('education.graduateSchools.')) return context.includes(normalize('\ub300\ud559\uc6d0')) || context.includes('graduate');
    return true;
}

function collectControlText(control) {
    const fallbackTexts = [
        control.getAttribute('aria-label'),
        control.getAttribute('placeholder'),
        control.getAttribute('name'),
        control.id
    ].filter(Boolean);
    const fallbackSignature = normalize(fallbackTexts.join(' '));
    const ancestorRowLabel = (directFieldKeyFromText(fallbackTexts.join(' ')) || directCertificateFieldKeyForControl(control, fallbackSignature))
        ? ''
        : ancestorPreviousSiblingText(control);
    const visibleTexts = [
        labelText(control),
        tableHeaderText(control),
        nearbyText(control),
        ancestorRowLabel,
        previousSiblingText(control),
        educationSectionContextText(control)
    ].filter(Boolean);
    const texts = [...visibleTexts, ...fallbackTexts];
    return { displayLabel: cleanText(texts[0]) || '', normalized: normalize(texts.join(' ')) };
}

function collectChoiceText(control, optionText) {
    const fieldText = previousChoiceContextText(control, optionText) || nearbyText(control, optionText) || ancestorPreviousSiblingText(control);
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

function collectVisibleProfileFieldOrders(documentRef, orderMap = buildApplicationFormElementOrderMap(documentRef)) {
    const orders = new Map();
    const controls = getApplicationFormElements(documentRef, 'input, textarea, select');
    for (const control of controls) {
        const context = collectControlText(control);
        const key = directFieldKeyForControl(control, context) || directFieldKeyFromText(context.displayLabel);
        if (key && !key.includes('*') && !shouldSkipSectionScopedFieldForCurrentPage(documentRef, key)) {
            rememberVisibleFieldOrder(orders, key, control, orderMap);
        }
    }

    const choiceControls = Array.from(new Set(getApplicationFormElements(documentRef, 'input[type="radio"], input[type="checkbox"], button[type="button"], button:not([type]), [role="button"], [role="radio"], [role="checkbox"], [role="switch"], [aria-pressed], [aria-selected], [data-value], [data-option]')))
        .filter(isChoiceButtonCandidate);
    for (const control of choiceControls) {
        const optionText = choiceCandidateText(control);
        const context = collectChoiceText(control, optionText);
        const key = directFieldKeyForControl(control, context) || directFieldKeyFromText(context.displayLabel);
        if (key && !key.includes('*') && !shouldSkipSectionScopedFieldForCurrentPage(documentRef, key)) {
            rememberVisibleFieldOrder(orders, key, control, orderMap);
        }
    }

    const customSelectControls = Array.from(new Set(getApplicationFormElements(documentRef, '[role="combobox"], [aria-haspopup="listbox"], [aria-haspopup="true"], button[type="button"], button:not([type]), [tabindex]:not(input):not(textarea):not(select)')))
        .filter((control) => militaryDependentSelectKeyFromText(choiceElementText(control)) || isCustomSelectLikeControl(control));
    for (const control of customSelectControls) {
        const context = collectCustomSelectText(control);
        const key = militaryDependentSelectKeyFromText(choiceElementText(control)) || directFieldKeyForControl(control, context) || directFieldKeyFromText(choiceElementText(control)) || directFieldKeyFromText(context.displayLabel);
        if (key && !key.includes('*') && !shouldSkipSectionScopedFieldForCurrentPage(documentRef, key)) {
            rememberVisibleFieldOrder(orders, key, control, orderMap);
        }
    }
    if (isActivitySectionVisible(documentRef)) orders.set(ACTIVITY_COPY_CANDIDATE_MARKER, 100000);
    return orders;
}

function collectSatisfiedProfileFieldKeys(documentRef, values) {
    const valueByKey = new Map(values.filter((value) => value?.key).map((value) => [value.key, value]));
    const satisfied = new Set();
    const controls = getApplicationFormElements(documentRef, 'input, textarea, select');
    for (const control of controls) {
        const context = collectControlText(control);
        const key = directFieldKeyForControl(control, context) || directFieldKeyFromText(context.displayLabel);
        rememberSatisfiedProfileField(satisfied, key, controlCurrentComparableValue(control), valueByKey);
    }

    return satisfied;
}

function rememberSatisfiedProfileField(satisfied, key, currentValue, valueByKey) {
    if (!key || key.includes('*') || !valueByKey.has(key)) return;
    const current = cleanText(currentValue);
    const expected = cleanText(valueByKey.get(key)?.value);
    if (!current || !expected) return;
    if (normalize(current) === normalize(expected)) satisfied.add(key);
}

function controlCurrentComparableValue(control) {
    if (!control) return '';
    const tagName = control.tagName?.toLowerCase?.();
    if (tagName === 'select') {
        const selected = control.selectedOptions?.[0] ?? control.options?.[control.selectedIndex];
        return selected ? (selected.textContent || selected.value || '') : control.value;
    }
    return control.value || control.getAttribute?.('value') || '';
}

function rememberVisibleFieldOrder(orders, key, control, orderMap) {
    const order = orderMap.get(control);
    if (!Number.isFinite(order)) return;
    const currentOrder = orders.get(key);
    if (!Number.isFinite(currentOrder) || order < currentOrder) orders.set(key, order);
}

function applicationControlDisplayOrder(control) {
    if (!control?.ownerDocument) return undefined;
    const orderMap = buildApplicationFormElementOrderMap(control.ownerDocument);
    const order = orderMap.get(control);
    return Number.isFinite(order) ? order : undefined;
}

function visibleCopyCandidateKeys(visibleFieldKeys, excludedFieldKeys) {
    const remaining = new Set();
    for (const key of visibleFieldKeys) {
        if (!excludedFieldKeys.has(key) || PERSISTENT_COPY_CANDIDATE_KEYS.has(key)) remaining.add(key);
    }
    return remaining;
}

function scopedCopyCandidateFieldKeys(visibleFieldKeys, fillable) {
    const keys = new Set(visibleFieldKeys);
    for (const item of fillable) {
        if (!item?.fieldKey || item.sectionOpenControl || item.fieldKey.endsWith('.open')) continue;
        keys.add(item.fieldKey);
    }
    return keys;
}

function labelText(control) {
    const labels = Array.from(control.labels ?? []);
    return labels.map((label) => labelTextWithoutControl(label)).join(' ');
}

function labelTextWithoutControl(label) {
    const cache = applicationFormTextCacheForElement(label);
    if (cache?.labelWithoutControl.has(label)) return cache.labelWithoutControl.get(label);
    const text = boundedTextWithoutControls(label);
    cache?.labelWithoutControl.set(label, text);
    return text;
}

function tableHeaderText(control) {
    const cell = control.closest('td, th');
    const previous = cell?.previousElementSibling;
    return previous?.matches('th, td') ? elementOwnText(previous) : '';
}

function previousSiblingText(control) {
    let current = control.previousElementSibling;
    const values = [];
    while (current && values.length < 2) {
        values.push(elementOwnText(current));
        current = current.previousElementSibling;
    }
    return values.join(' ');
}

function ancestorPreviousSiblingText(control) {
    let current = control.parentElement;
    let depth = 0;
    while (current && current !== control.ownerDocument.body && depth < 8) {
        const siblingText = elementOwnText(current.previousElementSibling);
        if (siblingText && siblingText.length <= 60 && !isChoiceText(siblingText)) return siblingText;
        current = current.parentElement;
        depth += 1;
    }
    return '';
}

function elementOwnText(element) {
    if (!element) return '';
    const cache = applicationFormTextCacheForElement(element);
    if (cache?.elementOwnText.has(element)) return cache.elementOwnText.get(element);
    const text = boundedTextWithoutControls(element);
    cache?.elementOwnText.set(element, text);
    return text;
}

function boundedTextWithoutControls(element, maxLength = AUTOFILL_CONTEXT_TEXT_MAX_LENGTH) {
    if (!element) return '';
    const parts = [];
    const stack = Array.from(element.childNodes ?? []).reverse();
    let visited = 0;
    while (stack.length && visited < AUTOFILL_CONTEXT_TEXT_MAX_NODES) {
        const node = stack.pop();
        visited += 1;
        if (!node) continue;
        if (node.nodeType === 3) {
            const text = cleanText(node.textContent);
            if (text) parts.push(text);
        }
        else if (node.nodeType === 1) {
            const child = node;
            if (shouldSkipContextTextElement(child)) continue;
            const childNodes = Array.from(child.childNodes ?? []);
            for (let index = childNodes.length - 1; index >= 0; index -= 1) {
                stack.push(childNodes[index]);
            }
        }
        if (parts.join(' ').length > maxLength) break;
    }
    return (cleanText(parts.join(' ')) || '').slice(0, maxLength);
}

function shouldSkipContextTextElement(element) {
    const tagName = element?.tagName?.toLowerCase?.();
    if (!tagName) return false;
    if (['input', 'textarea', 'select', 'button', 'svg', 'path', 'script', 'style'].includes(tagName)) return true;
    if (element.getAttribute?.('aria-hidden') === 'true' || element.hidden) return true;
    return false;
}

function educationSectionContextText(control) {
    const section = closestEducationSection(control);
    if (!section) return '';
    return [
        section.getAttribute('aria-label'),
        educationSectionHeadingText(section)
    ].filter(Boolean).join(' ');
}

function closestEducationSection(control) {
    let current = control.parentElement;
    while (current && current !== control.ownerDocument.body) {
        const text = normalize([
            current.getAttribute('aria-label'),
            educationSectionHeadingText(current)
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

function educationSectionHeadingText(section) {
    return section?.querySelector?.('h1, h2, h3, h4, h5, legend, .remix-css-uf1ume p')?.textContent ?? '';
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
    const midasNameKey = directMidasEducationFieldKeyFromText(signature);
    if (midasNameKey) return midasNameKey;
    const group = educationGroupFromContext([signature, sectionContext].join(' '));
    if (!group) return null;
    const majorChoiceKey = directEducationMajorChoiceFieldKey(control, group);
    if (majorChoiceKey) return majorChoiceKey;
    const optionText = normalize(choiceCandidateText(control) || choiceElementText(control));
    if ([normalize('\ubcf8\uad50'), normalize('\ubd84\uad50')].includes(optionText)) {
        return educationFieldKey(group, 'campusType');
    }
    if (signature.includes(normalize('\ud559\uad50\uc18c\uc7ac\uc9c0')) || signature.includes(normalize('\uc18c\uc7ac\uc9c0')) || signature.includes('schoollocation')) {
        return educationFieldKey(group, 'location');
    }
    if (signature === normalize('\uacc4\uc5f4') || signature.includes(normalize('\uacc4\uc5f4')) || signature.includes('schooltrack')) {
        return educationFieldKey(group, group === 'highSchool' ? 'track' : 'majorCategory');
    }
    if (signature.includes(normalize('\ub9cc\uc810\uae30\uc900')) || signature.includes('gradescale') || signature.includes('fullscore') || signature.includes('maxgrade')) {
        return educationFieldKey(group, 'gradeScale');
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
    if (signature.includes(normalize('\uc878\uc5c5\uad6c\ubd84')) || signature.includes('graduationstatus')) {
        return educationFieldKey(group, 'graduationStatus');
    }
    if (signature.includes(normalize('\ud559\uc704\uad6c\ubd84')) || signature.includes('degreetype')) {
        return educationFieldKey(group, 'degreeType');
    }
    if (signature.includes(normalize('\uc785\ud559\uad6c\ubd84')) || signature.includes('admissiontype')) {
        return educationFieldKey(group, 'admissionType');
    }
    if (signature.includes(normalize('\uc804\uacf5\uad6c\ubd84')) || signature.includes('majortype')) {
        return educationFieldKey(group, 'majorType');
    }
    if (signature.includes(normalize('\uc8fc\uac04')) || signature.includes(normalize('\uc57c\uac04')) || signature.includes('daynight')) {
        return educationFieldKey(group, 'dayNight');
    }
    if (signature.includes(normalize('\uc804\uacf5\uba85')) || signature === normalize('\uc804\uacf5') || signature.includes('majorname')) {
        return educationFieldKey(group, 'majorName');
    }
    if (signature.includes(normalize('\ubcf8\uad50\ubd84\uad50')) || signature.includes(normalize('\ubcf8\uad50/\ubd84\uad50')) || signature.includes('campustype')) {
        return educationFieldKey(group, 'campusType');
    }
    if (signature.includes(normalize('\ud559\uad50\uc815\ubcf4')) || signature.includes(normalize('\ud559\uad50\uba85')) || signature.includes('schoolname')) {
        return educationFieldKey(group, 'schoolName');
    }
    return null;
}

function directEducationMajorChoiceFieldKey(control, group) {
    if (!closestEducationMajorEntry(control)) return null;
    const optionText = normalize(choiceCandidateText(control) || choiceElementText(control));
    if (!optionText) return null;
    if ([normalize('\uc8fc\uac04'), normalize('\uc57c\uac04')].includes(optionText)) {
        return educationFieldKey(group, 'dayNight');
    }
    if ([
        normalize('\uc8fc\uc804\uacf5'),
        normalize('\ubcf5\uc218\uc804\uacf5'),
        normalize('\ubd80\uc804\uacf5'),
        normalize('\uc5f0\uacc4\uc804\uacf5'),
        normalize('\uc735\ud569\uc804\uacf5')
    ].includes(optionText)) {
        return educationFieldKey(group, 'majorType');
    }
    return null;
}

function directMidasEducationFieldKeyFromText(text) {
    const normalized = normalize(text);
    const field = midasEducationFieldFromText(normalized);
    if (!field) return null;
    if (normalized.includes('highschoolgroupanswers') || normalized.includes('highschool')) {
        return `education.highSchool.${field}`;
    }
    const collegeMatch = normalized.match(/collegegroupanswers(\d+)/);
    if (collegeMatch) return `education.universities.${collegeMatch[1]}.${field}`;
    if (normalized.includes('collegegroupanswers') || normalized.includes('university')) {
        return `education.universities.*.${field}`;
    }
    const graduateMatch = normalized.match(/graduateschoolgroupanswers(\d+)/);
    if (graduateMatch) return `education.graduateSchools.${graduateMatch[1]}.${field}`;
    if (normalized.includes('graduateschoolgroupanswers') || normalized.includes('graduate')) {
        return `education.graduateSchools.*.${field}`;
    }
    return null;
}

function midasEducationFieldFromText(normalized) {
    if (normalized.includes('schoolname')) return 'schoolName';
    if (normalized.includes('admissiondate') || normalized.includes('entrancedate') || normalized.includes('startdate')) return 'admissionDate';
    if (normalized.includes('graduationdate') || normalized.includes('enddate')) return 'graduationDate';
    if (normalized.includes('graduationstatus') || normalized.includes('graduationtype')) return 'graduationStatus';
    if (normalized.includes('degreetype')) return 'degreeType';
    if (normalized.includes('admissiontype')) return 'admissionType';
    if (normalized.includes('campustype')) return 'campusType';
    if (normalized.includes('majorcategory') || normalized.includes('departmentcategory')) return 'majorCategory';
    if (normalized.includes('majortype')) return 'majorType';
    if (normalized.includes('daynight')) return 'dayNight';
    if (normalized.includes('gradescale') || normalized.includes('fullscore') || normalized.includes('maxgrade')) return 'gradeScale';
    if (normalized.includes('collegegrade') || normalized.includes('gradescore') || normalized.includes('gpa')) return 'grade';
    if (normalized.includes('majorcredits') || normalized.includes('credits')) return 'credits';
    if (normalized.includes('schoollocation') || normalized.includes('location') || normalized.includes('schoolarea')) return 'location';
    if (normalized.includes('schooltrack') || normalized.includes('track')) return 'track';
    return null;
}

function educationPeriodFieldForControl(control, section, signature) {
    const hasAdmissionText = signature.includes(normalize('\uc785\ud559\uc77c')) || signature.includes('admissiondate') || signature.includes('start');
    const hasGraduationText = signature.includes(normalize('\uc878\uc5c5\uc77c')) || signature.includes('graduationdate') || signature.includes('end');
    if (hasAdmissionText && !hasGraduationText) return 'admissionDate';
    if (hasGraduationText && !hasAdmissionText) return 'graduationDate';
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
    const scopedPeriodControls = periodControls.length ? periodControls : siblingDateControlsForPeriod(control, section);
    return scopedPeriodControls.indexOf(control) % 2 === 1 ? 'graduationDate' : 'admissionDate';
}

function siblingDateControlsForPeriod(control, section) {
    const container = control.closest('label, .field, .form-group, .input-group, li, div') ?? section ?? control.ownerDocument;
    return Array.from(container.querySelectorAll('input, textarea, select')).filter((candidate) => {
        if (candidate.type && ['hidden', 'button', 'submit', 'reset', 'checkbox', 'radio'].includes(candidate.type.toLowerCase())) return false;
        const signature = normalize([
            candidate.getAttribute('placeholder'),
            candidate.getAttribute('aria-label'),
            candidate.getAttribute('name'),
            candidate.id
        ].filter(Boolean).join(' '));
        return signature.includes('yyyy') || signature.includes('date') || signature.includes(normalize('\uc77c'));
    });
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
    const nearbyContext = normalize([
        closestSectionText(control),
        precedingHeadingText(control),
        ancestorPreviousSiblingText(control)
    ].filter(Boolean).join(' '));
    return certificateGroupFromContext(nearbyContext) ? nearbyContext : '';
}

function certificateGroupFromContext(context) {
    if (context.includes(normalize('\uacf5\uc778\uc678\uad6d\uc5b4\uc2dc\ud5d8')) || context.includes(normalize('\uc5b4\ud559')) || context.includes(normalize('\uc678\uad6d\uc5b4')) || context.includes('language')) {
        return 'languageTests';
    }
    if (context.includes(normalize('\uc790\uaca9/\uc9c0\uc2dd/\uae30\uc220')) ||
        context.includes(normalize('\uc790\uaca9\uc99d')) ||
        context.includes(normalize('\uba74\ud5c8')) ||
        context.includes('certificate') ||
        context.includes('license')) {
        return 'certificates';
    }
    return null;
}

function certificateGroupFromSpecificContext(context) {
    const normalized = normalize(context);
    if (normalized.includes(normalize('\uc790\uaca9\uc99d')) ||
        normalized.includes(normalize('\uc790\uaca9\uba85')) ||
        normalized.includes(normalize('\uba74\ud5c8')) ||
        normalized.includes('certificate') ||
        normalized.includes('license')) {
        return 'certificates';
    }
    if (normalized.includes(normalize('\uacf5\uc778\uc678\uad6d\uc5b4\uc2dc\ud5d8')) ||
        normalized.includes(normalize('\uc2dc\ud5d8\uba85')) ||
        normalized.includes(normalize('\uc2dc\ud5d8\uc744\uac80\uc0c9')) ||
        normalized.includes(normalize('\uc5b4\ud559')) ||
        normalized.includes(normalize('\uc678\uad6d\uc5b4')) ||
        normalized.includes('testname') ||
        normalized.includes('examname') ||
        normalized.includes('language')) {
        return 'languageTests';
    }
    return null;
}

function directCertificateFieldKeyForControl(control, signature) {
    const specificGroup = certificateGroupFromSpecificContext(signature);
    if (!specificGroup && !hasCertificateFieldHint(signature)) return null;
    const context = normalize([signature, certificateSectionContextText(control)].join(' '));
    const group = specificGroup ?? certificateGroupFromContext(context);
    if (!group) return null;
    const ownSignature = normalize([
        control?.getAttribute?.('name'),
        control?.id,
        control?.getAttribute?.('placeholder'),
        control?.getAttribute?.('aria-label'),
        labelText(control),
        choiceElementText(control)
    ].filter(Boolean).join(' '));
    if (group === 'certificates' && (ownSignature.includes(normalize('\uc790\uaca9\uc99d\uba85')) || ownSignature.includes(normalize('\uc790\uaca9\uba85')) || ownSignature.includes('certificatename') || ownSignature.includes('licensename'))) {
        return certificateFieldKey(group, 'certificateName');
    }
    if (group === 'certificates' && isTextInputLikeControl(control) && ownSignature.includes(normalize('\uc790\uaca9\uc99d'))) {
        return certificateFieldKey(group, 'certificateName');
    }
    if (group === 'languageTests' && (ownSignature.includes(normalize('\uc2dc\ud5d8\uba85')) || ownSignature.includes(normalize('\uc2dc\ud5d8\uc744\uac80\uc0c9')) || ownSignature.includes('testname') || ownSignature.includes('examname'))) {
        return certificateFieldKey(group, 'testName');
    }
    if (signature.includes(normalize('\uc810\uc218')) || signature.includes(normalize('\ub4f1\uae09')) || signature.includes('score') || signature.includes('level')) {
        return group === 'languageTests' ? certificateFieldKey(group, 'score') : null;
    }
    if (signature.includes(normalize('\ucde8\ub4dd\uc77c')) ||
        signature.includes(normalize('\uc2dc\ud5d8\uc77c')) ||
        signature.includes(normalize('\uc751\uc2dc\uc77c')) ||
        signature.includes('acquireddate') ||
        signature.includes('issuedate') ||
        signature.includes('testdate') ||
        signature.includes('examdate')) {
        return certificateFieldKey(group, 'acquiredDate');
    }
    if (signature.includes(normalize('\ub4f1\ub85d\ubc88\ud638')) ||
        signature.includes(normalize('\uc790\uaca9\ubc88\ud638')) ||
        signature.includes('registrationnumber') ||
        signature.includes('registnumber') ||
        signature.includes('registno') ||
        signature.includes('certificatenumber')) {
        return certificateFieldKey(group, 'registrationNumber');
    }
    if (signature.includes(normalize('\ubc1c\uae09\uae30\uad00')) ||
        signature.includes(normalize('\uc2dc\ud589\uae30\uad00')) ||
        signature.includes('issuer') ||
        signature.includes('organization')) {
        return group === 'certificates' ? certificateFieldKey(group, 'issuer') : null;
    }
    if (group === 'certificates' && (signature.includes(normalize('\uc790\uaca9\uc99d\uba85')) || signature.includes(normalize('\uc790\uaca9\uba85')) || signature.includes('certificatename') || signature.includes('licensename'))) {
        return certificateFieldKey(group, 'certificateName');
    }
    if (signature.includes(normalize('\uc2dc\ud5d8\uba85')) || signature.includes(normalize('\uc2dc\ud5d8\uc744\uac80\uc0c9')) || signature.includes('testname') || signature.includes('examname')) {
        return certificateFieldKey(group, group === 'languageTests' ? 'testName' : 'certificateName');
    }
    return null;
}

function isTextInputLikeControl(control) {
    const tagName = control?.tagName?.toLowerCase();
    return tagName === 'input' || tagName === 'textarea' || isAutocompleteSearchControl(control);
}

function hasCertificateFieldHint(signature) {
    return signature.includes(normalize('\uc810\uc218')) ||
        signature.includes(normalize('\ub4f1\uae09')) ||
        signature.includes(normalize('\ucde8\ub4dd\uc77c')) ||
        signature.includes(normalize('\uc2dc\ud5d8\uc77c')) ||
        signature.includes(normalize('\uc751\uc2dc\uc77c')) ||
        signature.includes(normalize('\ub4f1\ub85d\ubc88\ud638')) ||
        signature.includes(normalize('\uc790\uaca9\ubc88\ud638')) ||
        signature.includes(normalize('\ubc1c\uae09\uae30\uad00')) ||
        signature.includes(normalize('\uc2dc\ud589\uae30\uad00')) ||
        signature.includes('score') ||
        signature.includes('level') ||
        signature.includes('acquireddate') ||
        signature.includes('issuedate') ||
        signature.includes('testdate') ||
        signature.includes('examdate') ||
        signature.includes('registrationnumber') ||
        signature.includes('certificatenumber') ||
        signature.includes('issuer');
}

function certificateFieldKey(group, field) {
    return `certificates.${group}.*.${field}`;
}

function isAutocompletePrimaryFieldKey(fieldKey) {
    return isCertificatePrimaryFieldKey(fieldKey) ||
        /^education\.(?:highSchool|universities\.(?:\d+|\*)|graduateSchools\.(?:\d+|\*))\.schoolName$/.test(fieldKey) ||
        /^education\.(?:universities\.(?:\d+|\*)|graduateSchools\.(?:\d+|\*))(?:\.majors\.\d+)?\.majorName$/.test(fieldKey);
}

function isCertificatePrimaryFieldKey(fieldKey) {
    return /^certificates\.(?:certificates|languageTests)\.(?:\d+|\*)\.(?:certificateName|testName)$/.test(fieldKey);
}

function relatedValuesForAutocomplete(values, fieldKey) {
    const certificateMatch = fieldKey.match(/^(certificates\.(?:certificates|languageTests)\.\d+)\.(?:certificateName|testName)$/);
    if (certificateMatch) {
        const prefix = `${certificateMatch[1]}.`;
        return values.filter((value) => value.key.startsWith(prefix));
    }
    const schoolMatch = fieldKey.match(/^(education\.(?:highSchool|universities\.\d+|graduateSchools\.\d+))\.schoolName$/);
    if (schoolMatch) {
        const prefix = `${schoolMatch[1]}.`;
        return values.filter((value) => value.key.startsWith(prefix) && value.key !== fieldKey);
    }
    const majorMatch = fieldKey.match(/^(education\.(?:universities\.\d+|graduateSchools\.\d+)(?:\.majors\.\d+)?)\.majorName$/);
    if (!majorMatch) return [];
    const prefix = `${majorMatch[1]}.`;
    return values.filter((value) => value.key.startsWith(prefix) && value.key !== fieldKey);
}

function relatedValuesExceptField(relatedValues, fieldKey) {
    return (relatedValues ?? []).filter((value) => value?.key !== fieldKey);
}

function relatedValuesForEducationMajorField(values, fieldKey) {
    const base = educationMajorDetailBase(fieldKey);
    if (!base) return [];
    return values.filter((value) => educationMajorDetailBase(value.key) === base);
}

function educationMajorControlTargetsDifferentMajorName(control, values, fieldKey) {
    if (!isNestedEducationMajorValueKey(fieldKey)) return false;
    const entry = closestEducationMajorEntry(control);
    if (!entry) return false;
    const selectedName = selectedEducationMajorNameTextFromEntry(entry);
    if (!selectedName) return false;
    const expectedName = expectedEducationMajorNameForFieldKey(fieldKey, relatedValuesForEducationMajorField(values, fieldKey));
    if (!expectedName) return false;
    const normalizedSelected = normalize(selectedName);
    const normalizedExpected = normalize(expectedName);
    return normalizedSelected !== normalizedExpected &&
        !normalizedSelected.includes(normalizedExpected) &&
        !normalizedExpected.includes(normalizedSelected);
}

function educationMajorControlHasTopLevelEducationMatch(control, fieldKey) {
    if (!/^education\.(?:universities|graduateSchools)\.\d+\.(?:majorCategory|majorType|dayNight)$/.test(String(fieldKey ?? ''))) {
        return false;
    }
    if (closestEducationMajorEntry(control)) return true;
    const context = normalize([
        choiceElementText(control),
        collectCustomSelectText(control).displayLabel,
        collectChoiceText(control, choiceCandidateText(control)).displayLabel,
        nearbyText(control)
    ].filter(Boolean).join(' '));
    return context.includes(normalize('\uc804\uacf5\uacc4\uc5f4')) ||
        context.includes(normalize('\uc804\uacf5\uad6c\ubd84')) ||
        context.includes(normalize('\uc8fc\uac04')) ||
        context.includes(normalize('\uc57c\uac04'));
}

function indexedRepeatedFieldKeyForControl(control, wildcardKey) {
    if (!control) return null;
    const match = wildcardKey.match(/^(education\.(?:universities|graduateSchools)|certificates\.(?:certificates|languageTests)|activities|career\.careers)\.\*\.(.+)$/);
    if (!match) return null;
    if (match[1].startsWith('certificates.')) {
        return `${match[1]}.${certificateRecordIndexForControl(control, wildcardKey, match[2])}.${match[2]}`;
    }
    const root = closestRepeatedFieldSection(control, wildcardKey) ?? control.ownerDocument;
    const controls = Array.from(root.querySelectorAll('input, textarea, select'))
        .filter((candidate) => !isHiddenElement(candidate))
        .filter((candidate) => repeatedWildcardKeyForControl(candidate, wildcardKey) === wildcardKey);
    const index = controls.indexOf(control);
    if (index < 0) return null;
    if (match[1] === 'activities') {
        return `activities.${activityRecordIndexForControl(control)}.${match[2]}`;
    }
    return `${match[1]}.${index}.${match[2]}`;
}

function closestRepeatedFieldSection(control, wildcardKey) {
    if (wildcardKey.startsWith('certificates.')) return closestCertificateSection(control);
    if (wildcardKey.startsWith('education.')) return closestEducationSection(control);
    if (wildcardKey.startsWith('activities.')) return closestActivitySection(control);
    if (wildcardKey.startsWith('career.')) return closestCareerSection(control);
    return null;
}

function closestCertificateSection(control) {
    let current = control?.matches?.('section, fieldset, [role="region"], article') ? control : control?.parentElement;
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

function closestActivitySection(control) {
    let current = control?.parentElement;
    while (current && current !== control.ownerDocument.body) {
        const hasActivityAnswers = Boolean(current.querySelector?.('[name^="activityAnswers."]'));
        const heading = current.querySelector?.('h1, h2, h3, h4, h5, legend')?.textContent;
        const normalized = normalize([
            current.getAttribute('aria-label'),
            heading
        ].filter(Boolean).join(' '));
        if (hasActivityAnswers || containsAny(normalized, [
            normalize('\ud559\ub0b4\uc678\ud65c\ub3d9'),
            normalize('\ub300\uc678\ud65c\ub3d9')
        ])) return current;
        current = current.parentElement;
    }
    return null;
}

function isActivityControlLike(candidate) {
    const name = String(candidate?.getAttribute?.('name') ?? '');
    if (/^activityAnswers\.\d+\./.test(name)) return true;
    const signature = normalizedDirectControlSignature(candidate);
    return containsAny(signature, [
        normalize('\ud65c\ub3d9\uad6c\ubd84'),
        normalize('\ud65c\ub3d9\uba85'),
        normalize('\uae30\uad00\ubc0f\uc870\uc9c1\uba85'),
        normalize('\uae30\uad00 \ubc0f \uc870\uc9c1\uba85'),
        normalize('\ud65c\ub3d9\uae30\uac04'),
        normalize('\uc9c1\uc704\ub610\ub294\uc5ed\ud560'),
        normalize('\uc9c1\uc704 \ub610\ub294 \uc5ed\ud560'),
        normalize('\uc0c1\uc138\ub0b4\uc6a9'),
        normalize('\uc0c1\uc138 \ub0b4\uc6a9'),
        normalize('\ud65c\ub3d9\ub0b4\uc6a9'),
        'activity'
    ]);
}

function closestActivityEntry(control) {
    let current = control?.parentElement;
    let depth = 0;
    while (current && current !== control.ownerDocument.body && depth < 10) {
        const activityControls = Array.from(current.querySelectorAll?.('input, textarea, select, button[type="button"], button:not([type]), [role="button"], [aria-haspopup]') ?? [])
            .filter(isActivityControlLike);
        const hasOrganization = activityControls.some((candidate) => normalize(candidate.getAttribute('name')).includes('organization'));
        const hasRole = activityControls.some((candidate) => normalize(candidate.getAttribute('name')).includes('role'));
        const hasContents = activityControls.some((candidate) => normalize(candidate.getAttribute('name')).includes('contents') || candidate.tagName?.toLowerCase() === 'textarea');
        if (activityControls.length >= 2 && (hasOrganization || hasRole || hasContents)) return current;
        current = current.parentElement;
        depth += 1;
    }
    return null;
}

function activityPeriodInputs(root) {
    return Array.from(root?.querySelectorAll?.('input, textarea') ?? [])
        .filter((candidate) => {
            const signature = normalizedDirectControlSignature(candidate);
            return signature.includes(normalize('\ud65c\ub3d9\uae30\uac04')) || signature.includes('activityperiod');
        });
}

function activityRecordIndexForControl(control) {
    const explicit = String(control?.getAttribute?.('name') ?? '').match(/^activityAnswers\.(\d+)\./);
    if (explicit) return Number(explicit[1]);
    const nearbyIndex = activityAnswerIndexNearControl(control);
    if (nearbyIndex != null) return nearbyIndex;
    const entry = closestActivityEntry(control);
    const section = closestActivitySection(entry?.parentElement ?? control) ?? control.ownerDocument;
    const entries = Array.from(new Set(
        Array.from(section.querySelectorAll('input, textarea, select, button[type="button"], button:not([type]), [role="button"], [aria-haspopup]'))
            .map((candidate) => closestActivityEntry(candidate))
            .filter(Boolean)
    ));
    const index = entries.indexOf(entry);
    return index >= 0 ? index : 0;
}

function activityAnswerIndexNearControl(control) {
    let current = control?.parentElement;
    let depth = 0;
    while (current && current !== control.ownerDocument.body && depth < 12) {
        const explicitControls = Array.from(current.querySelectorAll?.('[name^="activityAnswers."]') ?? []);
        const explicitIndexes = Array.from(new Set(explicitControls
            .map((candidate) => String(candidate.getAttribute('name') ?? '').match(/^activityAnswers\.(\d+)\./)?.[1])
            .filter(Boolean)
            .map(Number)));
        if (explicitIndexes.length === 1) return explicitIndexes[0];
        if (explicitIndexes.length > 1) {
            const activityControls = Array.from(current.querySelectorAll('input, textarea, select'))
                .filter(isActivityControlLike);
            const controlIndex = activityControls.indexOf(control);
            if (controlIndex >= 0) {
                for (let index = controlIndex - 1; index >= 0; index -= 1) {
                    const previous = String(activityControls[index].getAttribute('name') ?? '').match(/^activityAnswers\.(\d+)\./);
                    if (previous) return Number(previous[1]);
                }
                for (let index = controlIndex + 1; index < activityControls.length; index += 1) {
                    const next = String(activityControls[index].getAttribute('name') ?? '').match(/^activityAnswers\.(\d+)\./);
                    if (next) return Number(next[1]);
                }
            }
        }
        current = current.parentElement;
        depth += 1;
    }
    return null;
}

function repeatedWildcardKeyForControl(control, wildcardKey) {
    const signature = normalizedDirectControlSignature(control);
    if (wildcardKey.startsWith('certificates.')) return directCertificateFieldKeyForControl(control, signature);
    if (wildcardKey.startsWith('education.')) return directEducationFieldKeyForControl(control, signature);
    if (wildcardKey.startsWith('activities.')) {
        const key = directActivityFieldKeyForControl(control, signature);
        return key?.replace(/^activities\.\d+\./, 'activities.*.') ?? null;
    }
    if (wildcardKey.startsWith('career.')) {
        const key = directCareerFieldKeyForControl(control, signature);
        return key?.replace(/^career\.careers\.\d+\./, 'career.careers.*.') ?? null;
    }
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
        const text = elementOwnText(current);
        if (text && text.length <= 50 && !isChoiceOnlyText(text, optionText) && !isChoiceText(text)) {
            return text;
        }
        current = current.previousElementSibling;
    }
    return '';
}

function nearbyText(control, optionText = '') {
    const text = nearbyRawText(control);
    return text && text.length <= 80 && !isChoiceOnlyText(text, optionText) ? text : '';
}

function nearbyRawText(control) {
    const cache = applicationFormTextCacheForElement(control);
    if (cache?.nearbyRawText.has(control)) return cache.nearbyRawText.get(control);
    const parent = control.closest('label, .field, .form-group, .input-group, li, div, p, section');
    const text = parent ? boundedTextWithoutControls(parent, 120) : '';
    cache?.nearbyRawText.set(control, text);
    return text;
}

function directFieldKeyForControl(control, context) {
    const nameKey = directFieldKeyFromControlName(control);
    if (nameKey) return nameKey;
    const signature = normalize([
        control.getAttribute('name'),
        control.id,
        control.getAttribute('placeholder'),
        control.getAttribute('aria-label'),
        context.displayLabel,
        choiceElementText(control)
    ].filter(Boolean).join(' '));
    const activityKey = directActivityFieldKeyForControl(control, signature);
    if (activityKey) return activityKey;
    const educationKey = directEducationFieldKeyForControl(control, signature);
    if (educationKey) return educationKey;
    const careerKey = directCareerFieldKeyForControl(control, signature);
    if (careerKey) return careerKey;
    const certificateKey = directCertificateFieldKeyForControl(control, signature);
    if (certificateKey) return certificateKey;
    return directFieldKeyFromText(signature);
}

function directFieldKeyFromControlName(control) {
    const name = cleanText(control?.getAttribute?.('name'));
    return ATS_CONTROL_NAME_FIELD_KEYS.get(name) ?? null;
}

function directCareerFieldKeyForControl(control, signature) {
    const explicit = careerFieldKeyFromName(control?.getAttribute?.('name'));
    if (explicit) return explicit;
    const section = closestCareerSection(control);
    const sectionContext = normalize(careerSectionContextText(control));
    const context = normalize([signature, sectionContext].join(' '));
    if (!section && !context.includes(normalize('\uacbd\ub825')) && !context.includes('career')) return null;
    const ownSignature = normalize([
        control.getAttribute?.('placeholder'),
        control.getAttribute?.('name'),
        control.id,
        control.getAttribute?.('aria-label')
    ].filter(Boolean).join(' '));
    if (ownSignature.includes(normalize('\uc785\uc0ac\uc77c')) || ownSignature.includes('startdate')) return 'career.careers.*.startDate';
    if (ownSignature.includes(normalize('\ud1f4\uc0ac\uc77c')) || ownSignature.includes('enddate')) return 'career.careers.*.endDate';
    const optionText = normalize(choiceCandidateText(control) || choiceElementText(control));
    if ([normalize('\uc7ac\uc9c1\uc911'), normalize('\ud1f4\uc0ac')].includes(optionText)) return 'career.careers.*.isEmployed';
    if (context.includes(normalize('\ud68c\uc0ac\uba85')) || context.includes('companyname')) return 'career.careers.*.companyName';
    if (context.includes(normalize('\uace0\uc6a9\ud615\ud0dc')) || context.includes('employmenttype')) return 'career.careers.*.employmentType';
    if (context.includes(normalize('\ubd80\uc11c\uba85')) || context.includes(normalize('\ubd80\uc11c')) || context.includes('department')) return 'career.careers.*.department';
    if (context.includes(normalize('\uc9c1\uae09')) || context.includes(normalize('\uc9c1\ucc45')) || context.includes('position')) return 'career.careers.*.position';
    if (context.includes(normalize('\uc9c1\ubb34\uba85')) || context.includes(normalize('\ub2f4\ub2f9\uc9c1\ubb34')) || context.includes('rolename') || context.includes('jobtitle')) return 'career.careers.*.roleName';
    if (context.includes(normalize('\uadfc\ubb34\uae30\uac04')) || context.includes(normalize('\uc785\uc0ac\uc77c')) || context.includes(normalize('\ud1f4\uc0ac\uc77c'))) {
        return `career.careers.*.${careerPeriodFieldForControl(control, section, context)}`;
    }
    if (context.includes(normalize('\ud1f4\uc9c1\uc0ac\uc720')) || context.includes(normalize('\ud1f4\uc0ac\uc0ac\uc720')) || context.includes('resignationreason') || context.includes('retirementreason')) return 'career.careers.*.resignationReason';
    if (context.includes(normalize('\ub2f4\ub2f9\uc5c5\ubb34')) || context.includes(normalize('\uc8fc\uc694\uc5c5\ubb34')) || context.includes('duties') || context.includes('comment') || context.includes('description')) return 'career.careers.*.duties';
    if (context.includes(normalize('\uc8fc\uc694\uc131\uacfc')) || context.includes(normalize('\uc131\uacfc')) || context.includes('achievements')) return 'career.careers.*.achievements';
    return null;
}

function careerFieldKeyFromName(name) {
    const match = String(name ?? '').match(/^careerGroupAnswers\.(\d+)\.(retirementReason|comment)$/);
    if (!match) return null;
    const fieldMap = {
        retirementReason: 'resignationReason',
        comment: 'duties'
    };
    return `career.careers.${match[1]}.${fieldMap[match[2]]}`;
}

function careerSectionContextText(control) {
    const section = closestCareerSection(control);
    if (!section) return '';
    return [
        section.getAttribute('aria-label'),
        careerSectionHeadingText(section)
    ].filter(Boolean).join(' ');
}

function closestCareerSection(control) {
    let current = control?.parentElement;
    while (current && current !== control.ownerDocument.body) {
        const text = normalize([
            current.getAttribute('aria-label'),
            careerSectionHeadingText(current)
        ].filter(Boolean).join(' '));
        if (text.includes(normalize('\uc9c1\uc7a5\uacbd\ub825')) ||
            text.includes(normalize('\uacbd\ub825\uc0ac\ud56d')) ||
            text.includes(normalize('\uacbd\ub825')) ||
            text.includes('career')) {
            return current;
        }
        current = current.parentElement;
    }
    return null;
}

function careerSectionHeadingText(section) {
    return section?.querySelector?.('h1, h2, h3, h4, h5, legend, .remix-css-uf1ume p')?.textContent ?? '';
}

function careerPeriodFieldForControl(control, section, signature) {
    const ownSignature = normalize([
        control.getAttribute?.('placeholder'),
        control.getAttribute?.('name'),
        control.id,
        control.getAttribute?.('aria-label')
    ].filter(Boolean).join(' '));
    if (ownSignature.includes(normalize('\uc785\uc0ac\uc77c')) || ownSignature.includes('startdate')) return 'startDate';
    if (ownSignature.includes(normalize('\ud1f4\uc0ac\uc77c')) || ownSignature.includes('enddate')) return 'endDate';
    const hasStartText = signature.includes(normalize('\uc785\uc0ac\uc77c')) || signature.includes('startdate');
    const hasEndText = signature.includes(normalize('\ud1f4\uc0ac\uc77c')) || signature.includes('enddate');
    if (hasStartText && !hasEndText) return 'startDate';
    if (hasEndText && !hasStartText) return 'endDate';
    const controls = siblingDateControlsForPeriod(control, section);
    return controls.indexOf(control) % 2 === 1 ? 'endDate' : 'startDate';
}

function directActivityFieldKeyForControl(control, signature) {
    const explicit = activityFieldKeyFromName(control?.getAttribute?.('name'));
    if (explicit) return explicit;
    if (!isInActivitySection(control, signature)) return null;
    const periodKey = activityPeriodFieldKeyForControl(control);
    if (periodKey) return periodKey;
    if (signature.includes(normalize('\ud65c\ub3d9\uad6c\ubd84')) || signature.includes('activitytype')) return 'activities.*.activityType';
    if (signature.includes(normalize('\ud65c\ub3d9\uba85')) || signature.includes('activityname')) return 'activities.*.activityName';
    if (signature.includes(normalize('\uae30\uad00\ubc0f\uc870\uc9c1\uba85')) ||
        signature.includes(normalize('\uae30\uad00 \ubc0f \uc870\uc9c1\uba85')) ||
        signature.includes('organization')) return 'activities.*.organization';
    if (signature.includes(normalize('\uc9c1\uc704\ub610\ub294\uc5ed\ud560')) ||
        signature.includes(normalize('\uc9c1\uc704 \ub610\ub294 \uc5ed\ud560')) ||
        signature.includes(normalize('\uc5ed\ud560')) ||
        signature.includes('role')) return 'activities.*.role';
    if (signature.includes(normalize('\uc0c1\uc138\ub0b4\uc6a9')) ||
        signature.includes(normalize('\uc0c1\uc138 \ub0b4\uc6a9')) ||
        signature.includes(normalize('\ud65c\ub3d9\ub0b4\uc6a9')) ||
        signature.includes('contents') ||
        signature.includes('description')) return 'activities.*.description';
    return null;
}

function activityFieldKeyFromName(name) {
    const match = String(name ?? '').match(/^activityAnswers\.(\d+)\.(organization|role|contents|activityType|activityName)$/);
    if (!match) return null;
    const fieldMap = {
        organization: 'organization',
        role: 'role',
        contents: 'description',
        activityType: 'activityType',
        activityName: 'activityName'
    };
    return `activities.${match[1]}.${fieldMap[match[2]]}`;
}

function isInActivitySection(control, signature = '') {
    const normalized = normalize([signature, closestSectionText(control), nearbyText(control), ancestorPreviousSiblingText(control)].join(' '));
    return containsAny(normalized, [
        normalize('\ud559\ub0b4\uc678\ud65c\ub3d9'),
        normalize('\ub300\uc678\ud65c\ub3d9'),
        normalize('\ud65c\ub3d9\uad6c\ubd84'),
        normalize('\ud65c\ub3d9\uae30\uac04'),
        'activity'
    ]);
}

function isActivitySectionVisible(documentRef) {
    const candidates = getApplicationFormElements(documentRef, 'section, fieldset, article, div, button[type="button"], button:not([type]), [role="button"]');
    return candidates.some((element) => {
        const text = normalize([
            element.getAttribute?.('aria-label'),
            element.querySelector?.('h1, h2, h3, h4, h5, legend')?.textContent,
            choiceElementText(element),
            cleanText(element.textContent)
        ].filter(Boolean).join(' '));
        return containsAny(text, [
            normalize('\ud559\ub0b4\uc678\ud65c\ub3d9'),
            normalize('\ub300\ub0b4\uc678\ud65c\ub3d9'),
            normalize('\ub300\uc678\ud65c\ub3d9'),
            'activity'
        ]);
    });
}

function activityPeriodFieldKeyForControl(control) {
    const signature = normalizedDirectControlSignature(control);
    if (!signature.includes(normalize('\ud65c\ub3d9\uae30\uac04')) && !signature.includes('activityperiod')) return null;
    const row = closestActivityEntry(control);
    const periodInputs = activityPeriodInputs(row ?? control.ownerDocument);
    const periodIndex = periodInputs.indexOf(control);
    if (periodIndex < 0) return null;
    return periodIndex % 2 === 0 ? 'activities.*.startDate' : 'activities.*.endDate';
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
    if (has('\uc804\uacf5\uad6c\ubd84', 'majortype')) return 'education.*.majorType';
    if (has('\uc8fc\uac04', '\uc57c\uac04', '\uc8fc\uac04/\uc57c\uac04', 'daynight')) return 'education.*.dayNight';
    if (has('\ud559\uad50\uc18c\uc7ac\uc9c0', '\uc18c\uc7ac\uc9c0', 'schoollocation')) return 'education.*.location';
    if (has('\ud559\uad50\uc815\ubcf4', '\ud559\uad50\uba85', 'schoolname')) return 'education.*.schoolName';
    if (has('\ub9cc\uc810\uae30\uc900', 'gradescale', 'fullscore', 'maxgrade')) return 'education.*.gradeScale';
    if (has('\ud559\uc5c5\uc131\uc801', '\uc131\uc801\ud3c9\uc810', '\ud3c9\uc810', 'gpa', 'grade')) return 'education.*.grade';
    if (has('\uc774\uc218\ud559\uc810', '\ucde8\ub4dd\ud559\uc810', 'credits', 'credit')) return 'education.*.credits';
    if (has('\ubcf8\uad50\ubd84\uad50', '\ubcf8\uad50/\ubd84\uad50', 'campustype')) return 'education.*.campusType';
    if (normalized === normalize('\uacc4\uc5f4') || has('schooltrack')) return 'education.*.track';
    if (normalized === normalize('\uc804\uacf5') || has('\uc804\uacf5\uba85', 'majorname')) return 'education.*.majorName';
    if (containsAny(normalized, ['영문이름', '영문 이름', 'englishname', 'nameen'])) return 'basicInfo.nameEn';
    if (containsAny(normalized, ['상세주소', 'detailaddress', 'addressdetail'])) return 'basicInfo.addressDetail';
    if (containsAny(normalized, ['이메일', 'emailaddress', 'email', 'mail'])) return 'basicInfo.email';
    if (containsAny(normalized, ['휴대폰', '휴대전화', '전화번호', '핸드폰', 'phone', 'tel', 'mobile'])) return 'basicInfo.phone';
    if (containsAny(normalized, ['생년월일', 'birth', 'birthday', 'birthdate'])) return 'basicInfo.birthdate';
    if (containsAny(normalized, ['성별', 'gender', 'sex'])) return 'basicInfo.gender';
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
    const fillValues = values.filter((value) => !value.copyOnly);
    const exact = fillValues.find((value) => value.key === key);
    if (exact) return exact;
    const groupWildcard = key.match(/^education\.(universities|graduateSchools)\.\*\.(.+)$/);
    if (groupWildcard) {
        const nestedEducationKey = indexedEducationNestedFieldKeyForControl(control, `education.${groupWildcard[1]}`, groupWildcard[2]);
        if (nestedEducationKey) {
            const nested = fillValues.find((value) => value.key === nestedEducationKey);
            if (nested) return nested;
        }
        const indexedKey = indexedRepeatedFieldKeyForControl(control, key);
        if (indexedKey) {
            const indexed = fillValues.find((value) => value.key === indexedKey);
            if (indexed) return indexed;
        }
        return fillValues.find((value) => {
            if (groupWildcard[2] === 'majorCategory') {
                return educationValueMatchesGroupField(value, groupWildcard[1], groupWildcard[2]);
            }
            return value.key.startsWith(`education.${groupWildcard[1]}.`) && value.key.endsWith(`.${groupWildcard[2]}`);
        }) ?? null;
    }
    const certificateWildcard = key.match(/^certificates\.(certificates|languageTests)\.\*\.(.+)$/);
    if (certificateWildcard) {
        if (isCertificatePrimaryWildcardField(certificateWildcard[1], certificateWildcard[2])) {
            if (control && !isAutocompleteSearchControl(control)) {
                const indexedKey = indexedRepeatedFieldKeyForControl(control, key);
                if (indexedKey) {
                    const indexed = fillValues.find((value) => value.key === indexedKey);
                    if (indexed) return indexed;
                }
            }
            const selectedMatch = certificateSelectedPrimaryMatchForControl(fillValues, control, certificateWildcard[1], certificateWildcard[2]);
            if (selectedMatch) return selectedMatch;
            const unselectedMatch = certificateUnselectedPrimaryMatch(fillValues, control?.ownerDocument, certificateWildcard[1], certificateWildcard[2]);
            if (unselectedMatch) return unselectedMatch;
        }
        else {
            const selectedDetailMatch = certificateSelectedDetailMatchForControl(fillValues, control, certificateWildcard[1], certificateWildcard[2]);
            if (selectedDetailMatch) return selectedDetailMatch;
            if (certificateControlHasUnmatchedSelectedPrimary(fillValues, control, certificateWildcard[1], certificateWildcard[2])) return null;
            const indexedKey = indexedRepeatedFieldKeyForControl(control, key);
            if (indexedKey) {
                const indexed = fillValues.find((value) => value.key === indexedKey);
                if (indexed) return indexed;
            }
        }
        const indexedKey = indexedRepeatedFieldKeyForControl(control, key);
        if (indexedKey) {
            const indexed = fillValues.find((value) => value.key === indexedKey);
            if (indexed) return indexed;
        }
        return fillValues.find((value) => value.key.startsWith(`certificates.${certificateWildcard[1]}.`) && value.key.endsWith(`.${certificateWildcard[2]}`)) ?? null;
    }
    const activityWildcard = key.match(/^activities\.\*\.(.+)$/);
    if (activityWildcard) {
        const indexedKey = indexedRepeatedFieldKeyForControl(control, key);
        if (indexedKey) {
            const indexed = fillValues.find((value) => value.key === indexedKey);
            if (indexed) return indexed;
        }
        return fillValues.find((value) => value.key.startsWith('activities.') && value.key.endsWith(`.${activityWildcard[1]}`)) ?? null;
    }
    const activityIndexed = key.match(/^activities\.(\d+)\.(.+)$/);
    if (activityIndexed) {
        return fillValues.find((value) => value.key === key) ??
            fillValues.find((value) => value.key.startsWith('activities.') && value.key.endsWith(`.${activityIndexed[2]}`)) ??
            null;
    }
    const careerWildcard = key.match(/^career\.careers\.\*\.(.+)$/);
    if (careerWildcard) {
        const indexedKey = indexedRepeatedFieldKeyForControl(control, key);
        if (indexedKey) {
            const indexed = fillValues.find((value) => value.key === indexedKey);
            if (indexed) return indexed;
        }
        return fillValues.find((value) => value.key.startsWith('career.careers.') && value.key.endsWith(`.${careerWildcard[1]}`)) ?? null;
    }
    const wildcard = key.match(/^education\.\*\.(.+)$/);
    if (wildcard) {
        const indexedKey = indexedEducationWildcardFieldKeyForControl(control, wildcard[1], context.normalized ?? '');
        if (indexedKey) {
            const indexed = fillValues.find((value) => value.key === indexedKey);
            if (indexed) return indexed;
        }
        return findEducationValueMatch(fillValues, wildcard[1], context.normalized ?? '');
    }
    return null;
}

function indexedEducationMatchForControl(values, match, control, context = '') {
    if (!match?.key || !control || match.copyOnly) return null;
    const fieldMatch = match.key.match(/\.([^.]+)$/);
    if (!fieldMatch) return null;
    const indexedKey = indexedEducationWildcardFieldKeyForControl(control, fieldMatch[1], context);
    return indexedKey ? values.find((value) => value.key === indexedKey && !value.copyOnly) ?? null : null;
}

function indexedEducationNestedFieldKeyForControl(control, groupPrefix, field) {
    if (!control || !groupPrefix?.startsWith('education.') || !EDUCATION_MAJOR_DETAIL_FIELDS.has(field)) return null;
    const groupMatch = groupPrefix.match(/^education\.(universities|graduateSchools)$/);
    if (!groupMatch) return null;
    const majorEntry = closestEducationMajorEntry(control);
    if (!majorEntry) return null;
    const section = closestEducationSection(control) ?? control.ownerDocument;
    const majorEntries = Array.from(new Set(
        getApplicationFormElements(section, 'input, textarea, select, button[type="button"], button:not([type]), [role="button"], [aria-haspopup], [data-value], [data-option]')
            .map((candidate) => closestEducationMajorEntry(candidate))
            .filter(Boolean)
    ));
    const majorIndex = majorEntries.indexOf(majorEntry);
    if (majorIndex < 0) return null;
    return `education.${groupMatch[1]}.0.majors.${majorIndex}.${field}`;
}

function educationValueMatchesGroupField(value, group, field) {
    const key = String(value?.key ?? '');
    return new RegExp(`^education\\.${group}\\.\\d+\\.${field}$`).test(key);
}

function indexedEducationWildcardFieldKeyForControl(control, field, context = '') {
    if (!control || !EDUCATION_MAJOR_DETAIL_FIELDS.has(field)) return null;
    const group = educationGroupFromContext(normalize([context, educationSectionContextText(control)].filter(Boolean).join(' ')));
    if (!['universities', 'graduateSchools'].includes(group)) return null;
    const majorEntry = closestEducationMajorEntry(control);
    if (!majorEntry) return null;
    const section = closestEducationSection(control) ?? control.ownerDocument;
    const majorEntries = Array.from(new Set(
        getApplicationFormElements(section, 'input, textarea, select, button[type="button"], button:not([type]), [role="button"], [aria-haspopup], [data-value], [data-option]')
            .map((candidate) => closestEducationMajorEntry(candidate))
            .filter(Boolean)
    ));
    const majorIndex = majorEntries.indexOf(majorEntry);
    if (majorIndex < 0) return null;
    return `education.${group}.0.majors.${majorIndex}.${field}`;
}

function findEducationValueMatch(values, field, context) {
    const groups = preferredEducationGroups(context);
    for (const group of groups) {
        const match = values.find((value) => {
            if (group === 'highSchool') return value.key === `education.highSchool.${field}`;
            if (field === 'majorCategory') return educationValueMatchesGroupField(value, group, field);
            return value.key.startsWith(`education.${group}.`) && value.key.endsWith(`.${field}`);
        });
        if (match) return match;
    }
    return values.find((value) => {
        if (value.key === `education.highSchool.${field}`) return true;
        if (field !== 'majorCategory') {
            return value.key.startsWith('education.') && value.key.endsWith(`.${field}`);
        }
        return educationValueMatchesGroupField(value, 'universities', field) ||
            educationValueMatchesGroupField(value, 'graduateSchools', field);
    }) ?? null;
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
        if (value.copyOnly) continue;
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
        if (value.copyOnly) continue;
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

function choiceValueMatchesOption(value, optionText, usedFieldKeys) {
    if (!value || value.copyOnly || usedFieldKeys.has(value.key) || value.key === 'military.servicePeriod') return false;
    const normalizedOption = normalize(optionText);
    return optionTermsForValue(value).map(normalize).includes(normalizedOption);
}

function setControlValue(control, value, item = {}) {
    if (!control) return { success: false, reason: 'control_not_ready' };
    if (isEffectivelyDisabled(control) && item.requiresEnabledBeforeFill) return { success: false, reason: 'control_not_ready' };
    let displayValue = value;
    if (item.fileUploadControl) {
        const result = setFileInputValue(control, item.fileValue ?? value);
        if (!result.success) return result;
        displayValue = result.value;
    }
    else if (item.sectionOpenControl) {
        const majorNameKey = educationMajorNameKeyFromOpenFieldKey(item.fieldKey);
        if (majorNameKey && isEffectivelyDisabled(control)) return { success: false, reason: 'control_not_ready' };
        if (majorNameKey && educationMajorEntryExistsForFieldKey(control.ownerDocument, majorNameKey, expectedEducationMajorNameForFieldKey(majorNameKey, item.relatedValues))) {
            return { success: true, value: value || '\uC785\uB825\uCE78 \uC5F4\uAE30' };
        }
        if (majorNameKey && wasEducationMajorOpenControlUsed(control, majorNameKey)) {
            return { success: true, value: value || '\uC785\uB825\uCE78 \uC5F4\uAE30' };
        }
        if (majorNameKey) markEducationMajorOpenControlUsed(control, majorNameKey);
        if (majorNameKey) activateSectionOpenButton(control);
        else activateElement(control);
    }
    else if (item.customSelectControl) {
        const result = setCustomSelectValue(control, value, item);
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

async function setControlValueAsync(control, value, item = {}, deadlineAt = Number.POSITIVE_INFINITY) {
    if (!control) return { success: false, reason: 'control_not_ready' };
    if (isEffectivelyDisabled(control) && item.requiresEnabledBeforeFill) return { success: false, reason: 'control_not_ready' };
    const fillValue = item.waitForControlBeforeFill ? formatValueForControl(control, value, item.fieldKey) : value;
    let displayValue = value;
    if (item.sectionOpenControl) {
        return await setSectionOpenControlValueAsync(control, fillValue, item, deadlineAt);
    }
    if (item.autocompleteSearchControl ||
        (isAutocompletePrimaryFieldKey(item.fieldKey) && isAutocompleteSearchControl(control)) ||
        shouldForceAutocompleteSearchControl(control, item.fieldKey)) {
        const result = await setAutocompleteSearchValueAsync(control, fillValue, item, deadlineAt);
        if (!result.success) return result;
        displayValue = result.value;
        return { success: true, value: displayValue, extraFilled: result.extraFilled };
    }
    if (item.customSelectControl ||
        isDeferredLanguageScoreSelectControl(control, item) ||
        (item.waitForControlBeforeFill && isCustomSelectLikeControl(control))) {
        if (isChoiceButtonCandidate(control) && choiceControlMatchesValue(control, fillValue)) {
            const result = setControlValue(control, fillValue, { ...item, customSelectControl: false, choiceControl: true });
            if (!result.success) return result;
            displayValue = result.value;
        }
        else {
            const result = await setCustomSelectValueAsync(control, fillValue, item, deadlineAt);
            if (!result.success) return result;
            displayValue = result.value;
        }
    }
    else {
        const result = setControlValue(control, fillValue, item);
        if (!result.success) return result;
        displayValue = result.value;
    }
    if (MILITARY_DEPENDENT_DATE_KEYS.has(item.fieldKey)) {
        await sleep(AUTOFILL_DEPENDENT_FIELD_SETTLE_MS);
    }
    return { success: true, value: displayValue };
}

async function setSectionOpenControlValueAsync(control, value, item = {}, deadlineAt = Number.POSITIVE_INFINITY) {
    const majorNameKey = educationMajorNameKeyFromOpenFieldKey(item.fieldKey);
    const documentRef = control?.ownerDocument;
    if (!documentRef) return { success: false, reason: 'control_not_ready' };
    const certificateTarget = certificateOpenTargetFromFieldKey(item.fieldKey);
    if (certificateTarget) {
        const opened = await openCertificateEntryAsync(documentRef, certificateTarget, item, deadlineAt);
        return opened
            ? { success: true, value: value || '\uC785\uB825\uCE78 \uC5F4\uAE30' }
            : { success: false, reason: 'control_not_ready' };
    }
    if (!majorNameKey) return setControlValue(control, value, item);
    const opened = await openEducationMajorEntryAsync(documentRef, majorNameKey, item, deadlineAt);
    if (opened) {
        return { success: true, value: value || '\uC785\uB825\uCE78 \uC5F4\uAE30' };
    }
    return { success: false, reason: 'control_not_ready' };
}

async function openCertificateEntryAsync(documentRef, target, item = {}, deadlineAt = Number.POSITIVE_INFINITY) {
    if (!documentRef || !target) return false;
    const primaryValue = certificatePrimaryValueForOpenTarget(target, item);
    if (certificateOpenTargetReady(documentRef, target, primaryValue)) return true;

    for (let attempt = 0; attempt < 3; attempt += 1) {
        if (!hasAutoFillTimeRemaining(deadlineAt)) return false;
        const addControl = findCertificateAddControl(documentRef, target.group, target);
        if (addControl && !isEffectivelyDisabled(addControl)) {
            const previousCount = certificatePrimaryControlCount(documentRef, target.group);
            closeOpenCustomSelectMenus(documentRef);
            activateElement(addControl);
            const opened = await waitForValue(() => {
                if (certificateOpenTargetReady(documentRef, target, primaryValue)) return true;
                return certificatePrimaryControlCount(documentRef, target.group) > previousCount &&
                    certificatePrimaryControlCount(documentRef, target.group) > target.index;
            }, false, boundedAutoFillWaitMs(AUTOFILL_ASYNC_WAIT_TIMEOUT_MS, deadlineAt));
            if (opened) return true;
        }

        const navControl = findCertificateNavigationOpenControl(documentRef, target.group);
        if (navControl && !isEffectivelyDisabled(navControl)) {
            closeOpenCustomSelectMenus(documentRef);
            activateElement(navControl);
            const navOpened = await waitForValue(() => (
                certificateOpenTargetReady(documentRef, target, primaryValue) ||
                Boolean(findCertificateAddControl(documentRef, target.group))
            ), false, boundedAutoFillWaitMs(AUTOFILL_ASYNC_WAIT_TIMEOUT_MS, deadlineAt));
            if (navOpened) continue;
        }

        await sleep(boundedAutoFillWaitMs(AUTOFILL_DEPENDENT_FIELD_SETTLE_MS, deadlineAt));
    }
    return certificateOpenTargetReady(documentRef, target, primaryValue);
}

function certificateOpenTargetReady(documentRef, target, primaryValue = '') {
    if (!documentRef || !target) return false;
    if (certificatePrimarySlotCountFast(documentRef, target.group) > target.index) return true;
    if (certificatePrimarySelectionExists(documentRef, target.primaryKey, primaryValue)) return true;
    return certificatePrimaryControlCount(documentRef, target.group) > target.index;
}

function certificateOpenTargetFromFieldKey(fieldKey) {
    const match = String(fieldKey ?? '').match(/^certificates\.(languageTests|certificates)\.(\d+)\.open$/);
    if (!match) return null;
    const group = match[1];
    const index = Number(match[2]);
    const primaryField = group === 'languageTests' ? 'testName' : 'certificateName';
    return {
        group,
        index,
        primaryField,
        primaryKey: `certificates.${group}.${index}.${primaryField}`
    };
}

function certificatePrimaryValueForOpenTarget(target, item = {}) {
    return cleanText((item.relatedValues ?? []).find((value) => value.key === target.primaryKey)?.value) ?? '';
}

function certificatePrimaryControlCount(documentRef, group) {
    const fastCount = certificatePrimarySlotCountFast(documentRef, group);
    if (fastCount > 0) return fastCount;
    const primaryField = group === 'languageTests' ? 'testName' : 'certificateName';
    const wildcardKey = certificateFieldKey(group, primaryField);
    const primaryControls = Array.from(new Set([
        ...getApplicationFormElements(documentRef, 'input, textarea, select').filter(isFillableControl),
        ...getApplicationFormElements(documentRef, '[role="combobox"], [aria-haspopup="listbox"], [aria-haspopup="true"], button[type="button"], button:not([type]), [tabindex]:not(input):not(textarea):not(select)').filter(isCustomSelectLikeControl),
        ...getApplicationFormElements(documentRef, 'button[type="button"], button:not([type]), [role="button"], [aria-selected], [data-value], [data-option]').filter(isChoiceButtonCandidate)
    ])).filter((control) => repeatedWildcardKeyForControl(control, wildcardKey) === wildcardKey);
    const section = closestCertificateSectionForGroup(documentRef, group) ?? documentRef;
    const entryCandidates = [
        ...Array.from(section.querySelectorAll('input, textarea, select, button[type="button"], button:not([type]), [role="button"], [aria-haspopup]'))
            .map((candidate) => closestCertificateEntry(candidate, wildcardKey)),
        ...Array.from(section.querySelectorAll('.remix-css-zezw7x'))
            .map((candidate) => closestCertificateEntry(candidate, wildcardKey) ?? candidate.parentElement)
    ];
    const entryCount = Array.from(new Set(
        entryCandidates
            .filter(Boolean)
            .filter((entry) => entry !== section)
    )).filter((entry) => {
        if (selectedCertificatePrimaryTextFromEntry(entry)) return true;
        return Array.from(entry.querySelectorAll('input, textarea, select, button[type="button"], button:not([type]), [role="button"], [aria-haspopup]'))
            .some((candidate) => repeatedWildcardKeyForControl(candidate, wildcardKey) === wildcardKey);
    }).length;
    return Math.max(primaryControls.length, entryCount);
}

function certificatePrimarySlotCountFast(documentRef, group) {
    return certificatePrimarySlotsFast(documentRef, group).length;
}

function certificatePrimarySlotsFast(documentRef, group) {
    if (!documentRef || !group) return [];
    const section = closestCertificateSectionForGroup(documentRef, group) ?? documentRef;
    const primaryField = group === 'languageTests' ? 'testName' : 'certificateName';
    const wildcardKey = certificateFieldKey(group, primaryField);
    const candidates = Array.from(section.querySelectorAll(
        '.remix-css-zezw7x, input, textarea, select, [role="combobox"], [aria-haspopup="listbox"], [aria-haspopup="true"], button[type="button"], button:not([type])'
    )).filter((element) => !isHiddenElement(element) && !element.closest?.('#dropdown-body, [role="listbox"]'));
    const slots = [];
    const seenEntries = new Set();
    for (const element of candidates) {
        if (!isCertificatePrimarySlotCandidateFast(element, group)) continue;
        const entry = fastCertificatePrimarySlotEntry(element);
        if (seenEntries.has(entry)) continue;
        seenEntries.add(entry);
        const tagName = element.tagName?.toLowerCase();
        const elementText = cleanText(choiceElementText(element));
        const selected = normalize(element.className).includes('zezw7x') ||
            Boolean(element.querySelector?.('svg, path') && elementText && !isPlaceholderProfileValue(elementText));
        slots.push({ element, entry, selected });
        if (tagName === 'input' || tagName === 'textarea' || tagName === 'select') continue;
    }
    return slots;
}

function fastCertificatePrimarySlotEntry(element) {
    return element?.closest?.('.certificate-row, [id^="ats-row-"], [data-testid*="license"], [data-testid*="certificate"], [class*="license"], [class*="certificate"]') ??
        element?.parentElement ??
        element;
}

function isCertificatePrimarySlotCandidateFast(element, group) {
    if (!element || isAutomationControl(element)) return false;
    const className = normalize(element.className);
    const tagName = element.tagName?.toLowerCase();
    if (className.includes('zezw7x')) return true;
    const text = normalize(choiceElementText(element));
    if (ACTION_BUTTON_TERMS.some((term) => text === term || text.includes(term))) return false;
    if ((tagName === 'button' || element.getAttribute?.('role') === 'button') &&
        !element.matches?.('[role="combobox"], [aria-haspopup="listbox"], [aria-haspopup="true"]') &&
        !element.querySelector?.('svg, path')) {
        return false;
    }
    const signature = normalize([
        element.getAttribute?.('placeholder'),
        element.getAttribute?.('aria-label'),
        element.getAttribute?.('name'),
        element.id,
        element.getAttribute?.('data-field'),
        element.getAttribute?.('data-testid')
    ].filter(Boolean).join(' '));
    if (group === 'languageTests') {
        return signature.includes('testname') ||
            signature.includes('languagetest') ||
            signature.includes(normalize('\uC2DC\uD5D8\uBA85')) ||
            signature.includes(normalize('\uC5B4\uD559'));
    }
    if (signature.includes('certificatename') ||
        signature.includes('licensename') ||
        signature.includes(normalize('\uC790\uACA9\uC99D\uBA85')) ||
        signature.includes(normalize('\uC790\uACA9\uBA85'))) {
        return true;
    }
    return ['input', 'textarea'].includes(tagName) &&
        signature.includes(normalize('\uAC80\uC0C9')) &&
        (signature.includes('certificate') || signature.includes('license') || signature.includes(normalize('\uC790\uACA9')));
}

function certificateEntryCandidatesForGroup(documentRef, group, wildcardKey) {
    const section = closestCertificateSectionForGroup(documentRef, group) ?? documentRef;
    return Array.from(new Set([
        ...Array.from(section.querySelectorAll('input, textarea, select, button[type="button"], button:not([type]), [role="button"], [aria-haspopup]'))
            .map((candidate) => closestCertificateEntry(candidate, wildcardKey)),
        ...Array.from(section.querySelectorAll('.remix-css-zezw7x'))
            .map((candidate) => closestCertificateEntry(candidate, wildcardKey) ?? candidate.parentElement)
    ]
        .filter(Boolean)
        .filter((entry) => entry !== section)));
}

async function openEducationMajorEntryAsync(documentRef, majorNameKey, item = {}, deadlineAt = Number.POSITIVE_INFINITY) {
    if (!documentRef || !majorNameKey) return false;
    const expectedMajorName = expectedEducationMajorNameForFieldKey(majorNameKey, item.relatedValues) ||
        (item.fieldKey === majorNameKey ? cleanText(item.value) : '');
    if (educationMajorEntryExistsForFieldKey(documentRef, majorNameKey, expectedMajorName)) return true;
    const target = parseNestedEducationMajorFieldKey(majorNameKey);
    for (let attempt = 0; attempt < 2; attempt += 1) {
        if (!hasAutoFillTimeRemaining(deadlineAt)) return false;
        const opener = findEducationMajorOpenControl(documentRef, majorNameKey);
        if (!opener || isEffectivelyDisabled(opener)) {
            await sleep(boundedAutoFillWaitMs(AUTOFILL_DEPENDENT_FIELD_SETTLE_MS, deadlineAt));
            continue;
        }
        const previousEntryCount = educationMajorEntries(documentRef).length;
        const previousNameInputCount = educationMajorNameInputControlCount(documentRef);
        closeOpenCustomSelectMenus(documentRef);
        await sleep(boundedAutoFillWaitMs(AUTOFILL_ASYNC_WAIT_INTERVAL_MS, deadlineAt));
        activateSectionOpenButton(opener);
        const openedAfterNativeClick = await waitForEducationMajorOpenState(
            documentRef,
            majorNameKey,
            expectedMajorName,
            target,
            previousEntryCount,
            previousNameInputCount,
            boundedAutoFillWaitMs(AUTOFILL_ASYNC_WAIT_TIMEOUT_MS, deadlineAt)
        );
        if (!openedAfterNativeClick) {
            focusAndScrollIntoView(opener);
            activateElement(opener);
        }
        const opened = await waitForValue(
            () => {
                return educationMajorOpenStateReached(documentRef, majorNameKey, expectedMajorName, target, previousEntryCount, previousNameInputCount);
            },
            null,
            boundedAutoFillWaitMs(AUTOFILL_ASYNC_WAIT_TIMEOUT_MS, deadlineAt)
        );
        if (opened) {
            markEducationMajorOpenControlUsed(opener, majorNameKey);
            return true;
        }
    }
    return false;
}

async function waitForEducationMajorOpenState(documentRef, majorNameKey, expectedMajorName, target, previousEntryCount, previousNameInputCount, timeoutMs) {
    return await waitForValue(
        () => {
            invalidateApplicationFormElementCache(documentRef);
            return educationMajorOpenStateReached(documentRef, majorNameKey, expectedMajorName, target, previousEntryCount, previousNameInputCount);
        },
        false,
        timeoutMs
    );
}

function educationMajorOpenStateReached(documentRef, majorNameKey, expectedMajorName, target, previousEntryCount, previousNameInputCount) {
    if (educationMajorEntryExistsForFieldKey(documentRef, majorNameKey, expectedMajorName)) return true;
    if (!target) return false;
    const currentEntryCount = educationMajorEntries(documentRef).length;
    if (currentEntryCount > previousEntryCount && currentEntryCount > target.majorIndex) return true;
    const currentNameInputCount = educationMajorNameInputControlCount(documentRef);
    return currentNameInputCount > previousNameInputCount && currentNameInputCount > target.majorIndex;
}

function educationMajorNameInputControlCount(documentRef) {
    if (!documentRef) return 0;
    return getApplicationFormElements(documentRef, 'input, textarea')
        .filter((control) => {
            const signature = normalize([
                control.getAttribute('placeholder'),
                control.getAttribute('aria-label'),
                control.getAttribute('name'),
                control.id,
                control.closest?.('label')?.textContent
            ].filter(Boolean).join(' '));
            return signature.includes(normalize('\uc804\uacf5\uba85')) || signature.includes('majorname');
        })
        .length;
}

function activateSectionOpenButton(element) {
    invalidateApplicationFormElementCache(element?.ownerDocument);
    focusAndScrollIntoView(element);
    if (typeof element?.click === 'function') {
        element.click();
    }
    else {
        activateElement(element);
    }
    invalidateApplicationFormElementCache(element?.ownerDocument);
}

function focusAndScrollIntoView(element) {
    try {
        element?.scrollIntoView?.({ block: 'center', inline: 'nearest' });
    }
    catch {
        element?.scrollIntoView?.();
    }
    element?.focus?.({ preventScroll: true });
}

function shouldForceAutocompleteSearchControl(control, fieldKey) {
    return isAutocompletePrimaryFieldKey(fieldKey) &&
        (isMidasAutocompleteShellInput(control) ||
            (isEducationSchoolNameField(fieldKey) && isMidasSchoolSearchInput(control)) ||
            (isCertificatePrimaryFieldKey(fieldKey) && isMidasCertificateSearchInput(control, fieldKey)));
}

function isMidasAutocompleteShellInput(control) {
    if (control?.tagName?.toLowerCase() !== 'input') return false;
    let current = control.parentElement;
    let depth = 0;
    while (current && current !== control.ownerDocument.body && depth < 5) {
        const className = String(current.className ?? '');
        if (className.includes('ats-inline-flex') && className.includes('ats-relative') && className.includes('ats-group')) return true;
        if (current.querySelector?.('#dropdown-body')) return true;
        current = current.parentElement;
        depth += 1;
    }
    return false;
}

function setCustomSelectValue(control, value, item = {}) {
    const preOpenOptions = new Set(customOptionCandidates(control.ownerDocument, control, { scopedOnly: true }));
    const exactOptionOnly = shouldUseExactCustomOption(item.fieldKey);
    activateElement(control);
    if (control.hasAttribute('aria-expanded')) control.setAttribute('aria-expanded', 'true');
    for (const candidateValue of customSelectCandidateValues(control, value, item.fieldKey)) {
        const candidates = customOptionCandidates(control.ownerDocument, control, { scopedOnly: true });
        const option = findMatchingCustomOption(control.ownerDocument, candidateValue, control, { ignoreElements: preOpenOptions, exactOptionOnly, candidates }) ??
            findMatchingCustomOption(control.ownerDocument, candidateValue, control, { exactOptionOnly, candidates });
        if (!option) continue;
        activateElement(option);
        setChoiceState(option);
        return { success: true, value: choiceElementText(option) || candidateValue };
    }
    return { success: false, reason: 'select_option_not_found' };
}

async function setCustomSelectValueFastAsync(control, value, item = {}) {
    const preOpenOptions = new Set(customOptionCandidates(control.ownerDocument, control, { scopedOnly: true }));
    const exactOptionOnly = shouldUseExactCustomOption(item.fieldKey);
    activateElement(control);
    if (control.hasAttribute('aria-expanded')) control.setAttribute('aria-expanded', 'true');
    for (const candidateValue of customSelectCandidateValues(control, value, item.fieldKey)) {
        const findScopedOption = () => {
            const candidates = customOptionCandidates(control.ownerDocument, control, { scopedOnly: true });
            return findMatchingCustomOption(control.ownerDocument, candidateValue, control, { ignoreElements: preOpenOptions, exactOptionOnly, candidates }) ??
                findMatchingCustomOption(control.ownerDocument, candidateValue, control, { exactOptionOnly, candidates });
        };
        const option = findScopedOption() ?? await waitForValue(findScopedOption, null, AUTOFILL_CUSTOM_SELECT_WAIT_TIMEOUT_MS);
        if (!option) continue;
        activateElement(option);
        setChoiceState(option);
        await settleAfterCustomOptionSelection(control);
        return { success: true, value: choiceElementText(option) || candidateValue };
    }
    return { success: false, reason: 'select_option_not_found' };
}

async function setCustomSelectValueAsync(control, value, item = {}, deadlineAt = Number.POSITIVE_INFINITY) {
    const preOpenOptions = new Set(customOptionCandidates(control.ownerDocument, control));
    const preOpenSearchInputs = new Set(customSelectSearchInputs(control.ownerDocument));
    const exactOptionOnly = shouldUseExactCustomOption(item.fieldKey);
    activateElement(control);
    if (control.hasAttribute('aria-expanded')) control.setAttribute('aria-expanded', 'true');
    for (const candidateValue of customSelectCandidateValues(control, value, item.fieldKey)) {
        if (!hasAutoFillTimeRemaining(deadlineAt)) return { success: false, reason: 'control_not_ready' };
        const immediateOption = findMatchingCustomOption(control.ownerDocument, candidateValue, control, { ignoreElements: preOpenOptions, exactOptionOnly });
        if (immediateOption) {
            activateElement(immediateOption);
            setChoiceState(immediateOption);
            await settleAfterCustomOptionSelection(control, deadlineAt);
            return { success: true, value: choiceElementText(immediateOption) || candidateValue };
        }
        await fillCustomSelectSearchInput(control, candidateValue, { ignoredInputs: preOpenSearchInputs });
        const option = await waitForValue(
            () => findMatchingCustomOption(control.ownerDocument, candidateValue, control, { ignoreElements: preOpenOptions, exactOptionOnly }),
            null,
            boundedAutoFillWaitMs(AUTOFILL_CUSTOM_SELECT_WAIT_TIMEOUT_MS, deadlineAt)
        ) ??
            findMatchingCustomOption(control.ownerDocument, candidateValue, control, { exactOptionOnly });
        if (!option) continue;
        activateElement(option);
        setChoiceState(option);
        await settleAfterCustomOptionSelection(control, deadlineAt);
        return { success: true, value: choiceElementText(option) || candidateValue };
    }
    return { success: false, reason: 'select_option_not_found' };
}

async function settleAfterCustomOptionSelection(control, deadlineAt = Number.POSITIVE_INFINITY) {
    await sleep(boundedAutoFillWaitMs(AUTOFILL_ASYNC_WAIT_INTERVAL_MS, deadlineAt));
    if (customSelectMenuIsOpen(control)) {
        closeOpenCustomSelectMenus(control.ownerDocument);
        await sleep(boundedAutoFillWaitMs(AUTOFILL_ASYNC_WAIT_INTERVAL_MS, deadlineAt));
    }
}

function customSelectMenuIsOpen(control) {
    let current = control?.parentElement;
    let depth = 0;
    while (current && current !== control.ownerDocument.body && depth < 4) {
        if (current.querySelector?.('#dropdown-body, [role="listbox"]')) return true;
        current = current.parentElement;
        depth += 1;
    }
    return false;
}

function shouldUseExactCustomOption(fieldKey) {
    return /^education\.(?:universities|graduateSchools)\.\d+\.majors\.\d+\.majorCategory$/.test(String(fieldKey ?? ''));
}

function customSelectCandidateValues(control, value, fieldKey) {
    const inferredCandidates = shouldUseExactCustomOption(fieldKey)
        ? inferredEducationMajorCategoryValues(control, value)
        : [];
    const candidates = [];
    if (shouldUseExactCustomOption(fieldKey)) {
        candidates.push(...inferredCandidates);
    }
    candidates.push(value);
    candidates.push(...languageScoreOptionValues(value, fieldKey));
    return Array.from(new Set(candidates.map(cleanText).filter(Boolean)));
}

function languageScoreOptionValues(value, fieldKey) {
    if (!/^certificates\.languageTests\.\d+\.score$/.test(String(fieldKey ?? ''))) return [];
    const normalizedValue = normalize(value).replace(/\s+/g, '');
    const opicGradeOptions = {
        al: 'Advanced Low',
        am: 'Advanced Mid',
        ah: 'Advanced High',
        ih: 'Intermediate High',
        im3: 'Intermediate Mid 3',
        im2: 'Intermediate Mid 2',
        im1: 'Intermediate Mid 1',
        im: 'Intermediate Mid',
        il: 'Intermediate Low',
        nh: 'Novice High',
        nm: 'Novice Mid',
        nl: 'Novice Low'
    };
    return opicGradeOptions[normalizedValue] ? [opicGradeOptions[normalizedValue]] : [];
}

function inferredEducationMajorCategoryValues(control, value) {
    const normalizedValue = normalize(value);
    const broadEngineeringValues = [
        '\uacf5',
        '\uacf5\ud559',
        '\uacf5\ud559\uacc4\uc5f4',
        'engineering'
    ].map(normalize);
    if (broadEngineeringValues.includes(normalizedValue)) {
        const normalizedMajorName = normalize(selectedEducationMajorNameText(control));
        if (!normalizedMajorName) return [];
        if (normalizedMajorName.includes(normalize('\uc0b0\uc5c5'))) {
            return ['\uacf5\ud559\uacc4\uc5f4(\uc0b0\uc5c5)'];
        }
        if (normalizedMajorName.includes(normalize('\ube45\ub370\uc774\ud130')) ||
            normalizedMajorName.includes(normalize('\ub370\uc774\ud130')) ||
            normalizedMajorName.includes(normalize('\ucef4\ud4e8\ud130')) ||
            normalizedMajorName.includes(normalize('\uc18c\ud504\ud2b8\uc6e8\uc5b4')) ||
            normalizedMajorName.includes(normalize('\uc815\ubcf4')) ||
            normalizedMajorName.includes(normalize('\ud1b5\uc2e0')) ||
            normalizedMajorName.includes('ai') ||
            normalizedMajorName.includes(normalize('\uc778\uacf5\uc9c0\ub2a5'))) {
            return [
                '\uacf5\ud559\uacc4\uc5f4(\ucef4\ud4e8\ud130\u00b7\ud1b5\uc2e0)',
                '\uacf5\ud559\uacc4\uc5f4(\ucef4\ud4e8\ud130\u318d\ud1b5\uc2e0)',
                '\uacf5\ud559\uacc4\uc5f4(\ucef4\ud4e8\ud130\u30fb\ud1b5\uc2e0)'
            ];
        }
        return [];
    }
    if (!['공', '공학', '공학계열', 'engineering'].map(normalize).includes(normalizedValue)) return [];
    const majorName = normalize(selectedEducationMajorNameText(control));
    if (!majorName) return [];
    if (majorName.includes(normalize('산업'))) return ['공학계열(산업)'];
    if (majorName.includes(normalize('빅데이터')) ||
        majorName.includes(normalize('데이터')) ||
        majorName.includes(normalize('컴퓨터')) ||
        majorName.includes(normalize('소프트웨어')) ||
        majorName.includes(normalize('정보')) ||
        majorName.includes(normalize('통신')) ||
        majorName.includes('ai') ||
        majorName.includes(normalize('인공지능'))) {
        return ['공학계열(컴퓨터·통신)', '공학계열(컴퓨터ㆍ통신)', '공학계열(컴퓨터.통신)'];
    }
    return [];
}

function selectedEducationMajorNameText(control) {
    const entry = closestEducationMajorEntry(control);
    if (!entry) return '';
    return selectedEducationMajorNameTextFromEntry(entry);
}

function selectedEducationMajorNameTextFromEntry(entry) {
    if (!entry) return '';
    const input = Array.from(entry.querySelectorAll('input, textarea')).find((candidate) => {
        const signature = normalize([
            candidate.getAttribute('placeholder'),
            candidate.getAttribute('aria-label'),
            candidate.getAttribute('name'),
            candidate.id,
            candidate.closest?.('label')?.textContent
        ].filter(Boolean).join(' '));
        return signature.includes(normalize('\uc804\uacf5\uba85')) || signature.includes('majorname');
    });
    const inputValue = cleanText(input?.value) || cleanText(input?.textContent);
    if (inputValue && !isPlaceholderProfileValue(inputValue)) return inputValue;
    const exactChip = cleanText(entry.querySelector?.('.remix-css-zezw7x')?.textContent);
    if (exactChip && !isPlaceholderProfileValue(exactChip)) return stripRemovableChipSuffix(exactChip);
    const chipCandidates = Array.from(entry.querySelectorAll('button, [role="button"], div, span, p'))
        .filter((candidate) => candidate !== entry && !candidate.querySelector?.('input, textarea, select'));
    for (const candidate of chipCandidates) {
        const text = cleanText(candidate.textContent);
        if (!text || text.length > 50 || isPlaceholderProfileValue(text)) continue;
        const normalized = normalize(text);
        if (!normalized ||
            isChoiceText(text) ||
            normalized.includes(normalize('\uc804\uacf5\uacc4\uc5f4')) ||
            normalized.includes(normalize('\ud559\uacfc\uacc4\uc5f4')) ||
            normalized.includes(normalize('\ucd94\uac00'))) {
            continue;
        }
        if (candidate.querySelector?.('svg') || normalize(candidate.className).includes('zezw7x')) {
            return stripRemovableChipSuffix(text);
        }
    }
    return '';
}

function isRemovableMajorNameChipElement(element) {
    if (!element) return false;
    const text = cleanText(element.textContent);
    if (!text || text.length > 50 || isPlaceholderProfileValue(text) || isChoiceText(text)) return false;
    const normalized = normalize(text);
    if (normalized.includes(normalize('\uc804\uacf5\uacc4\uc5f4')) ||
        normalized.includes(normalize('\ud559\uacfc\uacc4\uc5f4')) ||
        normalized.includes(normalize('\ucd94\uac00')) ||
        ACTION_BUTTON_TERMS.includes(normalized)) {
        return false;
    }
    return Boolean(
        normalize(element.className).includes('zezw7x') ||
        element.querySelector?.('svg, path') ||
        normalize(element.getAttribute?.('aria-label')).includes(normalize('\uc0ad\uc81c')) ||
        normalize(element.getAttribute?.('aria-label')).includes('remove')
    );
}

function isSelectedEducationMajorChipOption(element, sourceControl = null) {
    if (!isRemovableMajorNameChipElement(element)) return false;
    if (element.closest?.('#dropdown-body, [role="listbox"]')) return false;
    const entry = closestEducationMajorEntry(element);
    if (!entry) {
        const context = normalize([
            educationMajorEntrySignature(element.parentElement ?? element),
            educationSectionContextText(element),
            sourceControl ? educationMajorEntrySignature(sourceControl.parentElement ?? sourceControl) : '',
            sourceControl ? collectControlText(sourceControl).displayLabel : ''
        ].filter(Boolean).join(' '));
        return isMidasMajorSearchInput(sourceControl) ||
            context.includes(normalize('\uc804\uacf5\uba85')) ||
            context.includes(normalize('\uc804\uacf5')) ||
            context.includes('majorname');
    }
    const selectedName = selectedEducationMajorNameTextFromEntry(entry);
    if (!selectedName) return true;
    const normalizedText = normalize(stripRemovableChipSuffix(element.textContent));
    const normalizedSelected = normalize(selectedName);
    return normalizedText === normalizedSelected ||
        normalizedText.includes(normalizedSelected) ||
        normalizedSelected.includes(normalizedText);
}

function stripRemovableChipSuffix(text) {
    return cleanText(String(text ?? '').replace(/\s*[xX]\s*$/, '')) || '';
}

async function fillCustomSelectSearchInput(control, value, options = {}) {
    const searchInput = findCustomSelectSearchInput(control.ownerDocument, control, options);
    if (!searchInput) return false;
    searchInput.click();
    searchInput.focus?.();
    setNativeControlValue(searchInput, value);
    dispatchInputEvents(searchInput);
    return true;
}

function findCustomSelectSearchInput(documentRef, sourceControl, options = {}) {
    const ignoredInputs = options.ignoredInputs ?? new Set();
    return customSelectSearchInputs(documentRef)
        .find((candidate) => candidate !== sourceControl && !ignoredInputs.has(candidate) && !candidate.disabled && !candidate.readOnly && !isHiddenElement(candidate)) ?? null;
}

function customSelectSearchInputs(documentRef) {
    const roots = Array.from(documentRef.querySelectorAll('#design-system-scroll-container, [role="listbox"]'));
    const inputs = [];
    for (const root of roots) {
        inputs.push(...Array.from(root.querySelectorAll('input[type="text"], input[type="search"], input:not([type])')));
    }
    return Array.from(new Set(inputs));
}

async function setAutocompleteSearchValueAsync(control, value, item = {}, deadlineAt = Number.POSITIVE_INFINITY) {
    let option = null;
    for (const searchValue of autocompleteSearchInputValues(value, item)) {
        control.click();
        control.focus?.();
        setNativeControlValue(control, searchValue);
        dispatchInputEvents(control);
        if (control.hasAttribute('aria-expanded')) control.setAttribute('aria-expanded', 'true');
        if (isCertificatePrimaryFieldKey(item.fieldKey) &&
            !isCertificateNameFieldKey(item.fieldKey) &&
            certificateAutocompleteCanUseTypedValue(control, value, item)) {
            return {
                success: true,
                value,
                extraFilled: await fillRelatedAutocompleteValues(control, item.relatedValues ?? [], { sourceFieldKey: item.fieldKey, deadlineAt })
            };
        }
        option = await waitForAutocompleteOptionOrRelatedControl(control, value, item, deadlineAt);
        if (option) break;
    }
    if (!option) {
        const educationAutocomplete = isEducationMajorNameField(item.fieldKey);
        if (educationAutocomplete && autocompleteRelatedControlReady(control.ownerDocument, item.relatedValues ?? [], { requireAll: isEducationMajorNameField(item.fieldKey) })) {
            return {
                success: true,
                value,
                extraFilled: await fillRelatedAutocompleteValues(control, item.relatedValues ?? [], { sourceFieldKey: item.fieldKey, deadlineAt })
            };
        }
        if (schoolAutocompleteCanUseTypedValue(control, value, item) || schoolAutocompleteCanUseDeferredTypedValue(control, value, item)) {
            return {
                success: true,
                value,
                extraFilled: await fillRelatedAutocompleteValues(control, item.relatedValues ?? [], { sourceFieldKey: item.fieldKey, deadlineAt })
            };
        }
        if (certificateAutocompleteCanUseTypedValue(control, value, item)) {
            if (isCertificateNameFieldKey(item.fieldKey)) {
                setNativeControlValue(control, value);
                dispatchInputEvents(control);
            }
            return {
                success: true,
                value,
                extraFilled: await fillRelatedAutocompleteValues(control, item.relatedValues ?? [], { sourceFieldKey: item.fieldKey, deadlineAt })
            };
        }
        return { success: false, reason: 'select_option_not_found' };
    }
    activateElement(option);
    setChoiceState(option);
    if (isCertificateNameFieldKey(item.fieldKey)) {
        let committed = await waitForValue(
            () => certificatePrimarySelectionCommitted(control, value, item),
            false,
            boundedAutoFillWaitMs(AUTOFILL_CERTIFICATE_OPTION_COMMIT_WAIT_MS, deadlineAt)
        );
        if (!committed) {
            const optionText = choiceElementText(option);
            if (optionText && certificatePrimaryValuesMatch(value, optionText)) {
                setNativeControlValue(control, optionText);
                control.dispatchEvent(new (control.ownerDocument?.defaultView ?? window).Event('input', { bubbles: true }));
            }
            await dispatchAutocompleteKeyboardCommit(control, deadlineAt);
            committed = await waitForValue(
                () => certificatePrimarySelectionCommitted(control, value, item),
                false,
                boundedAutoFillWaitMs(AUTOFILL_RELATED_CERTIFICATE_DETAIL_IDLE_MS, deadlineAt)
            );
        }
        if (!committed) return { success: false, reason: 'select_option_not_found' };
    }
    return {
        success: true,
        value: choiceElementText(option) || value,
        extraFilled: await fillRelatedAutocompleteValues(control, item.relatedValues ?? [], { sourceFieldKey: item.fieldKey, deadlineAt, optionSelected: true })
    };
}

function certificatePrimarySelectionCommitted(control, value, item = {}) {
    if (!control || !isCertificateNameFieldKey(item.fieldKey)) return false;
    const target = parseCertificatePrimaryFieldKey(item.fieldKey);
    if (!target) return false;
    const currentValue = cleanText(control.value || control.getAttribute?.('value') || choiceCandidateText(control) || choiceElementText(control));
    if (!control.isConnected && currentValue && certificatePrimaryValuesMatch(value, currentValue)) return true;
    const wildcardKey = certificateFieldKey(target.group, target.field);
    const entry = closestCertificateEntry(control, wildcardKey);
    const selectedText = selectedCertificatePrimaryTextFromEntry(entry);
    if (selectedText && certificatePrimaryValuesMatch(value, selectedText)) return true;
    if (certificateEntryHasSelectedPrimaryChip(entry, value)) return true;
    return currentValue &&
        certificatePrimaryValuesMatch(value, currentValue) &&
        certificateAutocompleteRelatedControlReadyNearSource(control, item);
}

function autocompleteDropdownOpenForSource(control) {
    if (!control?.ownerDocument) return false;
    return autocompleteDropdownOptionCandidates(control).some((candidate) => !isHiddenElement(candidate));
}

function isCertificateNameFieldKey(fieldKey) {
    return /^certificates\.certificates\.\d+\.certificateName$/.test(String(fieldKey ?? ''));
}

function certificateEntryHasSelectedPrimaryChip(entry, expectedValue = '') {
    const normalizedExpected = normalize(expectedValue);
    if (!entry || !normalizedExpected) return false;
    const chips = Array.from(entry.querySelectorAll?.('.remix-css-zezw7x, button, [role="button"], div, span, p') ?? [])
        .filter((candidate) => candidate !== entry && !candidate.closest?.('#dropdown-body, [role="listbox"]') && !candidate.querySelector?.('input, textarea, select'));
    return chips.some((candidate) => {
        const text = normalize(stripRemovableChipSuffix(candidate.textContent));
        if (!text) return false;
        return (candidate.querySelector?.('svg, path') || normalize(candidate.className).includes('zezw7x')) &&
            certificatePrimaryValuesMatch(normalizedExpected, text);
    });
}

function autocompleteSearchInputValues(value, item = {}) {
    const candidates = [cleanText(value)].filter(Boolean);
    if (isCertificateNameFieldKey(item.fieldKey)) {
        const compactName = certificatePrimarySearchKeyword(value);
        if (compactName) candidates.push(compactName);
    }
    return Array.from(new Set(candidates));
}

function certificatePrimarySearchKeyword(value = '') {
    const text = cleanText(value);
    if (!text) return '';
    const beforeParen = cleanText(text.split('(')[0]);
    return beforeParen && beforeParen.length >= 2 ? beforeParen : '';
}

async function waitForAutocompleteOptionOrRelatedControl(control, value, item = {}, deadlineAt = Number.POSITIVE_INFINITY) {
    const deadline = Math.min(Date.now() + autocompleteOptionWaitTimeoutMs(item.fieldKey), deadlineAt);
    const typedValueFallbackAt = Date.now() + AUTOFILL_RELATED_INITIAL_IDLE_MS;
    let keyboardCommitAttempted = false;
    const keyboardCommitAt = Date.now() + AUTOFILL_DEPENDENT_FIELD_SETTLE_MS;
    const exactOptionOnly = isEducationSchoolNameField(item.fieldKey) ||
        isEducationMajorNameField(item.fieldKey) ||
        isCertificatePrimaryFieldKey(item.fieldKey);
    const candidateValues = autocompleteCandidateValues(value, item);
    while (Date.now() < deadline) {
        const option = findMatchingCertificateAutocompleteOptionFast(control, candidateValues, item) ??
            findMatchingAutocompleteOptionForValues(control.ownerDocument, candidateValues, control, {
                exactOptionOnly,
                certificatePrimaryMatch: isCertificatePrimaryFieldKey(item.fieldKey)
            });
        if (option) return option;
        if (isCertificatePrimaryFieldKey(item.fieldKey) && !isCertificateNameFieldKey(item.fieldKey) && certificateAutocompleteRelatedControlReady(control, item)) {
            return null;
        }
        if (isEducationMajorNameField(item.fieldKey) && !keyboardCommitAttempted && Date.now() >= keyboardCommitAt) {
            keyboardCommitAttempted = true;
            await dispatchAutocompleteKeyboardCommit(control, deadlineAt);
            await sleep(boundedAutoFillWaitMs(AUTOFILL_DEPENDENT_FIELD_SETTLE_MS, deadlineAt));
            if (autocompleteRelatedControlReady(control.ownerDocument, item.relatedValues ?? [], { requireAll: true })) {
                return null;
            }
        }
        if (isEducationSchoolNameField(item.fieldKey) && !isMidasAutocompleteShellInput(control) && schoolAutocompleteRelatedControlReady(control, item)) {
            return null;
        }
        if (isEducationSchoolNameField(item.fieldKey) &&
            Date.now() >= typedValueFallbackAt &&
            schoolAutocompleteCanUseTypedValue(control, value, item)) {
            return null;
        }
        await sleep(boundedAutoFillWaitMs(AUTOFILL_ASYNC_WAIT_INTERVAL_MS, deadlineAt));
    }
    return findMatchingCertificateAutocompleteOptionFast(control, candidateValues, item) ??
        findMatchingAutocompleteOptionForValues(control.ownerDocument, candidateValues, control, {
            exactOptionOnly,
            certificatePrimaryMatch: isCertificatePrimaryFieldKey(item.fieldKey)
        });
}

function findMatchingCertificateAutocompleteOptionFast(control, candidateValues, item = {}) {
    if (!isCertificatePrimaryFieldKey(item.fieldKey)) return null;
    const candidates = certificateAutocompleteDropdownOptionCandidates(control);
    for (const candidate of candidates) {
        const text = choiceElementText(candidate);
        if (!text || isRegisterOptionText(text)) continue;
        for (const value of candidateValues) {
            if (normalize(text) === normalize(value) || certificatePrimaryValuesMatch(value, text)) {
                return candidate;
            }
        }
    }
    return null;
}

function certificateAutocompleteDropdownOptionCandidates(sourceControl) {
    if (!sourceControl?.ownerDocument) return [];
    const roots = [];
    let current = sourceControl.parentElement;
    let depth = 0;
    while (current && current !== sourceControl.ownerDocument.body && depth < 6) {
        current.querySelectorAll?.('#dropdown-body, [role="listbox"]').forEach((root) => roots.push(root));
        current = current.parentElement;
        depth += 1;
    }
    if (!roots.length) {
        sourceControl.ownerDocument.querySelectorAll('#dropdown-body, [role="listbox"]').forEach((root) => roots.push(root));
    }
    const candidates = [];
    for (const root of Array.from(new Set(roots))) {
        if (isHiddenElement(root)) continue;
        root.querySelectorAll('button[type="button"], button:not([type]), [role="option"], [data-value], [data-option]').forEach((element) => {
            candidates.push(element);
        });
    }
    return Array.from(new Set(candidates))
        .filter((element) => element !== sourceControl && !element.disabled && element.getAttribute('aria-disabled') !== 'true' && !isAutomationControl(element));
}

function autocompleteCandidateValues(value, item = {}) {
    const candidates = [cleanText(value)].filter(Boolean);
    if (isCertificateNameFieldKey(item.fieldKey)) {
        const compactName = certificatePrimarySearchKeyword(value);
        if (compactName) candidates.push(compactName);
    }
    if (isEducationMajorNameField(item.fieldKey)) {
        const majorType = cleanText((item.relatedValues ?? [])
            .find((related) => /\.majorType$/.test(related?.key ?? ''))?.value);
        if (majorType) candidates.push(`${cleanText(value)}${majorType}`);
    }
    return Array.from(new Set(candidates));
}

function schoolAutocompleteCanUseTypedValue(control, value, item = {}) {
    if (!isEducationSchoolNameField(item.fieldKey)) return false;
    if (cleanText(control?.value) !== cleanText(value)) return false;
    return schoolAutocompleteRelatedControlReady(control, item);
}

function schoolAutocompleteCanUseDeferredTypedValue(control, value, item = {}) {
    if (!isEducationSchoolNameField(item.fieldKey)) return false;
    if (cleanText(control?.value) !== cleanText(value)) return false;
    return hasDeferredSchoolDetailValues(item.relatedValues ?? []);
}

function schoolAutocompleteRelatedControlReady(control, item = {}) {
    const schoolSelectionDependentValues = (item.relatedValues ?? []).filter(isSchoolSelectionDependentEducationValue);
    if (schoolSelectionDependentValues.length) {
        return autocompleteRelatedControlReady(control.ownerDocument, schoolSelectionDependentValues, { requireAll: true });
    }
    const section = control.closest?.('section, form') ?? control.ownerDocument;
    return Array.from(section.querySelectorAll?.('input, textarea, select, button, [role="combobox"], [aria-haspopup]') ?? [])
        .some((candidate) => candidate !== control && isFillableControl(candidate) && !candidate.disabled && !candidate.readOnly);
}

function isSchoolSelectionDependentEducationValue(value) {
    if (!cleanText(value?.value)) return false;
    return /^education\.(?:highSchool|universities\.\d+|graduateSchools\.\d+)\.(?:location|campusType|track)$/.test(String(value?.key ?? ''));
}

function certificateAutocompleteCanUseTypedValue(control, value, item = {}) {
    if (!isCertificatePrimaryFieldKey(item.fieldKey)) return false;
    if (isCertificateNameFieldKey(item.fieldKey)) {
        if (!certificatePrimaryValuesMatch(value, control?.value)) return false;
        if (isAutocompleteSearchControl(control) && !certificateRegisterOptionAvailableForValue(control.ownerDocument, value, control)) return false;
        return certificateAutocompleteRelatedControlReadyNearSource(control, item);
    }
    if (cleanText(control?.value) !== cleanText(value)) return false;
    return certificateAutocompleteRelatedControlReady(control, item);
}

function certificateRegisterOptionAvailableForValue(documentRef, value = '', sourceControl = null) {
    const normalizedValue = normalize(value);
    const normalizedKeyword = normalize(certificatePrimarySearchKeyword(value));
    if (!documentRef || !normalizedValue) return false;
    return autocompleteLooseOptionCandidates(documentRef, sourceControl).some((option) => {
        const text = choiceElementText(option);
        const normalizedText = normalize(text);
        if (!isRegisterOptionText(text)) return false;
        return normalizedText.includes(normalizedValue) ||
            Boolean(normalizedKeyword && normalizedText.includes(normalizedKeyword));
    });
}

function certificateAutocompleteRelatedControlReadyNearSource(control, item = {}) {
    if (!control) return false;
    const values = (item.relatedValues ?? []).filter(isCertificateSelectionDependentValue);
    if (!values.length) return false;
    return values.some((value) => {
        const target = parseCertificateDetailFieldKey(value.key);
        if (!target) return false;
        const expectedPrimary = expectedCertificatePrimaryValueForTarget(target, item.relatedValues ?? []);
        const detail = findCertificateDetailControlNearSource(control, target, value.value, expectedPrimary);
        return detail && !detail.disabled && !detail.readOnly;
    });
}

function certificateAutocompleteRelatedControlReady(control, item = {}) {
    const selectionDependentValues = (item.relatedValues ?? []).filter(isCertificateSelectionDependentValue);
    if (selectionDependentValues.length) {
        return autocompleteRelatedControlReady(control.ownerDocument, selectionDependentValues, { requireAll: true });
    }
    return autocompleteRelatedControlReady(control.ownerDocument, item.relatedValues ?? [], { ignoreFieldKey: item.fieldKey });
}

function isCertificateSelectionDependentValue(value) {
    if (!cleanText(value?.value)) return false;
    return /^certificates\.(?:languageTests|certificates)\.\d+\.(?:score|registrationNumber|issuer|acquiredDate)$/.test(String(value?.key ?? ''));
}

async function dispatchAutocompleteKeyboardCommit(control, deadlineAt = Number.POSITIVE_INFINITY) {
    const eventWindow = control.ownerDocument?.defaultView ?? window;
    control.click?.();
    control.focus?.();
    dispatchKeyboardEvent(control, eventWindow, 'ArrowDown');
    await sleep(boundedAutoFillWaitMs(AUTOFILL_ASYNC_WAIT_INTERVAL_MS, deadlineAt));
    dispatchKeyboardEvent(control, eventWindow, 'Enter');
    dispatchInputEvents(control);
}

function dispatchKeyboardEvent(control, eventWindow, key) {
    const keyCode = key === 'Enter' ? 13 : key === 'ArrowDown' ? 40 : 0;
    const code = key === 'Enter' ? 'Enter' : key === 'ArrowDown' ? 'ArrowDown' : key;
    for (const type of ['keydown', 'keyup']) {
        const event = new eventWindow.KeyboardEvent(type, { key, code, bubbles: true, cancelable: true });
        for (const [property, value] of [['keyCode', keyCode], ['which', keyCode]]) {
            try {
                Object.defineProperty(event, property, { get: () => value });
            } catch {
                // Some browser event implementations expose read-only legacy key fields.
            }
        }
        control.dispatchEvent(event);
    }
}

function closeOpenCustomSelectMenus(documentRef) {
    const eventWindow = documentRef?.defaultView ?? window;
    const targets = Array.from(new Set([
        documentRef?.activeElement,
        documentRef?.body
    ].filter(Boolean)));
    for (const target of targets) {
        dispatchKeyboardEvent(target, eventWindow, 'Escape');
    }
    documentRef?.activeElement?.blur?.();
}

function autocompleteRelatedControlReady(documentRef, relatedValues, options = {}) {
    const ignoredKeys = new Set([options.ignoreFieldKey].filter(Boolean));
    const pending = relatedValues.filter((value) => cleanText(value?.value) && !ignoredKeys.has(value?.key));
    if (!pending.length) return false;
    const isReady = (value) => {
        if (!cleanText(value?.value)) return false;
        const target = findCurrentControlForFieldKey(documentRef, value.key, value.value, { relatedValues });
        return target && canFillControlForField(target, value.key);
    };
    return options.requireAll ? pending.every(isReady) : pending.some(isReady);
}

async function fillRelatedAutocompleteValues(sourceControl, relatedValues, options = {}) {
    const filled = [];
    const pending = relatedValues.filter((value) => cleanText(value?.value) && value?.key !== options.sourceFieldKey);
    const deadline = Math.min(Date.now() + dependentAutocompleteWaitTimeoutMs(pending, sourceControl), options.deadlineAt ?? Number.POSITIVE_INFINITY);
    const initialIdleMs = relatedInitialIdleMs(sourceControl, pending, options);
    const progressIdleMs = relatedProgressIdleMs(sourceControl, pending);
    const startedAt = Date.now();
    const openedMajorBases = new Set();
    let lastProgressAt = 0;

    while (pending.length) {
        invalidateApplicationFormElementCache(sourceControl.ownerDocument);
        let handledAny = false;

        for (let index = 0; index < pending.length; index += 1) {
            const value = pending[index];
            const target = findCurrentControlForFieldKey(sourceControl.ownerDocument, value.key, value.value, { relatedValues, sourceControl });
            if (!target || !canFillControlForField(target, value.key)) {
                if (isOptionalDeferredEducationFieldKey(value.key)) {
                    pending.splice(index, 1);
                    index -= 1;
                    continue;
                }
                const majorBase = educationMajorDetailBase(value.key);
                if (majorBase && !openedMajorBases.has(majorBase) && !educationMajorEntryExistsForFieldKey(sourceControl.ownerDocument, value.key, expectedEducationMajorNameForFieldKey(value.key, relatedValues))) {
                    const opener = findEducationMajorOpenControl(sourceControl.ownerDocument, value.key);
                    if (opener && !isEffectivelyDisabled(opener)) {
                        openedMajorBases.add(majorBase);
                        activateElement(opener);
                        handledAny = true;
                        lastProgressAt = Date.now();
                    }
                }
                continue;
            }

            const result = await setControlValueAsync(target, value.value, { fieldKey: value.key, waitForControlBeforeFill: true, relatedValues }, deadline);
            pending.splice(index, 1);
            index -= 1;
            handledAny = true;
            if (result.success) {
                lastProgressAt = Date.now();
                filled.push({ fieldKey: value.key, label: value.label, value: result.value });
            }
        }

        if (!pending.length || Date.now() >= deadline) break;
        if (lastProgressAt &&
            !hasRelatedControlWaitSignal(sourceControl.ownerDocument, pending) &&
            !shouldWaitForDeferredRelatedControl(sourceControl.ownerDocument, pending, relatedValues, sourceControl)) break;
        if (!handledAny && !lastProgressAt && Date.now() - startedAt >= initialIdleMs) break;
        if (!handledAny && lastProgressAt && Date.now() - lastProgressAt >= progressIdleMs) break;
        await sleep(boundedAutoFillWaitMs(handledAny ? AUTOFILL_DEPENDENT_FIELD_SETTLE_MS : AUTOFILL_ASYNC_WAIT_INTERVAL_MS, deadline));
    }
    return filled;
}

function relatedInitialIdleMs(sourceControl, pendingValues, options = {}) {
    if (pendingValues.length <= 1) return AUTOFILL_RELATED_INITIAL_IDLE_MS;
    if (hasEducationRelatedValues(pendingValues)) {
        if (options.optionSelected && pendingValues.every(isEducationMajorRelatedValue)) {
            return AUTOFILL_RELATED_MAJOR_DETAIL_IDLE_MS;
        }
        if (options.optionSelected && !hasDeferredSchoolInputDetailValues(pendingValues)) {
            return AUTOFILL_RELATED_SCHOOL_GROUP_FAST_IDLE_MS;
        }
        return schoolAutocompleteHasDeferredDetailContainer(sourceControl) && hasDeferredSchoolDetailValues(pendingValues)
            ? AUTOFILL_RELATED_SCHOOL_GROUP_INITIAL_IDLE_MS
            : AUTOFILL_RELATED_SCHOOL_GROUP_FAST_IDLE_MS;
    }
    return AUTOFILL_RELATED_GROUP_INITIAL_IDLE_MS;
}

function hasEducationRelatedValues(pendingValues) {
    return pendingValues.some((value) => /^education\./.test(String(value?.key ?? '')));
}

function isEducationMajorRelatedValue(value) {
    return cleanText(value?.value) &&
        /^education\.(?:universities|graduateSchools)\.\d+\.majors\.\d+\.(?:majorType|majorCategory|dayNight)$/.test(String(value?.key ?? ''));
}

function hasDeferredSchoolDetailValues(pendingValues) {
    return pendingValues.some((value) => {
        if (!cleanText(value?.value)) return false;
        return /^education\.(?:highSchool|universities\.\d+|graduateSchools\.\d+)\.(?:graduationDate|graduationStatus|degreeType|startDate|endDate|location|campusType|grade|gradeScale|credits|track)$/.test(String(value?.key ?? '')) ||
            /^education\.(?:universities|graduateSchools)\.\d+\.majors\.\d+\./.test(String(value?.key ?? ''));
    });
}

function hasDeferredSchoolInputDetailValues(pendingValues) {
    return pendingValues.some((value) => {
        if (!cleanText(value?.value)) return false;
        return /^education\.(?:highSchool|universities\.\d+|graduateSchools\.\d+)\.(?:graduationDate|graduationStatus|degreeType|startDate|endDate|grade|gradeScale|credits)$/.test(String(value?.key ?? '')) ||
            /^education\.(?:universities|graduateSchools)\.\d+\.majors\.\d+\./.test(String(value?.key ?? ''));
    });
}

function relatedProgressIdleMs(sourceControl, pendingValues) {
    if (pendingValues.some(isCertificateAcquiredDateValue)) {
        return AUTOFILL_RELATED_CERTIFICATE_DATE_IDLE_MS;
    }
    if (pendingValues.some(isCertificateSelectionDependentValue)) {
        return AUTOFILL_RELATED_CERTIFICATE_DETAIL_IDLE_MS;
    }
    return AUTOFILL_RELATED_IDLE_AFTER_PROGRESS_MS;
}

function isCertificateAcquiredDateValue(value) {
    return cleanText(value?.value) && isCertificateAcquiredDateFieldKey(value?.key);
}

function isCertificateAcquiredDateFieldKey(fieldKey) {
    return /^certificates\.(?:languageTests|certificates)\.(?:\d+|\*)\.acquiredDate$/.test(String(fieldKey ?? ''));
}

function canFillControlForField(control, fieldKey) {
    if (!control || isEffectivelyDisabled(control)) return false;
    if (!control.readOnly) return true;
    return canFillReadonlyControlForField(control, fieldKey);
}

function canFillReadonlyControlForField(control, fieldKey) {
    if (!control?.readOnly || !isCertificateAcquiredDateFieldKey(fieldKey)) return false;
    if (control.tagName?.toLowerCase() !== 'input') return false;
    return !SKIPPED_INPUT_TYPES.has((control.getAttribute('type') ?? 'text').toLowerCase());
}

function shouldWaitForDeferredRelatedControl(documentRef, pendingValues, relatedValues = pendingValues, sourceControl = null) {
    return pendingValues.some((value) => {
        if (!isCertificateSelectionDependentValue(value)) return false;
        const target = findCurrentControlForFieldKey(documentRef, value.key, value.value, { relatedValues: pendingValues });
        if (target) return canFillControlForField(target, value.key);
        if (!isCertificateAcquiredDateValue(value)) return false;
        return certificateDeferredDateInputLikely(documentRef, value, relatedValues, sourceControl);
    });
}

function certificateDeferredDateInputLikely(documentRef, value, relatedValues = [], sourceControl = null) {
    const target = parseCertificateDetailFieldKey(value?.key);
    if (!target) return false;
    const expectedPrimary = expectedCertificatePrimaryValueForTarget(target, relatedValues);
    const entry = sourceControl
        ? closestCertificateSourceEntry(sourceControl, target.group)
        : certificateEntryForSelectedPrimary(documentRef, target.group, expectedPrimary);
    if (!entry) return false;
    if (expectedPrimary) {
        const selectedPrimary = selectedCertificatePrimaryTextFromEntry(entry);
        if (selectedPrimary && !certificatePrimaryValuesMatch(expectedPrimary, selectedPrimary)) return false;
    }
    const detailControls = Array.from(entry.querySelectorAll?.('input, textarea, select') ?? [])
        .filter((control) => !isHiddenElement(control));
    return detailControls.some((control) => {
        const key = repeatedCertificateGroupWildcardKeyForControl(control, target.group);
        return key && !isCertificatePrimaryFieldKey(key);
    });
}

function schoolAutocompleteHasDeferredDetailContainer(sourceControl) {
    const section = closestEducationSection(sourceControl) ?? sourceControl?.closest?.('section, form');
    if (!section) return false;
    return Array.from(section.querySelectorAll('div, section')).some((element) => {
        if (element === section || element.contains(sourceControl)) return false;
        const signature = normalize([
            element.id,
            element.className,
            element.getAttribute?.('data-field'),
            element.getAttribute?.('data-testid')
        ].filter(Boolean).join(' '));
        if (!signature.includes('detail') && !signature.includes('answer') && !signature.includes('field')) return false;
        return !cleanText(element.textContent) && !element.querySelector?.('input, textarea, select, button, [role="button"], [aria-haspopup]');
    });
}

function hasRelatedControlWaitSignal(documentRef, pendingValues) {
    return pendingValues.some((value) => {
        if (!cleanText(value?.value)) return false;
        const target = findCurrentControlForFieldKey(documentRef, value.key, value.value, { relatedValues: pendingValues });
        if (target && canFillControlForField(target, value.key)) return true;
        const majorBase = educationMajorDetailBase(value.key);
        return Boolean(majorBase && !educationMajorEntryExistsForFieldKey(documentRef, value.key, expectedEducationMajorNameForFieldKey(value.key, pendingValues)) && findEducationMajorOpenControl(documentRef, value.key));
    });
}

function dependentAutocompleteWaitTimeoutMs(relatedValues, sourceControl = null) {
    if (relatedValues.length && relatedValues.every(isEducationMajorRelatedValue)) {
        return AUTOFILL_RELATED_MAJOR_DETAIL_WAIT_TIMEOUT_MS;
    }
    if (hasDeferredSchoolDetailValues(relatedValues)) {
        return 1800;
    }
    if (relatedValues.length && relatedValues.every(isCertificateSelectionDependentValue)) {
        return relatedValues.some(isCertificateAcquiredDateValue) ? 900 : 420;
    }
    return relatedValues.some((value) => dependentControlWaitTimeoutMs(value.key) === AUTOFILL_DEPENDENT_CONTROL_WAIT_TIMEOUT_MS)
        ? AUTOFILL_DEPENDENT_CONTROL_WAIT_TIMEOUT_MS
        : AUTOFILL_ASYNC_WAIT_TIMEOUT_MS;
}

function autocompleteOptionWaitTimeoutMs(fieldKey) {
    if (isEducationSchoolNameField(fieldKey) || isEducationMajorNameField(fieldKey)) {
        return AUTOFILL_EDUCATION_AUTOCOMPLETE_OPTION_WAIT_TIMEOUT_MS;
    }
    if (isCertificatePrimaryFieldKey(fieldKey)) {
        return 520;
    }
    return AUTOFILL_ASYNC_WAIT_TIMEOUT_MS;
}

function isEducationMajorDependentControl(control, fieldKey) {
    if (!closestEducationMajorEntry(control)) return false;
    return /^education\.(?:universities|graduateSchools)\.(?:\d+|\*)(?:\.majors\.\d+)?\.(?:majorCategory|majorType|dayNight)$/.test(fieldKey);
}

function shouldDeferEducationMajorDependentControl(control, fieldKey) {
    if (!isEducationMajorDependentControl(control, fieldKey)) return false;
    const majorEntry = closestEducationMajorEntry(control);
    if (!majorEntry) return false;
    if (selectedEducationMajorNameTextFromEntry(majorEntry)) return false;
    if (control.disabled || control.getAttribute('aria-disabled') === 'true') return true;
    return Array.from(majorEntry.querySelectorAll('input, textarea')).some((candidate) => {
        if (!isFillableControl(candidate)) return false;
        const context = collectControlText(candidate);
        const key = directFieldKeyForControl(candidate, context) || directFieldKeyFromText(context.displayLabel);
        return isEducationMajorNameField(key);
    });
}

function setChoiceState(control) {
    const role = (control.getAttribute('role') ?? '').toLowerCase();
    if (['radio', 'checkbox', 'switch'].includes(role)) control.setAttribute('aria-checked', 'true');
    if (control.hasAttribute('aria-selected')) control.setAttribute('aria-selected', 'true');
    if (control.hasAttribute('aria-pressed')) control.setAttribute('aria-pressed', 'true');
}

function activateElement(element) {
    invalidateApplicationFormElementCache(element?.ownerDocument);
    const eventWindow = element.ownerDocument?.defaultView ?? window;
    const pointerEvent = eventWindow.PointerEvent ?? eventWindow.MouseEvent;
    for (const type of ['pointerdown', 'pointerup']) {
        element.dispatchEvent(new pointerEvent(type, { bubbles: true, cancelable: true }));
    }
    for (const type of ['mousedown', 'mouseup', 'click']) {
        element.dispatchEvent(new eventWindow.MouseEvent(type, { bubbles: true, cancelable: true }));
    }
    invalidateApplicationFormElementCache(element?.ownerDocument);
}

function findMatchingCustomOption(documentRef, value, sourceControl, options = {}) {
    const normalizedValue = normalize(value);
    const ignored = options.ignoreElements ?? new Set();
    const candidates = (options.candidates ?? customOptionCandidates(documentRef, sourceControl))
        .filter((element) => !ignored.has(element));
    let best = null;
    let bestScore = 0;
    for (const element of candidates) {
        if (isUnrelatedAutocompleteDropdownOption(element, sourceControl)) continue;
        const optionText = normalize(choiceElementText(element));
        const rawOptionText = choiceElementText(element);
        const optionValue = normalize(element.getAttribute('data-value') || element.getAttribute('data-option') || element.getAttribute('value'));
        const schoolAutocomplete = isSchoolAutocompleteControl(sourceControl);
        if (schoolAutocomplete && isSchoolAutocompleteNonResultOption(choiceElementText(element))) continue;
        if (options.certificatePrimaryMatch && isRegisterOptionText(rawOptionText)) continue;
        let score = 0;
        if (optionText && optionText === normalizedValue) score = 100;
        else if (optionValue && optionValue === normalizedValue) score = 90;
        else if (options.certificatePrimaryMatch && optionText && certificatePrimaryValuesMatch(value, rawOptionText)) score = 85;
        else if (schoolAutocomplete && schoolAutocompleteOptionContainsValue(optionText, normalizedValue)) score = 70;
        else if (!options.exactOptionOnly && optionText && optionText.includes(normalizedValue)) score = 50;
        else if (!options.exactOptionOnly && optionText && normalizedValue.includes(optionText)) score = 40;
        if (schoolAutocomplete && score < 50) continue;
        if (score > bestScore) {
            best = element;
            bestScore = score;
        }
    }
    return best;
}

function schoolAutocompleteOptionContainsValue(optionText, normalizedValue) {
    if (!optionText || !normalizedValue || normalizedValue.length < 4) return false;
    return optionText.includes(normalizedValue);
}

function isUnrelatedAutocompleteDropdownOption(element, sourceControl) {
    const dropdown = element?.closest?.('#dropdown-body');
    if (!dropdown || !sourceControl) return false;
    const sourceTagName = sourceControl.tagName?.toLowerCase();
    let dropdownOwner = dropdown.parentElement;
    let ownerDepth = 0;
    while (dropdownOwner && dropdownOwner !== sourceControl.ownerDocument.body && ownerDepth < 4) {
        if (!dropdownOwner.contains(sourceControl)) {
            const ownerInput = dropdownOwner.querySelector?.('input, textarea, [role="combobox"]');
            if (ownerInput && ownerInput !== sourceControl && !ownerInput.contains?.(sourceControl)) return true;
        }
        dropdownOwner = dropdownOwner.parentElement;
        ownerDepth += 1;
    }
    let current = sourceControl.parentElement;
    let depth = 0;
    while (current && current !== sourceControl.ownerDocument.body && depth < 6) {
        if (current.contains(dropdown)) return false;
        current = current.parentElement;
        depth += 1;
    }
    if (!['input', 'textarea'].includes(sourceTagName)) return true;
    const sourceKey = directFieldKeyForControl(sourceControl, isCustomSelectLikeControl(sourceControl)
        ? collectCustomSelectText(sourceControl)
        : collectChoiceText(sourceControl, choiceCandidateText(sourceControl)));
    return !isAutocompletePrimaryFieldKey(sourceKey);
}

function findMatchingAutocompleteOption(documentRef, value, sourceControl, options = {}) {
    const dropdownCandidates = autocompleteDropdownOptionCandidates(sourceControl);
    return findMatchingCustomOption(documentRef, value, sourceControl, {
        ...options,
        candidates: dropdownCandidates.length ? dropdownCandidates : autocompleteLooseOptionCandidates(documentRef, sourceControl)
    });
}

function autocompleteLooseOptionCandidates(documentRef, sourceControl) {
    return Array.from(new Set(documentRef.querySelectorAll('[role="option"], button[type="button"], button:not([type]), [data-value], [data-option]')))
        .filter((element) => element !== sourceControl && !element.disabled && element.getAttribute('aria-disabled') !== 'true' && !isAutomationControl(element))
        .filter((element) => !isSelectedEducationMajorChipOption(element, sourceControl));
}

function findMatchingAutocompleteOptionForValues(documentRef, values, sourceControl, options = {}) {
    for (const value of values) {
        const option = findMatchingAutocompleteOption(documentRef, value, sourceControl, options);
        if (option) return option;
    }
    return null;
}

function certificateRecordIndexForControl(control, wildcardKey, fieldName = '') {
    const explicitIndex = certificateExplicitRecordIndexForControl(control, wildcardKey);
    if (explicitIndex != null) return explicitIndex;
    const entry = closestCertificateEntry(control, wildcardKey);
    const section = closestCertificateSection(entry ?? control) ?? control.ownerDocument;
    if (!entry || entry === section) {
        return certificateSequentialRecordIndexForControl(control, wildcardKey);
    }
    const entries = Array.from(new Set(
        Array.from(section.querySelectorAll('input, textarea, select, button[type="button"], button:not([type]), [role="button"], [aria-haspopup]'))
            .map((candidate) => closestCertificateEntry(candidate, wildcardKey))
            .filter(Boolean)
            .filter((candidate) => candidate !== section)
    ));
    const index = entries.indexOf(entry);
    if (index >= 0) return index;
    return fieldName ? certificateSequentialRecordIndexForControl(control, wildcardKey) : 0;
}

function certificateSequentialRecordIndexForControl(control, wildcardKey) {
    const groupPrefix = String(wildcardKey ?? '').match(/^(certificates\.(?:certificates|languageTests))\./)?.[1];
    const root = closestCertificateSection(control) ?? control.ownerDocument;
    const controls = Array.from(root.querySelectorAll('input, textarea, select, button[type="button"], button:not([type]), [role="button"], [aria-haspopup]'))
        .filter((candidate) => !isHiddenElement(candidate))
        .filter((candidate) => {
            const key = repeatedWildcardKeyForControl(candidate, wildcardKey);
            return key && (!groupPrefix || key.startsWith(`${groupPrefix}.*.`));
        });
    let recordIndex = -1;
    for (const candidate of controls) {
        const key = repeatedWildcardKeyForControl(candidate, wildcardKey);
        if (isCertificatePrimaryFieldKey(key)) recordIndex += 1;
        if (candidate === control) return Math.max(recordIndex, 0);
    }
    return 0;
}

function certificateExplicitRecordIndexForControl(control, wildcardKey) {
    const group = String(wildcardKey ?? '').match(/^certificates\.(certificates|languageTests)\./)?.[1];
    const rawSignature = [
        control?.getAttribute?.('name'),
        control?.id,
        control?.getAttribute?.('data-field'),
        control?.getAttribute?.('data-testid'),
        control?.getAttribute?.('aria-controls')
    ].filter(Boolean).join(' ');
    const rawDotted = rawSignature.match(/(?:certificates|languagetests|licenseanswers?|testanswers?)\.(\d+)\./i);
    if (rawDotted) return Number(rawDotted[1]);
    const rawDashed = rawSignature.match(group === 'languageTests'
        ? /(?:language|exam|test)[^-_a-z0-9]*(?:test)?[-_][^0-9]*(\d+)/i
        : /(?:cert|certificate|license)[-_][^0-9]*(\d+)/i);
    if (rawDashed) return Number(rawDashed[1]);
    const signature = normalize(rawSignature);
    const dotted = signature.match(/(?:certificates|languagetests)\.(\d+)\./);
    if (dotted) return Number(dotted[1]);
    const dashed = signature.match(group === 'languageTests'
        ? /(?:language|exam|test)[^-_a-z0-9]*(?:test)?[-_]?[^0-9]*(\d+)/i
        : /(?:cert|certificate|license)[-_]?[^0-9]*(\d+)/i);
    return dashed ? Number(dashed[1]) : null;
}

function closestCertificateEntry(control, wildcardKey) {
    const groupPrefix = String(wildcardKey ?? '').match(/^(certificates\.(?:certificates|languageTests))\./)?.[1];
    let current = control?.parentElement;
    let depth = 0;
    let fallbackEntry = null;
    while (current && current !== control.ownerDocument.body && depth < 10) {
        const controls = Array.from(current.querySelectorAll?.('input, textarea, select, button[type="button"], button:not([type]), [role="button"], [aria-haspopup]') ?? [])
            .filter((candidate) => !isHiddenElement(candidate))
            .filter((candidate) => !candidate.closest?.('#dropdown-body, [role="listbox"]'))
            .filter((candidate) => {
                const key = repeatedWildcardKeyForControl(candidate, wildcardKey);
                return key && (!groupPrefix || key.startsWith(`${groupPrefix}.*.`));
            });
        const hasPrimary = controls.some((candidate) => isCertificatePrimaryFieldKey(repeatedWildcardKeyForControl(candidate, wildcardKey)));
        const hasDetail = controls.some((candidate) => {
            const key = repeatedWildcardKeyForControl(candidate, wildcardKey);
            return key && !isCertificatePrimaryFieldKey(key);
        });
        if (hasPrimary && hasDetail) {
            if (fallbackEntry && fallbackEntry !== current) {
                const fallbackSelected = selectedCertificatePrimaryTextFromEntry(fallbackEntry);
                const currentSelected = selectedCertificatePrimaryTextFromEntry(current);
                const fallbackHasDetail = certificateEntryHasDetailControl(fallbackEntry, wildcardKey, groupPrefix);
                if (fallbackHasDetail && fallbackSelected) return fallbackEntry;
                if (!fallbackHasDetail && !fallbackSelected && currentSelected) return fallbackEntry;
            }
            return current;
        }
        if (hasPrimary && controls.length >= 1) fallbackEntry = current;
        else if (hasDetail && controls.length >= 2 && !fallbackEntry) fallbackEntry = current;
        current = current.parentElement;
        depth += 1;
    }
    return fallbackEntry;
}

function certificateEntryHasDetailControl(entry, wildcardKey, groupPrefix = '') {
    if (!entry) return false;
    return Array.from(entry.querySelectorAll?.('input, textarea, select, button[type="button"], button:not([type]), [role="button"], [aria-haspopup]') ?? [])
        .filter((candidate) => !isHiddenElement(candidate))
        .some((candidate) => {
            const key = repeatedWildcardKeyForControl(candidate, wildcardKey);
            return key && (!groupPrefix || key.startsWith(`${groupPrefix}.*.`)) && !isCertificatePrimaryFieldKey(key);
        });
}

function autocompleteDropdownOptionCandidates(sourceControl) {
    const roots = [];
    let current = sourceControl?.parentElement;
    let depth = 0;
    while (current && current !== sourceControl.ownerDocument.body && depth < 6) {
        if (current.querySelector?.('#dropdown-body, [role="listbox"]')) roots.push(current);
        current = current.parentElement;
        depth += 1;
    }
    const candidates = [];
    for (const root of roots) {
        root.querySelectorAll('#dropdown-body button, #dropdown-body [role="option"], #dropdown-body [data-value], #dropdown-body [data-option], [role="listbox"] button, [role="listbox"] [role="option"]').forEach((element) => {
            candidates.push(element);
        });
    }
    return Array.from(new Set(candidates))
        .filter((element) => element !== sourceControl && !element.disabled && element.getAttribute('aria-disabled') !== 'true' && !isAutomationControl(element))
        .filter((element) => !isSelectedEducationMajorChipOption(element, sourceControl));
}

function customOptionCandidates(documentRef, sourceControl, options = {}) {
    const scopedCandidates = scopedCustomOptionCandidates(documentRef, sourceControl);
    if (options.scopedOnly) {
        return filterCustomOptionCandidates(scopedCandidates, sourceControl);
    }
    return Array.from(new Set([
        ...scopedCandidates,
        ...documentRef.querySelectorAll('[role="option"], [data-value], [data-option], li, button[type="button"], button:not([type]), [role="button"], [tabindex]:not(input):not(textarea):not(select)'),
        ...plainCustomOptionCandidates(documentRef, sourceControl)
    ]))
        .filter((element) => isCustomOptionCandidate(element, sourceControl));
}

function scopedCustomOptionCandidates(documentRef, sourceControl) {
    if (!documentRef) return [];
    const roots = [];
    const includePlainTextOptions = shouldIncludePlainScopedCustomOptions(sourceControl);
    let current = sourceControl?.parentElement;
    let depth = 0;
    while (current && current !== documentRef.body && depth < 6) {
        current.querySelectorAll?.('#dropdown-body, [role="listbox"]').forEach((root) => roots.push(root));
        current = current.parentElement;
        depth += 1;
    }
    documentRef.querySelectorAll('#dropdown-body, [role="listbox"]').forEach((root) => roots.push(root));
    const candidates = [];
    for (const root of Array.from(new Set(roots))) {
        if (isHiddenElement(root)) continue;
        root.querySelectorAll('[role="option"], [data-value], [data-option], li, button[type="button"], button:not([type]), [role="button"], [tabindex]:not(input):not(textarea):not(select)').forEach((element) => {
            candidates.push(element);
        });
        if (includePlainTextOptions) {
            root.querySelectorAll('div, p, span').forEach((element) => {
                candidates.push(element);
            });
        }
    }
    return Array.from(new Set(candidates));
}

function shouldIncludePlainScopedCustomOptions(sourceControl) {
    const tagName = sourceControl?.tagName?.toLowerCase();
    return tagName !== 'input' && tagName !== 'textarea';
}

function filterCustomOptionCandidates(candidates, sourceControl) {
    return Array.from(new Set(candidates))
        .filter((element) => isCustomOptionCandidate(element, sourceControl));
}

function isCustomOptionCandidate(element, sourceControl) {
    return element !== sourceControl &&
        !element.disabled &&
        element.getAttribute('aria-disabled') !== 'true' &&
        !isAutomationControl(element) &&
        !belongsToOtherAutocompleteDropdown(element, sourceControl) &&
        !isPotentialCustomSelectControl(element) &&
        !isSelectedEducationMajorChipOption(element, sourceControl) &&
        !(element.matches('li') && element.querySelector('button, [role="option"], [data-value], [data-option]'));
}

function belongsToOtherAutocompleteDropdown(element, sourceControl) {
    const dropdown = element?.closest?.('#dropdown-body');
    if (!dropdown || !sourceControl) return false;
    const owner = dropdown.closest('.ats-inline-flex, .ats-relative, .ats-group') ?? dropdown.parentElement;
    const ownerInput = owner?.querySelector?.('input, textarea, [role="combobox"]');
    return Boolean(ownerInput && ownerInput !== sourceControl && !ownerInput.contains?.(sourceControl) && !owner.contains?.(sourceControl));
}

function plainCustomOptionCandidates(documentRef, sourceControl) {
    const searchRoots = plainCustomOptionSearchRoots(documentRef, sourceControl);
    return searchRoots.flatMap((root) => Array.from(root.querySelectorAll('div, p, span'))).filter((element) => {
        if (element === sourceControl || sourceControl?.contains?.(element)) return false;
        if (isHiddenElement(element) || isAutomationControl(element)) return false;
        if (element.querySelector('input, textarea, select, button, [role="button"], [role="combobox"]')) return false;
        const text = choiceElementText(element);
        const normalized = normalize(text);
        if (!text || text.length > 50 || ACTION_BUTTON_TERMS.includes(normalized)) return false;
        const interactiveParent = element.closest('button, [role="button"], [role="combobox"], [aria-haspopup="listbox"], [aria-haspopup="true"]');
        return !interactiveParent || interactiveParent !== sourceControl;
    });
}

function plainCustomOptionSearchRoots(documentRef, sourceControl) {
    if (!documentRef) return [];
    const roots = [];
    let current = sourceControl?.parentElement;
    let depth = 0;
    while (current && current !== documentRef.body && depth < 6) {
        current.querySelectorAll?.('#dropdown-body, [role="listbox"]').forEach((root) => roots.push(root));
        current = current.parentElement;
        depth += 1;
    }
    documentRef.querySelectorAll('#dropdown-body, [role="listbox"]').forEach((root) => roots.push(root));
    const scopedRoots = Array.from(new Set(roots)).filter((root) => !isHiddenElement(root));
    return scopedRoots.length > 0 ? scopedRoots : [documentRef];
}

function isSchoolAutocompleteControl(control) {
    if (!control) return false;
    const signature = normalize([
        control.getAttribute('name'),
        control.id,
        control.getAttribute('placeholder'),
        control.getAttribute('aria-label'),
        labelText(control),
        nearbyText(control)
    ].filter(Boolean).join(' '));
    return signature.includes(normalize('\ud559\uad50\uba85')) ||
        signature.includes(normalize('\ud559\uad50\uc815\ubcf4')) ||
        signature.includes('schoolname');
}

function isRegisterOptionText(text) {
    const normalized = normalize(text);
    return normalized.includes(normalize('\ub4f1\ub85d\ud558\uae30')) ||
        normalized.includes(normalize('\ucd94\uac00\ud558\uae30')) ||
        normalized.includes('register') ||
        normalized.includes('addnew');
}

function isSchoolAutocompleteNonResultOption(text) {
    const normalized = normalize(text);
    return isRegisterOptionText(text) ||
        normalized === normalize('\uace0\ub4f1\ud559\uad50') ||
        normalized === normalize('\ub300\ud559\uad50') ||
        normalized === normalize('\ub300\ud559\uc6d0');
}

function resolveControlForFill(item) {
    if (item.waitForControlBeforeFill) {
        return findCurrentControlForFieldKey(item.element?.ownerDocument, item.fieldKey, item.value, { relatedValues: item.relatedValues });
    }
    if (isNestedEducationMajorValueKey(item.fieldKey)) {
        return findCurrentControlForFieldKey(item.element?.ownerDocument, item.fieldKey, item.value, { relatedValues: item.relatedValues }) ?? item.element;
    }
    if (!item.requiresEnabledBeforeFill) return item.element;
    if (item.element?.isConnected && !item.element.disabled) return item.element;
    return findCurrentControlForFieldKey(item.element?.ownerDocument, item.fieldKey, item.value) ?? item.element;
}

async function resolveControlForFillAsync(item, deadlineAt = Number.POSITIVE_INFINITY) {
    const majorNameKey = item.sectionOpenControl ? educationMajorNameKeyFromOpenFieldKey(item.fieldKey) : null;
    if (majorNameKey) {
        return await waitForValue(() => {
            if (educationMajorEntryExistsForFieldKey(item.element?.ownerDocument, majorNameKey, expectedEducationMajorNameForFieldKey(majorNameKey, item.relatedValues))) return item.element;
            const opener = findEducationMajorOpenControl(item.element?.ownerDocument, majorNameKey);
            return opener && !isEffectivelyDisabled(opener) ? opener : null;
        }, item.element, boundedAutoFillWaitMs(AUTOFILL_DEPENDENT_CONTROL_WAIT_TIMEOUT_MS, deadlineAt));
    }
    const nestedMajorNameKey = educationMajorNameKeyForNestedFieldKey(item.fieldKey);
    if (nestedMajorNameKey) {
        await openEducationMajorEntryAsync(item.element?.ownerDocument, nestedMajorNameKey, item, deadlineAt);
        return await waitForValue(() => {
            invalidateApplicationFormElementCache(item.element?.ownerDocument);
            const current = findCurrentControlForFieldKey(item.element?.ownerDocument, item.fieldKey, item.value, { relatedValues: item.relatedValues });
            return current && !isEffectivelyDisabled(current) && !current.readOnly ? current : null;
        }, null, boundedAutoFillWaitMs(dependentControlWaitTimeoutMs(item.fieldKey), deadlineAt));
    }
    if (item.waitForControlBeforeFill) {
        return await waitForValue(() => {
            const current = findCurrentControlForFieldKey(item.element?.ownerDocument, item.fieldKey, item.value, { relatedValues: item.relatedValues });
            return current && canFillControlForField(current, item.fieldKey) ? current : null;
        }, null, boundedAutoFillWaitMs(missingControlWaitTimeoutMs(item), deadlineAt));
    }
    if (!item.requiresEnabledBeforeFill) return item.element;
    if (item.element?.isConnected && !isEffectivelyDisabled(item.element)) return item.element;
    return await waitForValue(() => {
        const current = findCurrentControlForFieldKey(item.element?.ownerDocument, item.fieldKey, item.value, { relatedValues: item.relatedValues });
        return current && !isEffectivelyDisabled(current) ? current : null;
    }, item.element, boundedAutoFillWaitMs(AUTOFILL_ASYNC_WAIT_TIMEOUT_MS, deadlineAt));
}

function dependentControlWaitTimeoutMs(fieldKey) {
    const key = String(fieldKey ?? '');
    return (key.startsWith('education.') || key.startsWith('certificates.'))
        ? AUTOFILL_DEPENDENT_CONTROL_WAIT_TIMEOUT_MS
        : AUTOFILL_ASYNC_WAIT_TIMEOUT_MS;
}

function missingControlWaitTimeoutMs(item) {
    if (item?.ignoreMissingControl) return 0;
    if (isCertificateAcquiredDateFieldKey(item?.fieldKey)) return AUTOFILL_CERTIFICATE_DATE_MISSING_WAIT_MS;
    return dependentControlWaitTimeoutMs(item?.fieldKey);
}

function findCurrentControlForFieldKey(documentRef, fieldKey, value = '', options = {}) {
    if (!documentRef) return null;
    const nestedMajor = parseNestedEducationMajorFieldKey(fieldKey);
    if (nestedMajor) {
        const nestedControl = findNestedEducationMajorControl(documentRef, nestedMajor, value, options);
        if (nestedControl) return nestedControl;
    }
    const certificatePrimary = parseCertificatePrimaryFieldKey(fieldKey);
    if (certificatePrimary) {
        const primaryControl = findCertificatePrimaryControl(documentRef, certificatePrimary, value);
        if (primaryControl) return primaryControl;
    }
    const certificateDetail = parseCertificateDetailFieldKey(fieldKey);
    if (certificateDetail) {
        const certificateControl = findCertificateDetailControl(documentRef, certificateDetail, value, options.relatedValues ?? [], options.sourceControl);
        if (certificateControl) return certificateControl;
    }
    const controls = sortElementsInDocumentOrder(Array.from(new Set([
        ...getApplicationFormElements(documentRef, 'input, textarea, select').filter(isFillableControl),
        ...getApplicationFormElements(documentRef, '[role="combobox"], [aria-haspopup="listbox"], [aria-haspopup="true"], button[type="button"], button:not([type]), [tabindex]:not(input):not(textarea):not(select)').filter(isCustomSelectLikeControl),
        ...getApplicationFormElements(documentRef, 'input[type="radio"], input[type="checkbox"], button[type="button"], button:not([type]), [role="button"], [role="radio"], [role="checkbox"], [role="switch"], [aria-pressed], [aria-selected], [data-value], [data-option]').filter(isChoiceButtonCandidate)
    ])));
    return controls.find((control) => {
        if (isTopLevelEducationMajorCategoryFieldKey(fieldKey) && closestEducationMajorEntry(control)) return false;
        const tagName = control.tagName.toLowerCase();
        const context = ['input', 'textarea', 'select'].includes(tagName)
            ? collectControlText(control)
            : isCustomSelectLikeControl(control)
                ? collectCustomSelectText(control)
                : collectChoiceText(control, choiceCandidateText(control));
        const directKey = directFieldKeyForControl(control, context) || directFieldKeyFromText(choiceElementText(control)) || directFieldKeyFromText(context.displayLabel);
        if (directKey === fieldKey) return true;
        if (isIndexedRepeatedFieldKey(fieldKey) && isRepeatedWildcardFieldKey(directKey)) {
            return indexedRepeatedFieldKeyForControl(control, directKey) === fieldKey;
        }
        const scopedContext = {
            ...context,
            normalized: normalize([context.normalized, educationSectionContextText(control)].filter(Boolean).join(' '))
        };
        if (educationWildcardControlMatchesFieldKey(fieldKey, directKey, scopedContext)) return true;
        const match = directKey ? findDirectValueMatch([{ key: fieldKey, label: fieldKey, value: fieldKey, terms: [] }], directKey, scopedContext, control) : null;
        return match?.key === fieldKey;
    }) ?? null;
}

function isTopLevelEducationMajorCategoryFieldKey(fieldKey) {
    return /^education\.(?:universities|graduateSchools)\.\d+\.majorCategory$/.test(String(fieldKey ?? ''));
}

function sortElementsInDocumentOrder(elements) {
    return elements.sort((left, right) => {
        if (left === right) return 0;
        const position = left.compareDocumentPosition?.(right) ?? 0;
        if (position & Node.DOCUMENT_POSITION_FOLLOWING) return -1;
        if (position & Node.DOCUMENT_POSITION_PRECEDING) return 1;
        return 0;
    });
}

function educationWildcardControlMatchesFieldKey(fieldKey, directKey, context = {}) {
    const directMatch = String(directKey ?? '').match(/^education\.\*\.([^.]+)$/);
    const targetMatch = String(fieldKey ?? '').match(/^education\.(highSchool|universities|graduateSchools)(?:\.(\d+))?\.([^.]+)$/);
    if (!directMatch || !targetMatch || directMatch[1] !== targetMatch[3]) return false;
    const group = educationGroupFromContext(context.normalized ?? '');
    return group === targetMatch[1];
}

function isIndexedRepeatedFieldKey(fieldKey) {
    return /^(?:certificates\.(?:certificates|languageTests)|career\.careers)\.\d+\./.test(String(fieldKey ?? ''));
}

function isRepeatedWildcardFieldKey(fieldKey) {
    return /^(?:certificates\.(?:certificates|languageTests)|career\.careers)\.\*\./.test(String(fieldKey ?? ''));
}

function parseCertificatePrimaryFieldKey(fieldKey) {
    const match = String(fieldKey ?? '').match(/^certificates\.(certificates|languageTests)\.(\d+)\.(certificateName|testName)$/);
    if (!match) return null;
    return { group: match[1], index: Number(match[2]), field: match[3] };
}

function parseCertificateDetailFieldKey(fieldKey) {
    const match = String(fieldKey ?? '').match(/^certificates\.(certificates|languageTests)\.(\d+)\.([^.]+)$/);
    if (!match) return null;
    if (!['registrationNumber', 'score', 'issuer', 'acquiredDate'].includes(match[3])) return null;
    return { group: match[1], index: Number(match[2]), field: match[3] };
}

function findCertificatePrimaryControl(documentRef, target, value = '') {
    if (!documentRef || !target) return null;
    if (certificateEntryForSelectedPrimary(documentRef, target.group, value)) return null;
    const fastSlot = certificatePrimarySlotsFast(documentRef, target.group)[target.index];
    if (fastSlot?.element && !fastSlot.selected && canFillControlForField(fastSlot.element, certificateFieldKey(target.group, target.field))) {
        const currentValue = cleanText(fastSlot.element.value || fastSlot.element.getAttribute?.('value') || choiceElementText(fastSlot.element));
        if (!currentValue || isPlaceholderProfileValue(currentValue) || certificatePrimaryValuesMatch(value, currentValue)) {
            return fastSlot.element;
        }
    }
    const wildcardKey = certificateFieldKey(target.group, target.field);
    const controls = Array.from(new Set([
        ...getApplicationFormElements(documentRef, 'input, textarea, select').filter(isFillableControl),
        ...getApplicationFormElements(documentRef, '[role="combobox"], [aria-haspopup="listbox"], [aria-haspopup="true"], button[type="button"], button:not([type]), [tabindex]:not(input):not(textarea):not(select)').filter(isCustomSelectLikeControl)
    ]));
    const matches = controls
        .filter((control) => repeatedWildcardKeyForControl(control, wildcardKey) === wildcardKey)
        .filter((control) => certificateRecordIndexForControl(control, wildcardKey, target.field) === target.index);
    return matches.find((control) => {
        const currentValue = cleanText(control.value || control.getAttribute?.('value') || choiceCandidateText(control) || choiceElementText(control));
        if (currentValue && !isPlaceholderProfileValue(currentValue) && !certificatePrimaryValuesMatch(value, currentValue)) return false;
        const entry = closestCertificateEntry(control, wildcardKey);
        return !entry || !selectedCertificatePrimaryTextFromEntry(entry);
    }) ?? null;
}

function findCertificateDetailControl(documentRef, target, value = '', relatedValues = [], sourceControl = null) {
    if (!documentRef || !target) return null;
    const wildcardKey = certificateFieldKey(target.group, target.field);
    const expectedPrimary = expectedCertificatePrimaryValueForTarget(target, relatedValues);
    const sourceEntryControl = findCertificateDetailControlNearSource(sourceControl, target, value, expectedPrimary);
    if (sourceEntryControl) return sourceEntryControl;
    if (sourceControl && !sourceControl.isConnected) {
        const disconnectedIndexedControl = findIndexedCertificateDetailControl(documentRef, target, wildcardKey);
        if (disconnectedIndexedControl) return disconnectedIndexedControl;
        const disconnectedExplicitControl = target.field === 'acquiredDate'
            ? certificateFieldControlInExplicitIndexedEntry(documentRef, target, wildcardKey, value)
            : null;
        if (disconnectedExplicitControl) return disconnectedExplicitControl;
    }
    const selectedEntry = expectedPrimary ? certificateEntryForSelectedPrimary(documentRef, target.group, expectedPrimary) : null;
    const selectedEntryControl = certificateFieldControlInEntry(selectedEntry, wildcardKey, value);
    if (selectedEntryControl) return selectedEntryControl;
    const indexedControl = findIndexedCertificateDetailControl(documentRef, target, wildcardKey);
    if (indexedControl) return indexedControl;
    const explicitIndexedEntryControl = target.field === 'acquiredDate'
        ? certificateFieldControlInExplicitIndexedEntry(documentRef, target, wildcardKey, value)
        : null;
    if (explicitIndexedEntryControl) return explicitIndexedEntryControl;
    const controls = Array.from(new Set([
        ...getApplicationFormElements(documentRef, 'input, textarea, select').filter((control) => isCertificateDetailInputCandidate(control, wildcardKey)),
        ...getApplicationFormElements(documentRef, '[role="combobox"], [aria-haspopup="listbox"], [aria-haspopup="true"], button[type="button"], button:not([type]), [tabindex]:not(input):not(textarea):not(select)').filter(isCustomSelectLikeControl),
        ...getApplicationFormElements(documentRef, 'input[type="radio"], input[type="checkbox"], button[type="button"], button:not([type]), [role="button"], [role="radio"], [role="checkbox"], [role="switch"], [aria-pressed], [aria-selected], [data-value], [data-option]').filter(isChoiceButtonCandidate),
        ...getApplicationFormElements(documentRef, 'button[type="button"], button:not([type]), [role="button"]').filter((control) => !isIconOnlyActionButton(control) && !isActionButtonControl(control))
    ]));
    const matches = controls.filter((control) => {
        const tagName = control.tagName.toLowerCase();
        const context = ['input', 'textarea', 'select'].includes(tagName)
            ? collectControlText(control)
            : isCustomSelectLikeControl(control)
                ? collectCustomSelectText(control)
                : collectChoiceText(control, choiceCandidateText(control));
        const directKey = directFieldKeyForControl(control, context) ||
            directFieldKeyFromText(choiceElementText(control)) ||
            directFieldKeyFromText(context.displayLabel);
        return directKey === wildcardKey || repeatedWildcardKeyForControl(control, wildcardKey) === wildcardKey;
    });
    const indexedMatches = matches.filter((control) => certificateRecordIndexForControl(control, wildcardKey, target.field) === target.index);
    if (expectedPrimary) {
        const normalizedValue = normalize(value);
        return indexedMatches.find((control) => {
            if (!normalizedValue) return false;
            const text = normalize(choiceCandidateText(control) || choiceElementText(control));
            const optionValue = normalize(control.getAttribute?.('data-value') || control.getAttribute?.('data-option') || control.getAttribute?.('value'));
            return text === normalizedValue || optionValue === normalizedValue;
        }) ?? indexedMatches[0] ?? null;
    }
    const rowMatches = indexedMatches.length ? indexedMatches : (target.index === 0 ? matches : []);
    const normalizedValue = normalize(value);
    return rowMatches.find((control) => {
        if (!normalizedValue) return false;
        const text = normalize(choiceCandidateText(control) || choiceElementText(control));
        const optionValue = normalize(control.getAttribute?.('data-value') || control.getAttribute?.('data-option') || control.getAttribute?.('value'));
        return text === normalizedValue || optionValue === normalizedValue;
    }) ?? rowMatches[0] ?? null;
}

function certificateFieldControlInExplicitIndexedEntry(documentRef, target, wildcardKey, value = '') {
    const entry = certificateExplicitIndexedEntry(documentRef, target, wildcardKey);
    return certificateFieldControlInEntry(entry, wildcardKey, value);
}

function certificateExplicitIndexedEntry(documentRef, target, wildcardKey) {
    if (!documentRef || !target || target.index < 0) return null;
    const fields = target.group === 'languageTests'
        ? ['testName', 'score', 'registrationNumber', 'acquiredDate']
        : ['certificateName', 'issuer', 'registrationNumber', 'acquiredDate'];
    const controls = getApplicationFormElements(documentRef, 'input, textarea, select, button[type="button"], button:not([type]), [role="button"], [aria-haspopup]');
    for (const field of fields) {
        const siblingWildcardKey = certificateFieldKey(target.group, field);
        const indexedSibling = controls.find((control) => certificateExplicitRecordIndexForControl(control, siblingWildcardKey) === target.index);
        if (!indexedSibling) continue;
        const entry = closestCertificateEntry(indexedSibling, siblingWildcardKey);
        if (entry && entry !== documentRef && certificateFieldControlInEntry(entry, wildcardKey)) return entry;
    }
    return null;
}

function findIndexedCertificateDetailControl(documentRef, target, wildcardKey) {
    if (!documentRef || !target || target.index < 0) return null;
    const controls = getApplicationFormElements(documentRef, 'input, textarea, select, button[type="button"], button:not([type]), [role="button"], [aria-haspopup]')
        .filter((control) => !isHiddenElement(control))
        .filter((control) => isCertificateDetailInputCandidate(control, wildcardKey) || isCustomSelectLikeControl(control) || isChoiceButtonCandidate(control));
    return controls.find((control) => indexedCertificateDetailControlMatches(control, target)) ?? null;
}

function fastIndexedCertificateDetailFieldKeyForControl(control, values = []) {
    const signature = normalize([
        control?.getAttribute?.('name'),
        control?.id,
        control?.getAttribute?.('data-field'),
        control?.getAttribute?.('data-testid'),
        control?.getAttribute?.('aria-label'),
        control?.getAttribute?.('placeholder')
    ].filter(Boolean).join(' '));
    if (!signature || !(signature.includes('license') || signature.includes('certificate') || signature.includes('cert'))) return null;
    const fields = ['issuer', 'registrationNumber', 'acquiredDate'];
    for (const field of fields) {
        if (!certificateDetailSignatureHasField(signature, field)) continue;
        const wildcardKey = certificateFieldKey('certificates', field);
        if (shouldDeferCertificateDetailUntilPrimarySelection(control, wildcardKey)) return null;
        const selectedEntry = closestExplicitCertificateEntry(control) ?? closestCertificateEntry(control, wildcardKey);
        const selectedPrimary = selectedCertificatePrimaryTextFromEntry(selectedEntry);
        if (selectedPrimary) return null;
        const index = fastCertificateDetailIndexFromSignature(signature, field);
        if (index == null) return null;
        return `certificates.certificates.${index}.${field}`;
    }
    return null;
}

function closestExplicitCertificateEntry(control) {
    return control?.closest?.('.certificate-row, [data-testid*="license"], [data-testid*="certificate"], [class*="license"], [class*="certificate"]') ?? null;
}

function fastCertificateDetailIndexFromSignature(signature, field) {
    const aliases = certificateDetailFieldSignatureAliases(field);
    for (const alias of aliases) {
        const after = signature.match(new RegExp(`${escapeRegExp(alias)}(\\d+)`));
        if (after) return Number(after[1]);
        const before = signature.match(new RegExp(`(\\d+)${escapeRegExp(alias)}`));
        if (before) return Number(before[1]);
    }
    const answer = signature.match(/(?:licenseanswers?|answers?)(\d+)/);
    if (answer) return Number(answer[1]);
    return null;
}

function escapeRegExp(value) {
    return String(value ?? '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function indexedCertificateDetailControlMatches(control, target) {
    const signature = normalize([
        control?.getAttribute?.('name'),
        control?.id,
        control?.getAttribute?.('data-field'),
        control?.getAttribute?.('data-testid'),
        control?.getAttribute?.('aria-label'),
        control?.getAttribute?.('placeholder')
    ].filter(Boolean).join(' '));
    if (!signature || !certificateDetailSignatureHasField(signature, target.field)) return false;
    return certificateDetailSignatureHasIndex(signature, target.index, target.field);
}

function certificateDetailSignatureHasIndex(signature, index, field = '') {
    const normalizedIndex = String(index);
    const fieldAliases = certificateDetailFieldSignatureAliases(field);
    if (fieldAliases.some((alias) => signature.includes(`${alias}${normalizedIndex}`) || signature.includes(`${normalizedIndex}${alias}`))) {
        return true;
    }
    return signature.includes(`licenseanswers${normalizedIndex}`) ||
        signature.includes(`answers${normalizedIndex}`) ||
        signature.includes(`certificate${normalizedIndex}`) ||
        signature.includes(`certificates${normalizedIndex}`) ||
        signature.includes(`license${normalizedIndex}`) ||
        (signature.includes(normalizedIndex) && (
            signature.includes('license') ||
            signature.includes('certificate') ||
            signature.includes('cert')
        ));
}

function certificateDetailSignatureHasField(signature, field) {
    return certificateDetailFieldSignatureAliases(field).some((alias) => signature.includes(alias));
}

function certificateDetailFieldSignatureAliases(field) {
    if (field === 'issuer') return ['organization', 'issuer', 'institution', normalize('\uBC1C\uAE09\uAE30\uAD00')];
    if (field === 'registrationNumber') return ['registnumber', 'registrationnumber', 'licensenumber', normalize('\uB4F1\uB85D\uBC88\uD638')];
    if (field === 'acquiredDate') return ['acquire', 'acquired', 'date', normalize('\uCDE8\uB4DD\uC77C')];
    return [];
}

function findCertificateDetailControlNearSource(sourceControl, target, value = '', expectedPrimary = '') {
    if (!sourceControl || !target || !expectedPrimary) return null;
    const sourceValue = cleanText(sourceControl.value || sourceControl.getAttribute?.('value') || choiceCandidateText(sourceControl) || choiceElementText(sourceControl));
    if (!certificatePrimaryValuesMatch(expectedPrimary, sourceValue)) return null;
    const wildcardKey = certificateFieldKey(target.group, target.field);
    const sourceEntry = closestCertificateSourceEntry(sourceControl, target.group);
    if (sourceEntry) {
        const selectedPrimary = selectedCertificatePrimaryTextFromEntry(sourceEntry);
        if (selectedPrimary && !certificatePrimaryValuesMatch(expectedPrimary, selectedPrimary)) return null;
        return certificateFieldControlInEntry(sourceEntry, wildcardKey, value);
    }
    let current = sourceControl.parentElement;
    let depth = 0;
    while (current && current !== sourceControl.ownerDocument.body && depth < 8) {
        const control = certificateFieldControlInEntry(current, wildcardKey, value);
        if (control) return control;
        current = current.parentElement;
        depth += 1;
    }
    return null;
}

function closestCertificateSourceEntry(sourceControl, group) {
    if (!sourceControl || !group) return null;
    const primaryWildcardKey = certificateFieldKey(group, certificatePrimaryFieldForGroup(group));
    const groupPrefix = `certificates.${group}.*.`;
    let current = sourceControl.parentElement;
    let fallbackEntry = null;
    let depth = 0;
    while (current && current !== sourceControl.ownerDocument.body && depth < 8) {
        const controls = Array.from(current.querySelectorAll?.('input, textarea, select, button[type="button"], button:not([type]), [role="button"], [aria-haspopup]') ?? [])
            .filter((candidate) => !isHiddenElement(candidate))
            .filter((candidate) => {
                const key = repeatedCertificateGroupWildcardKeyForControl(candidate, group);
                return key?.startsWith(groupPrefix);
            });
        const containsSourcePrimary = controls.includes(sourceControl);
        if (containsSourcePrimary) {
            const hasOtherPrimaryControl = controls.some((candidate) => candidate !== sourceControl && isCertificatePrimaryFieldKey(repeatedWildcardKeyForControl(candidate, primaryWildcardKey)));
            const hasDetailControl = controls.some((candidate) => {
                const key = repeatedCertificateGroupWildcardKeyForControl(candidate, group);
                return key && !isCertificatePrimaryFieldKey(key);
            });
            if (hasOtherPrimaryControl) return fallbackEntry;
            if (hasDetailControl || isLikelyCertificateEntryContainer(current)) return current;
            fallbackEntry = current;
        }
        current = current.parentElement;
        depth += 1;
    }
    return fallbackEntry;
}

function repeatedCertificateGroupWildcardKeyForControl(control, group) {
    const fields = group === 'languageTests'
        ? ['testName', 'score', 'registrationNumber', 'acquiredDate']
        : ['certificateName', 'issuer', 'registrationNumber', 'acquiredDate'];
    for (const field of fields) {
        const key = repeatedWildcardKeyForControl(control, certificateFieldKey(group, field));
        if (key?.startsWith(`certificates.${group}.*.`)) return key;
    }
    return '';
}

function isLikelyCertificateEntryContainer(element) {
    const signature = normalize([
        element?.className,
        element?.id,
        element?.getAttribute?.('data-testid'),
        element?.getAttribute?.('data-field')
    ].filter(Boolean).join(' '));
    return signature.includes('certificaterow') ||
        signature.includes('certificateresumeitem') ||
        signature.includes('licenseanswer') ||
        signature.includes('licenseitem') ||
        signature.includes('row');
}

function certificateFieldControlInEntry(entry, wildcardKey, value = '') {
    if (!entry) return null;
    const controls = Array.from(new Set([
        ...Array.from(entry.querySelectorAll('input, textarea, select')).filter((control) => isCertificateDetailInputCandidate(control, wildcardKey)),
        ...Array.from(entry.querySelectorAll('[role="combobox"], [aria-haspopup="listbox"], [aria-haspopup="true"], button[type="button"], button:not([type]), [tabindex]:not(input):not(textarea):not(select)')).filter(isCustomSelectLikeControl),
        ...Array.from(entry.querySelectorAll('input[type="radio"], input[type="checkbox"], button[type="button"], button:not([type]), [role="button"], [role="radio"], [role="checkbox"], [role="switch"], [aria-pressed], [aria-selected], [data-value], [data-option]')).filter(isChoiceButtonCandidate)
    ]));
    const matches = controls.filter((control) => repeatedWildcardKeyForControl(control, wildcardKey) === wildcardKey);
    const normalizedValue = normalize(value);
    return matches.find((control) => {
        if (!normalizedValue) return false;
        const text = normalize(choiceCandidateText(control) || choiceElementText(control));
        const optionValue = normalize(control.getAttribute?.('data-value') || control.getAttribute?.('data-option') || control.getAttribute?.('value'));
        return text === normalizedValue || optionValue === normalizedValue;
    }) ?? matches[0] ?? null;
}

function isCertificateDetailInputCandidate(control, wildcardKey) {
    return isFillableControl(control) || canFillReadonlyControlForField(control, wildcardKey);
}

function shouldDeferCertificateDetailUntilPrimarySelection(control, directKey) {
    const match = String(directKey ?? '').match(/^certificates\.(certificates|languageTests)\.\*\.(score|registrationNumber|issuer|acquiredDate)$/);
    if (!match) return false;
    const group = match[1];
    if (group !== 'certificates') return false;
    const primaryWildcardKey = certificateFieldKey(group, certificatePrimaryFieldForGroup(group));
    return Boolean(closestPendingCertificateAutocompleteEntry(control, primaryWildcardKey));
}

function closestPendingCertificateAutocompleteEntry(control, primaryWildcardKey) {
    let current = control?.parentElement;
    let depth = 0;
    while (current && current !== control.ownerDocument.body && depth < 8) {
        const primaryControls = certificatePrimaryControlsInEntry(current, primaryWildcardKey);
        if (primaryControls.some((candidate) => isAutocompleteSearchControlForField(candidate, repeatedWildcardKeyForControl(candidate, primaryWildcardKey)))) {
            return hasCommittedCertificatePrimaryInEntry(current, primaryWildcardKey) ? null : current;
        }
        current = current.parentElement;
        depth += 1;
    }
    return null;
}

function certificatePrimaryControlsInEntry(entry, primaryWildcardKey) {
    return Array.from(entry?.querySelectorAll?.('input, textarea, select, [role="combobox"], [aria-haspopup="listbox"], [aria-haspopup="true"], button[type="button"], button:not([type]), [role="button"]') ?? [])
        .filter((candidate) => !candidate.closest?.('#dropdown-body, [role="listbox"]'))
        .filter((candidate) => isCertificatePrimaryFieldKey(repeatedWildcardKeyForControl(candidate, primaryWildcardKey)));
}

function hasCommittedCertificatePrimaryInEntry(entry, primaryWildcardKey) {
    return certificatePrimaryControlsInEntry(entry, primaryWildcardKey).some((control) => {
        const key = repeatedWildcardKeyForControl(control, primaryWildcardKey);
        if (['input', 'textarea'].includes(control.tagName?.toLowerCase())) {
            return !isAutocompleteSearchControlForField(control, key) &&
                cleanText(control.value || control.getAttribute?.('value')) &&
                !isPlaceholderProfileValue(control.value || control.getAttribute?.('value'));
        }
        const text = cleanText(choiceCandidateText(control) || choiceElementText(control));
        return text && !isPlaceholderProfileValue(text);
    });
}

function expectedCertificatePrimaryValueForTarget(target, relatedValues = []) {
    if (!target) return '';
    const primaryField = certificatePrimaryFieldForGroup(target.group);
    const key = `certificates.${target.group}.${target.index}.${primaryField}`;
    return cleanText((relatedValues ?? []).find((value) => value?.key === key)?.value) ?? '';
}

function certificatePrimaryFieldForGroup(group) {
    return group === 'languageTests' ? 'testName' : 'certificateName';
}

function isCertificatePrimaryWildcardField(group, field) {
    return certificatePrimaryFieldForGroup(group) === field;
}

function certificateSelectedPrimaryMatchForControl(values, control, group, field) {
    const wildcardKey = certificateFieldKey(group, field);
    const entry = closestCertificateEntry(control, wildcardKey);
    const selectedName = selectedCertificatePrimaryTextFromEntry(entry);
    if (!selectedName) return null;
    return values.find((value) => {
        if (!value.key.startsWith(`certificates.${group}.`) || !value.key.endsWith(`.${field}`)) return false;
        return certificatePrimaryValuesMatch(value.value, selectedName);
    }) ?? null;
}

function certificateSelectedDetailMatchForControl(values, control, group, field) {
    const wildcardKey = certificateFieldKey(group, field);
    const entry = closestCertificateEntry(control, wildcardKey);
    const selectedName = selectedCertificatePrimaryTextFromEntry(entry);
    if (!selectedName) return null;
    const primaryField = certificatePrimaryFieldForGroup(group);
    const primaryMatch = values.find((value) => (
        value.key.startsWith(`certificates.${group}.`) &&
        value.key.endsWith(`.${primaryField}`) &&
        certificatePrimaryValuesMatch(value.value, selectedName)
    ));
    const index = primaryMatch?.key.match(new RegExp(`^certificates\\.${group}\\.(\\d+)\\.${primaryField}$`))?.[1];
    if (index == null) return null;
    return values.find((value) => value.key === `certificates.${group}.${index}.${field}`) ?? null;
}

function certificateControlHasUnmatchedSelectedPrimary(values, control, group, field) {
    const wildcardKey = certificateFieldKey(group, field);
    const entry = closestCertificateEntry(control, wildcardKey);
    const selectedName = selectedCertificatePrimaryTextFromEntry(entry);
    if (!selectedName) return false;
    const primaryField = certificatePrimaryFieldForGroup(group);
    return !values.some((value) => (
        value.key.startsWith(`certificates.${group}.`) &&
        value.key.endsWith(`.${primaryField}`) &&
        certificatePrimaryValuesMatch(value.value, selectedName)
    ));
}

function certificateUnselectedPrimaryMatch(values, documentRef, group, field) {
    return values.find((value) => (
        value.key.startsWith(`certificates.${group}.`) &&
        value.key.endsWith(`.${field}`) &&
        !certificatePrimarySelectionExists(documentRef, value.key, value.value)
    )) ?? null;
}

function certificateEntryForSelectedPrimary(documentRef, group, primaryValue = '') {
    const normalizedExpected = normalize(primaryValue);
    if (!documentRef || !normalizedExpected) return null;
    const wildcardKey = certificateFieldKey(group, certificatePrimaryFieldForGroup(group));
    const entries = certificateEntryCandidatesForGroup(documentRef, group, wildcardKey);
    return entries.find((entry) => {
        return certificatePrimaryValuesMatch(primaryValue, selectedCertificatePrimaryTextFromEntry(entry));
    }) ?? null;
}

function certificatePrimaryValuesMatch(expectedValue = '', selectedValue = '') {
    const normalizedExpected = normalize(expectedValue);
    const normalizedSelected = normalize(selectedValue);
    const normalizedExpectedKeyword = normalize(certificatePrimarySearchKeyword(expectedValue));
    const normalizedSelectedKeyword = normalize(certificatePrimarySearchKeyword(selectedValue));
    return Boolean(normalizedExpected && normalizedSelected) &&
        (normalizedExpected === normalizedSelected ||
            normalizedExpected.includes(normalizedSelected) ||
            normalizedSelected.includes(normalizedExpected) ||
            Boolean(normalizedExpectedKeyword && normalizedExpectedKeyword === normalizedSelected) ||
            Boolean(normalizedSelectedKeyword && normalizedSelectedKeyword === normalizedExpected));
}

function closestCertificateSectionForGroup(documentRef, group) {
    return Array.from(documentRef.querySelectorAll('section, fieldset, [role="region"], article, div'))
        .find((element) => certificateGroupFromContext(normalize([
            element.getAttribute?.('aria-label'),
            element.querySelector?.('h1, h2, h3, h4, h5, legend')?.textContent
        ].filter(Boolean).join(' '))) === group) ?? null;
}

function selectedCertificatePrimaryTextFromEntry(entry) {
    if (!entry) return '';
    const primaryControls = Array.from(entry.querySelectorAll?.('input, textarea, select, [role="combobox"], [aria-haspopup="listbox"], [aria-haspopup="true"], button[type="button"], button:not([type])') ?? [])
        .filter((candidate) => !isHiddenElement(candidate))
        .filter((candidate) => !candidate.closest?.('#dropdown-body, [role="listbox"]'))
        .filter((candidate) => {
            const certificateKey = repeatedWildcardKeyForControl(candidate, 'certificates.certificates.*.certificateName');
            const languageKey = repeatedWildcardKeyForControl(candidate, 'certificates.languageTests.*.testName');
            return isCertificatePrimaryFieldKey(certificateKey) || isCertificatePrimaryFieldKey(languageKey);
        });
    for (const control of primaryControls) {
        const tagName = control.tagName?.toLowerCase();
        const certificateKey = repeatedWildcardKeyForControl(control, 'certificates.certificates.*.certificateName');
        const languageKey = repeatedWildcardKeyForControl(control, 'certificates.languageTests.*.testName');
        const primaryKey = isCertificatePrimaryFieldKey(certificateKey) ? certificateKey : languageKey;
        if (['input', 'textarea'].includes(tagName) && isAutocompleteSearchControlForField(control, primaryKey)) {
            continue;
        }
        const value = ['input', 'textarea', 'select'].includes(tagName)
            ? cleanText(control.value || control.getAttribute?.('value'))
            : cleanText(choiceCandidateText(control) || choiceElementText(control));
        if (value && !isPlaceholderProfileValue(value)) return stripRemovableChipSuffix(value);
    }
    const exactChip = cleanText(entry.querySelector?.('.remix-css-zezw7x')?.textContent);
    if (exactChip && !isPlaceholderProfileValue(exactChip)) return stripRemovableChipSuffix(exactChip);
    const chipCandidates = Array.from(entry.querySelectorAll('button, [role="button"], div, span, p'))
        .filter((candidate) => candidate !== entry && !candidate.closest?.('#dropdown-body, [role="listbox"]') && !candidate.querySelector?.('input, textarea, select'));
    for (const candidate of chipCandidates) {
        const text = cleanText(candidate.textContent);
        if (!isSelectedCertificatePrimaryTextCandidate(candidate, text)) continue;
        if (candidate.querySelector?.('svg, path') || normalize(candidate.className).includes('zezw7x')) {
            return stripRemovableChipSuffix(text);
        }
        if (!candidate.closest?.('[role="listbox"], #dropdown-body')) return stripRemovableChipSuffix(text);
    }
    return '';
}

function isSelectedCertificatePrimaryTextCandidate(candidate, text = '') {
    if (!candidate || candidate.closest?.('[role="listbox"], #dropdown-body')) return false;
    if (!text || text.length > 80 || isPlaceholderProfileValue(text) || isChoiceText(text)) return false;
    const normalized = normalize(text);
    if (!normalized) return false;
    const rejectedTerms = [
        normalize('\uc790\uaca9/\uc9c0\uc2dd/\uae30\uc220'),
        normalize('\uc790\uaca9\uc99d\uba85'),
        normalize('\uc790\uaca9\uba85'),
        normalize('\uc790\uaca9\uc99d'),
        normalize('\uac80\uc0c9'),
        normalize('\ucd94\uac00'),
        normalize('\ub4f1\ub85d\ubc88\ud638'),
        normalize('\uc790\uaca9\ubc88\ud638'),
        normalize('\ubc1c\uae09\uae30\uad00'),
        normalize('\uc2dc\ud589\uae30\uad00'),
        normalize('\ucde8\ub4dd\uc77c'),
        normalize('\uc2dc\ud5d8\uc77c'),
        normalize('\uc810\uc218'),
        normalize('\ub4f1\uae09')
    ];
    if (rejectedTerms.some((term) => normalized === term || normalized.includes(term))) return false;
    if (ACTION_BUTTON_TERMS.some((term) => normalized === term || normalized.includes(term))) return false;
    return true;
}

function isDeferredLanguageScoreSelectControl(control, item = {}) {
    return /^certificates\.languageTests\.\d+\.score$/.test(String(item.fieldKey ?? '')) &&
        isButtonLikeChoiceControl(control) &&
        !isActionButtonControl(control);
}

function parseNestedEducationMajorFieldKey(fieldKey) {
    const match = String(fieldKey ?? '').match(/^education\.(universities|graduateSchools)\.(\d+)\.majors\.(\d+)\.([^.]+)$/);
    if (!match || !EDUCATION_MAJOR_DETAIL_FIELDS.has(match[4])) return null;
    return {
        group: match[1],
        educationIndex: Number(match[2]),
        majorIndex: Number(match[3]),
        field: match[4]
    };
}

function findNestedEducationMajorControl(documentRef, target, value = '', options = {}) {
    const expectedMajorName = expectedEducationMajorNameForTarget(target, options.relatedValues);
    if (target.field === 'majorName') {
        const majorEntry = educationMajorEntryForTarget(documentRef, target, value);
        if (!majorEntry || educationMajorEntryHasDifferentSelectedName(majorEntry, value)) return null;
        const nameInput = educationMajorNameInputInEntry(majorEntry);
        if (nameInput && !isEffectivelyDisabled(nameInput) && !nameInput.readOnly) return nameInput;
    }
    const namedEntry = expectedMajorName
        ? educationMajorEntryForExpectedName(documentRef, expectedMajorName) ?? educationMajorEntryForTarget(documentRef, target, expectedMajorName)
        : null;
    const namedEntryControl = namedEntry ? educationMajorFieldControlInEntry(namedEntry, target.field, value) : null;
    if (namedEntryControl) return namedEntryControl;
    const directKey = `education.${target.group}.${target.educationIndex}.majors.${target.majorIndex}.${target.field}`;
    const wildcardKey = `education.${target.group}.*.majors.${target.majorIndex}.${target.field}`;
    const legacyGroupKey = `education.${target.group}.${target.educationIndex}.${target.field}`;
    const broadWildcardKey = `education.*.${target.field}`;
    const controls = Array.from(new Set([
        ...getApplicationFormElements(documentRef, 'input, textarea, select').filter(isFillableControl),
        ...getApplicationFormElements(documentRef, '[role="combobox"], [aria-haspopup="listbox"], [aria-haspopup="true"], button[type="button"], button:not([type]), [tabindex]:not(input):not(textarea):not(select)').filter(isCustomSelectLikeControl),
        ...getApplicationFormElements(documentRef, 'input[type="radio"], input[type="checkbox"], button[type="button"], button:not([type]), [role="button"], [role="radio"], [role="checkbox"], [role="switch"], [aria-pressed], [aria-selected], [data-value], [data-option]').filter(isChoiceButtonCandidate)
    ]));
    const matches = controls.filter((control) => {
        const majorEntry = closestEducationMajorEntry(control);
        if (!majorEntry) return false;
        if (!educationMajorEntryIsUsableForTarget(majorEntry, target, expectedMajorName)) return false;
        if (target.field === 'majorName' && educationMajorEntryHasDifferentSelectedName(majorEntry, value)) return false;
        const tagName = control.tagName.toLowerCase();
        const context = ['input', 'textarea', 'select'].includes(tagName)
            ? collectControlText(control)
            : isCustomSelectLikeControl(control)
                ? collectCustomSelectText(control)
                : collectChoiceText(control, choiceCandidateText(control));
        const key = directFieldKeyForControl(control, context) || directFieldKeyFromText(choiceElementText(control)) || directFieldKeyFromText(context.displayLabel);
        if (key === directKey || key === wildcardKey || key === legacyGroupKey || key === broadWildcardKey) return true;
        if (target.field === 'majorCategory') {
            const normalizedContext = normalize([
                choiceElementText(control),
                context.displayLabel,
                context.nearby
            ].filter(Boolean).join(' '));
            if (normalizedContext.includes(normalize('\uacc4\uc5f4')) &&
                !normalizedContext.includes(normalize('\ud559\uad50\uc815\ubcf4')) &&
                !normalizedContext.includes(normalize('\ud559\uad50\uba85'))) {
                return true;
            }
        }
        const match = key ? findDirectValueMatch([{ key: directKey, label: directKey, value: directKey, terms: [] }], key, context, control) : null;
        return match?.key === directKey;
    });
    const groupedMatches = groupControlsByMajorEntry(matches);
    const rowMatches = expectedMajorName
        ? firstCompatibleMajorRowMatches(groupedMatches, expectedMajorName) ?? groupedMatches[0] ?? []
        : groupedMatches[target.majorIndex] ?? [];
    const normalizedValue = normalize(value);
    return rowMatches.find((control) => {
        const text = normalize(choiceCandidateText(control) || choiceElementText(control));
        const optionValue = normalize(control.getAttribute('data-value') || control.getAttribute('data-option') || control.getAttribute('value'));
        return normalizedValue && (text === normalizedValue || optionValue === normalizedValue);
    }) ?? rowMatches[0] ?? null;
}

function educationMajorFieldControlInEntry(entry, field, value = '') {
    if (!entry || !EDUCATION_MAJOR_DETAIL_FIELDS.has(field) || field === 'majorName') return null;
    const controls = Array.from(new Set([
        ...Array.from(entry.querySelectorAll('input, textarea, select')).filter(isFillableControl),
        ...Array.from(entry.querySelectorAll('[role="combobox"], [aria-haspopup="listbox"], [aria-haspopup="true"], button[type="button"], button:not([type]), [tabindex]:not(input):not(textarea):not(select)')).filter(isCustomSelectLikeControl),
        ...Array.from(entry.querySelectorAll('input[type="radio"], input[type="checkbox"], button[type="button"], button:not([type]), [role="button"], [role="radio"], [role="checkbox"], [role="switch"], [aria-pressed], [aria-selected], [data-value], [data-option]')).filter(isChoiceButtonCandidate)
    ]));
    const normalizedValue = normalize(value);
    return controls.find((control) => educationMajorControlMatchesField(control, field, normalizedValue)) ?? null;
}

function educationMajorControlMatchesField(control, field, normalizedValue = '') {
    const tagName = control.tagName.toLowerCase();
    const context = ['input', 'textarea', 'select'].includes(tagName)
        ? collectControlText(control)
        : isCustomSelectLikeControl(control)
            ? collectCustomSelectText(control)
            : collectChoiceText(control, choiceCandidateText(control));
    const ownText = normalize(choiceCandidateText(control) || choiceElementText(control));
    const text = normalize([
        choiceElementText(control),
        context.displayLabel,
        control.getAttribute?.('placeholder'),
        control.getAttribute?.('aria-label'),
        control.getAttribute?.('name'),
        control.id
    ].filter(Boolean).join(' '));
    if (normalizedValue) {
        const optionValue = normalize(control.getAttribute?.('data-value') || control.getAttribute?.('data-option') || control.getAttribute?.('value'));
        if (ownText === normalizedValue || optionValue === normalizedValue) return true;
    }
    if (normalizedValue && ['majorType', 'dayNight'].includes(field) && !isCustomSelectLikeControl(control)) return false;
    if (field === 'majorCategory') return text.includes(normalize('\uc804\uacf5\uacc4\uc5f4')) || text.includes(normalize('\ud559\uacfc\uacc4\uc5f4')) || text.includes('majorcategory');
    if (field === 'majorType') return text.includes(normalize('\uc804\uacf5\uad6c\ubd84')) || text.includes('majortype') || isChoiceText(choiceCandidateText(control));
    if (field === 'dayNight') return text.includes(normalize('\uc8fc\uac04')) || text.includes(normalize('\uc57c\uac04')) || text.includes('daynight');
    return false;
}

function expectedEducationMajorNameForTarget(target, relatedValues = []) {
    if (!target || !Array.isArray(relatedValues)) return '';
    const baseKey = `education.${target.group}.${target.educationIndex}.majors.${target.majorIndex}.majorName`;
    return cleanText(relatedValues.find((value) => value?.key === baseKey)?.value) ?? '';
}

function educationMajorEntryForExpectedName(documentRef, expectedMajorName = '') {
    const normalizedExpected = normalize(expectedMajorName);
    if (!documentRef || !normalizedExpected) return null;
    return educationMajorEntries(documentRef).find((entry) => {
        const normalizedSelected = normalize(selectedEducationMajorNameTextFromEntry(entry));
        return normalizedSelected &&
            (normalizedSelected === normalizedExpected ||
                normalizedSelected.includes(normalizedExpected) ||
                normalizedExpected.includes(normalizedSelected));
    }) ?? null;
}

function expectedEducationMajorNameForFieldKey(fieldKey, relatedValues = []) {
    const target = parseNestedEducationMajorFieldKey(fieldKey);
    return expectedEducationMajorNameForTarget(target, relatedValues);
}

function firstCompatibleMajorRowMatches(groupedMatches, expectedMajorName) {
    const normalizedExpected = normalize(expectedMajorName);
    if (!normalizedExpected) return null;
    return groupedMatches.find((matches) => {
        const entry = closestEducationMajorEntry(matches[0]);
        const selectedName = selectedEducationMajorNameTextFromEntry(entry);
        const normalizedSelected = normalize(selectedName);
        return normalizedSelected &&
            (normalizedSelected === normalizedExpected ||
                normalizedSelected.includes(normalizedExpected) ||
                normalizedExpected.includes(normalizedSelected));
    }) ?? null;
}

function educationMajorNameInputInEntry(entry) {
    return Array.from(entry?.querySelectorAll?.('input, textarea') ?? []).find((candidate) => {
        const signature = normalize([
            candidate.getAttribute('placeholder'),
            candidate.getAttribute('aria-label'),
            candidate.getAttribute('name'),
            candidate.id,
            candidate.closest?.('label')?.textContent
        ].filter(Boolean).join(' '));
        return signature.includes(normalize('\uc804\uacf5\uba85')) || signature.includes('majorname');
    }) ?? null;
}

function educationMajorEntryHasDifferentSelectedName(entry, value) {
    const selectedName = selectedEducationMajorNameTextFromEntry(entry);
    if (!selectedName) return false;
    const normalizedSelected = normalize(selectedName);
    const normalizedValue = normalize(value);
    if (!normalizedSelected || !normalizedValue) return false;
    return normalizedSelected !== normalizedValue &&
        !normalizedSelected.includes(normalizedValue) &&
        !normalizedValue.includes(normalizedSelected);
}

function educationMajorEntryExistsForFieldKey(documentRef, fieldKey, value = '') {
    return Boolean(educationMajorEntryForFieldKey(documentRef, fieldKey, value));
}

function educationMajorEntryForFieldKey(documentRef, fieldKey, value = '') {
    const target = parseNestedEducationMajorFieldKey(fieldKey);
    if (!target || !documentRef) return null;
    return educationMajorEntryForTarget(documentRef, target, target.field === 'majorName' ? value : '');
}

function educationMajorEntryForTarget(documentRef, target, expectedMajorName = '') {
    if (!target || !documentRef) return null;
    const entries = educationMajorEntriesForTarget(documentRef, target, expectedMajorName);
    if (expectedMajorName) return entries[0] ?? null;
    return entries[target.majorIndex] ?? null;
}

function educationMajorEntriesForTarget(documentRef, target, expectedMajorName = '') {
    return educationMajorEntries(documentRef).filter((entry, entryIndex) => educationMajorEntryIsUsableForTarget(entry, target, expectedMajorName, entryIndex));
}

function educationMajorEntryIsUsableForTarget(entry, target, expectedMajorName = '', entryIndex = -1) {
    if (!entry || !target) return false;
    const selectedName = selectedEducationMajorNameTextFromEntry(entry);
    if (selectedName) {
        if (!expectedMajorName) return true;
        const normalizedSelected = normalize(selectedName);
        const normalizedExpected = normalize(expectedMajorName);
        return normalizedSelected === normalizedExpected ||
            normalizedSelected.includes(normalizedExpected) ||
            normalizedExpected.includes(normalizedSelected);
    }
    const nameInput = educationMajorNameInputInEntry(entry);
    const inputValue = cleanText(nameInput?.value);
    if (inputValue && expectedMajorName) {
        const normalizedInput = normalize(inputValue);
        const normalizedExpected = normalize(expectedMajorName);
        if (normalizedInput !== normalizedExpected &&
            !normalizedInput.includes(normalizedExpected) &&
            !normalizedExpected.includes(normalizedInput)) {
            return false;
        }
    }
    if (expectedMajorName && entryIndex !== target.majorIndex) return false;
    return Boolean(nameInput && !isEffectivelyDisabled(nameInput) && !nameInput.readOnly);
}

function educationMajorDetailAlreadySelected(documentRef, fieldKey, value, relatedValues = []) {
    const target = parseNestedEducationMajorFieldKey(fieldKey);
    if (!target || !documentRef || !cleanText(value)) return false;
    if (!['majorCategory', 'majorType', 'dayNight'].includes(target.field)) return false;
    if (target.field !== 'majorCategory') return false;
    const expectedMajorName = expectedEducationMajorNameForTarget(target, relatedValues);
    const entries = educationMajorEntriesForTarget(documentRef, target, expectedMajorName);
    const normalizedValue = normalize(value);
    if (entries.some((entry) => {
        const text = normalize(entry.textContent);
        return text.includes(normalizedValue);
    })) {
        return true;
    }
    return target.field === 'majorCategory' && normalizedBodyText(documentRef).includes(normalizedValue);
}

function educationMajorDetailControlAvailable(documentRef, fieldKey, value, relatedValues = []) {
    const target = parseNestedEducationMajorFieldKey(fieldKey);
    if (!target || target.field === 'majorName') return true;
    const control = findCurrentControlForFieldKey(documentRef, fieldKey, value, { relatedValues });
    return Boolean(control && !isEffectivelyDisabled(control) && !control.readOnly);
}

function normalizedBodyText(documentRef) {
    if (!documentRef?.body) return '';
    const cache = applicationFormTextCacheForDocument(documentRef);
    if (cache) {
        if (!cache.normalizedBodyText) cache.normalizedBodyText = normalize(documentRef.body.textContent);
        return cache.normalizedBodyText;
    }
    return normalize(documentRef.body.textContent);
}

function educationMajorNameAlreadySelected(documentRef, fieldKey, value) {
    const entry = educationMajorEntryForFieldKey(documentRef, fieldKey, value);
    if (!entry) return false;
    const selectedName = selectedEducationMajorNameTextFromEntry(entry);
    if (!selectedName) return false;
    const normalizedSelected = normalize(selectedName);
    const normalizedValue = normalize(value);
    return normalizedSelected === normalizedValue || normalizedSelected.includes(normalizedValue) || normalizedValue.includes(normalizedSelected);
}

function educationMajorNameKeyFromOpenFieldKey(fieldKey) {
    const match = String(fieldKey ?? '').match(/^(education\.(?:universities|graduateSchools)\.\d+\.majors\.\d+\.majorName)\.open$/);
    return match?.[1] ?? null;
}

function educationMajorNameKeyForNestedFieldKey(fieldKey) {
    const target = parseNestedEducationMajorFieldKey(fieldKey);
    if (!target) return null;
    return `education.${target.group}.${target.educationIndex}.majors.${target.majorIndex}.majorName`;
}

function wasEducationMajorOpenControlUsed(control, fieldKey) {
    return openedEducationMajorControls.get(control)?.has(fieldKey) ?? false;
}

function markEducationMajorOpenControlUsed(control, fieldKey) {
    const used = openedEducationMajorControls.get(control) ?? new Set();
    used.add(fieldKey);
    openedEducationMajorControls.set(control, used);
}

function educationMajorEntries(documentRef) {
    const candidateEntries = Array.from(documentRef.querySelectorAll('div, li, section')).filter((element) => isEducationMajorEntryElement(element));
    const scannedEntries = candidateEntries.filter((candidate) => !candidateEntries.some((other) => other !== candidate && candidate.contains(other)));
    const controls = Array.from(documentRef.querySelectorAll('input, textarea, select, button[type="button"], button:not([type]), [role="button"], [aria-haspopup], [data-value], [data-option]'))
        .filter((control) => !isAutomationControl(control) && !isHiddenElement(control));
    const entries = Array.from(new Set([
        ...scannedEntries,
        ...controls.map((control) => closestEducationMajorEntry(control)).filter(Boolean)
    ]));
    return entries.filter((entry) => !entries.some((other) => other !== entry && entry.contains(other)));
}

function isEducationMajorEntryElement(element) {
    const text = educationMajorEntrySignature(element);
    const majorNameSlotCount = educationMajorNameSlotCount(element);
    const hasMajorNameSlot = majorNameSlotCount >= 1 && majorNameSlotCount <= 2;
    const hasMajorTypeChoices = text.includes(normalize('\uc8fc\uc804\uacf5')) ||
        text.includes(normalize('\ubcf5\uc218\uc804\uacf5')) ||
        text.includes(normalize('\ubd80\uc804\uacf5')) ||
        text.includes(normalize('\uc5f0\uacc4\uc804\uacf5')) ||
        text.includes(normalize('\uc735\ud569\uc804\uacf5')) ||
        text.includes('majortype');
    const hasMajorCategory = text.includes(normalize('\uc804\uacf5\uacc4\uc5f4')) || text.includes(normalize('\ud559\uacfc\uacc4\uc5f4'));
    const hasDayNight = text.includes(normalize('\uc8fc\uac04')) || text.includes(normalize('\uc57c\uac04')) || text.includes('daynight');
    return hasMajorNameSlot && (hasMajorTypeChoices || hasMajorCategory || hasDayNight);
}

function groupControlsByMajorEntry(controls) {
    const groups = [];
    const groupKeys = [];
    for (const control of controls) {
        const groupElement = closestEducationMajorEntry(control) ?? control;
        let index = groupKeys.indexOf(groupElement);
        if (index < 0) {
            groupKeys.push(groupElement);
            groups.push([]);
            index = groups.length - 1;
        }
        groups[index].push(control);
    }
    return groups;
}

function closestEducationMajorEntry(control) {
    let current = control?.parentElement;
    const educationSection = closestEducationSection(control);
    let depth = 0;
    let nameOnlyFallback = null;
    while (current && current !== control.ownerDocument.body && depth < 8) {
        if (educationSection && current === educationSection) break;
        const text = educationMajorEntrySignature(current);
        const hasMajorNameInput = text.includes(normalize('\uc804\uacf5\uba85'));
        const hasSelectedMajorChip = Array.from(current.querySelectorAll?.('.remix-css-zezw7x, button, [role="button"]') ?? [])
            .some((chip) => isEducationMajorSelectedNameChip(chip, current));
        const hasMajorTypeChoices = text.includes(normalize('\uc8fc\uc804\uacf5')) ||
            text.includes(normalize('\ubcf5\uc218\uc804\uacf5')) ||
            text.includes(normalize('\ubd80\uc804\uacf5')) ||
            text.includes(normalize('\uc5f0\uacc4\uc804\uacf5')) ||
            text.includes(normalize('\uc735\ud569\uc804\uacf5')) ||
            text.includes('majortype');
        const hasMajorCategory = text.includes(normalize('\uc804\uacf5\uacc4\uc5f4')) || text.includes(normalize('\ud559\uacfc\uacc4\uc5f4'));
        const hasDayNight = text.includes(normalize('\uc8fc\uac04')) || text.includes(normalize('\uc57c\uac04')) || text.includes('daynight');
        const majorNameSlotCount = educationMajorNameSlotCount(current);
        const hasSingleMajorNameSlot = majorNameSlotCount <= 1 ||
            (hasMajorNameInput && hasSelectedMajorChip && majorNameSlotCount <= 2 && educationMajorNameSlotsShareLocalContainer(current));
        if (hasMajorNameInput && hasSingleMajorNameSlot && isEducationMajorNameOnlyEntryCandidate(current)) {
            nameOnlyFallback ??= current;
        }
        if ((hasMajorNameInput || hasSelectedMajorChip || (hasMajorTypeChoices && hasMajorCategory && hasDayNight)) &&
            (hasMajorTypeChoices || hasMajorCategory || hasDayNight) &&
            hasSingleMajorNameSlot) {
            return current;
        }
        current = current.parentElement;
        depth += 1;
    }
    return nameOnlyFallback;
}

function isEducationMajorNameOnlyEntryCandidate(element) {
    const text = educationMajorEntrySignature(element);
    return text.includes(normalize('\uc804\uacf5\uba85')) &&
        !text.includes(normalize('\ud559\uad50\uc815\ubcf4')) &&
        !text.includes(normalize('\ud559\uad50\uba85')) &&
        !text.includes(normalize('\uace0\ub4f1\ud559\uad50'));
}

function educationMajorNameSlotCount(element) {
    return educationMajorNameSlotElements(element).length;
}

function educationMajorNameSlotElements(element) {
    const nameInputs = Array.from(element.querySelectorAll('input, textarea')).filter((control) => {
        const signature = normalize([
            control.getAttribute('placeholder'),
            control.getAttribute('aria-label'),
            control.getAttribute('name'),
            control.id
        ].filter(Boolean).join(' '));
        return signature.includes(normalize('\uc804\uacf5\uba85')) || signature.includes('majorname');
    });
    const selectedChips = Array.from(element.querySelectorAll('.remix-css-zezw7x, button, [role="button"]'))
        .filter((chip) => isEducationMajorSelectedNameChip(chip, element));
    return [...nameInputs, ...selectedChips];
}

function educationMajorNameSlotsShareLocalContainer(element) {
    const slots = educationMajorNameSlotElements(element);
    if (slots.length <= 1) return true;
    if (slots.length > 2) return false;
    const [first, second] = slots;
    let current = first.parentElement;
    let depth = 0;
    while (current && current !== element && depth < 4) {
        if (current.contains(second)) return true;
        current = current.parentElement;
        depth += 1;
    }
    return false;
}

function isEducationMajorSelectedNameChip(chip, rootElement) {
    const chipText = cleanText(chip.textContent);
    if (!chipText || !isRemovableMajorNameChipElement(chip)) return false;
    const localContext = normalize([
        chipText,
        ancestorPreviousSiblingText(chip)
    ].filter(Boolean).join(' '));
    if (localContext.includes(normalize('\ud559\uad50\uc815\ubcf4')) ||
        localContext.includes(normalize('\ud559\uad50\uba85')) ||
        localContext.includes(normalize('\ud559\uad50 \uc18c\uc7ac\uc9c0')) ||
        localContext.includes(normalize('\uc18c\uc7ac\uc9c0'))) {
        return false;
    }
    let current = chip.parentElement;
    let depth = 0;
    while (current && current !== rootElement && depth < 5) {
        const context = educationMajorEntrySignature(current);
        if (context.includes(normalize('\ud559\uad50\uc815\ubcf4')) || context.includes(normalize('\ud559\uad50\uba85'))) {
            return false;
        }
        if (context.includes(normalize('\uc804\uacf5')) || context.includes('majorname')) {
            return true;
        }
        current = current.parentElement;
        depth += 1;
    }
    const rootContext = educationMajorEntrySignature(rootElement);
    if (rootContext.includes(normalize('\ud559\uad50\uc815\ubcf4')) || rootContext.includes(normalize('\ud559\uad50\uba85'))) {
        return false;
    }
    return rootContext.includes(normalize('\uc804\uacf5\uba85')) ||
        rootContext.includes(normalize('\uc804\uacf5\uacc4\uc5f4')) ||
        rootContext.includes(normalize('\uc8fc\uc804\uacf5')) ||
        rootContext.includes(normalize('\ubcf5\uc218\uc804\uacf5')) ||
        rootContext.includes(normalize('\ubd80\uc804\uacf5')) ||
        rootContext.includes(normalize('\uc5f0\uacc4\uc804\uacf5')) ||
        rootContext.includes(normalize('\uc735\ud569\uc804\uacf5')) ||
        rootContext.includes('majorname') ||
        rootContext.includes('majortype');
}

function educationMajorEntrySignature(element) {
    const descendantControlText = Array.from(element.querySelectorAll('input, textarea, select, button, [role="button"], [aria-haspopup]'))
        .flatMap((control) => [
            control.getAttribute('placeholder'),
            control.getAttribute('aria-label'),
            control.getAttribute('name'),
            control.id,
            choiceElementText(control)
        ])
        .filter(Boolean)
        .join(' ');
    return normalize([element.textContent, descendantControlText].filter(Boolean).join(' '));
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
    invalidateApplicationFormElementCache(control?.ownerDocument);
    const eventWindow = control.ownerDocument.defaultView ?? window;
    control.focus?.();
    control.dispatchEvent(new eventWindow.Event('input', { bubbles: true }));
    control.dispatchEvent(new eventWindow.Event('change', { bubbles: true }));
    control.dispatchEvent(new eventWindow.FocusEvent('focusout', { bubbles: true }));
    control.dispatchEvent(new eventWindow.FocusEvent('blur', { bubbles: false }));
    control.blur?.();
    invalidateApplicationFormElementCache(control?.ownerDocument);
}

function setFileInputValue(control, value) {
    if (control?.tagName?.toLowerCase() !== 'input' || (control.getAttribute('type') ?? '').toLowerCase() !== 'file') {
        return { success: false, reason: 'control_not_ready' };
    }
    const file = createProfilePhotoFile(control.ownerDocument, value);
    if (!file) return { success: false, reason: 'missing_profile_value' };
    if (!fileInputAcceptsFile(control, file)) return { success: false, reason: 'select_option_not_found' };
    const files = makeFileList(control.ownerDocument, [file]);
    if (!files) return { success: false, reason: 'control_not_ready' };
    try {
        control.files = files;
    }
    catch {
        try {
            Object.defineProperty(control, 'files', { configurable: true, value: files });
        }
        catch {
            return { success: false, reason: 'control_not_ready' };
        }
    }
    return { success: true, value: file.name };
}

function makeFileList(documentRef, files) {
    const eventWindow = documentRef?.defaultView ?? window;
    if (typeof eventWindow.DataTransfer === 'function') {
        const dataTransfer = new eventWindow.DataTransfer();
        files.forEach((file) => dataTransfer.items.add(file));
        return dataTransfer.files;
    }
    const list = [...files];
    Object.defineProperty(list, 'item', {
        configurable: true,
        value: (index) => list[index] ?? null
    });
    return list;
}

function createProfilePhotoFile(documentRef, value) {
    const payload = normalizeProfilePhotoPayload(value);
    if (!payload) return null;
    const bytes = bytesFromDataUrl(payload.dataUrl, documentRef);
    if (!bytes) return null;
    const eventWindow = documentRef?.defaultView ?? window;
    const fileName = payload.name || extensionForMimeType(payload.type, 'resume-photo');
    const options = { type: payload.type };
    if (typeof eventWindow.File === 'function') {
        return new eventWindow.File([bytes], fileName, options);
    }
    const blob = new eventWindow.Blob([bytes], options);
    Object.defineProperty(blob, 'name', { configurable: true, value: fileName });
    Object.defineProperty(blob, 'lastModified', { configurable: true, value: Date.now() });
    return blob;
}

function normalizeProfilePhotoPayload(value) {
    if (typeof value === 'string') {
        const dataUrl = cleanText(value);
        if (!isImageDataUrl(dataUrl)) return null;
        return {
            name: extensionForMimeType(mimeTypeFromDataUrl(dataUrl), 'resume-photo'),
            type: mimeTypeFromDataUrl(dataUrl),
            dataUrl
        };
    }
    const record = asRecord(value);
    if (!record) return null;
    const dataUrl = cleanText(record.dataUrl ?? record.dataURL ?? record.url);
    const mimeType = cleanText(record.type ?? record.mimeType ?? record.contentType) || mimeTypeFromDataUrl(dataUrl) || 'image/jpeg';
    const base64 = cleanText(record.base64 ?? record.contentBase64 ?? record.data);
    const normalizedDataUrl = isImageDataUrl(dataUrl)
        ? dataUrl
        : base64 && mimeType.startsWith('image/')
            ? `data:${mimeType};base64,${base64}`
            : null;
    if (!normalizedDataUrl || !mimeType.startsWith('image/')) return null;
    return {
        name: cleanText(record.name ?? record.fileName) || extensionForMimeType(mimeType, 'resume-photo'),
        type: mimeType,
        dataUrl: normalizedDataUrl
    };
}

function bytesFromDataUrl(dataUrl, documentRef) {
    const match = cleanText(dataUrl)?.match(/^data:([^;,]+);base64,(.+)$/);
    if (!match || !match[1].startsWith('image/')) return null;
    const eventWindow = documentRef?.defaultView ?? window;
    const atobFn = eventWindow.atob ?? globalThis.atob;
    if (typeof atobFn !== 'function') return null;
    try {
        const binary = atobFn(match[2]);
        const bytes = new Uint8Array(binary.length);
        for (let index = 0; index < binary.length; index += 1) {
            bytes[index] = binary.charCodeAt(index);
        }
        return bytes;
    }
    catch {
        return null;
    }
}

function isImageDataUrl(value) {
    return /^data:image\/[a-z0-9.+-]+;base64,/i.test(cleanText(value) ?? '');
}

function mimeTypeFromDataUrl(value) {
    return cleanText(value)?.match(/^data:([^;,]+);base64,/i)?.[1] ?? null;
}

function extensionForMimeType(mimeType, baseName) {
    const normalized = cleanText(mimeType)?.toLowerCase();
    if (normalized === 'image/png') return `${baseName}.png`;
    if (normalized === 'image/webp') return `${baseName}.webp`;
    return `${baseName}.jpg`;
}

function fileInputAcceptsFile(control, file) {
    const accept = cleanText(control?.getAttribute?.('accept'));
    if (!accept) return true;
    return accept.split(',')
        .map((item) => item.trim().toLowerCase())
        .filter(Boolean)
        .some((item) => {
            if (item === 'image/*') return file.type.startsWith('image/');
            if (item.endsWith('/*')) return file.type.startsWith(item.slice(0, -1));
            if (item.startsWith('.')) return file.name.toLowerCase().endsWith(item);
            return file.type.toLowerCase() === item;
        });
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

function addProfilePhotoFileInputItems(documentRef, values, fillable, failed) {
    const photoValue = values.find((value) => value.key === PROFILE_PHOTO_FIELD_KEY);
    const candidates = profilePhotoFileInputCandidates(documentRef);
    if (!candidates.length) return;
    const selected = selectProfilePhotoFileInput(candidates);
    if (!selected) return;
    if (!photoValue) {
        addMissingProfileValue(failed, PROFILE_PHOTO_FIELD_KEY);
        return;
    }
    const payload = normalizeProfilePhotoPayload(photoValue.value);
    if (!payload) {
        addMissingProfileValue(failed, PROFILE_PHOTO_FIELD_KEY);
        return;
    }
    fillable.push({
        element: selected.control,
        fieldKey: PROFILE_PHOTO_FIELD_KEY,
        label: selected.context.displayLabel || photoValue.label,
        value: payload.name,
        fileValue: photoValue.value,
        fileUploadControl: true
    });
}

function profilePhotoFileInputCandidates(documentRef) {
    return Array.from(documentRef.querySelectorAll('input[type="file"]'))
        .filter((control) => !isAutomationControl(control) && !isEffectivelyDisabled(control))
        .map((control) => {
            const context = collectControlText(control);
            return { control, context, score: profilePhotoFileInputScore(control, context) };
        })
        .filter((candidate) => candidate.score > 0);
}

function selectProfilePhotoFileInput(candidates) {
    if (candidates.length === 1) return candidates[0];
    const strong = candidates.filter((candidate) => candidate.score >= 10);
    return strong.length === 1 ? strong[0] : null;
}

function profilePhotoFileInputScore(control, context) {
    if (!fileInputLooksImageOnly(control)) return 0;
    const normalized = normalize([
        context.displayLabel,
        context.normalized,
        control.getAttribute('name'),
        control.id,
        control.getAttribute('aria-label'),
        control.getAttribute('accept')
    ].filter(Boolean).join(' '));
    const strongTerms = [
        normalize('\uc99d\uba85\uc0ac\uc9c4'),
        normalize('\uc9c0\uc6d0\uc11c\uc0ac\uc9c4'),
        normalize('\uc774\ub825\uc11c\uc0ac\uc9c4'),
        normalize('\ud504\ub85c\ud544\uc0ac\uc9c4'),
        'profilephoto',
        'resumephoto',
        'idphoto',
        'applicantphoto'
    ];
    if (containsAny(normalized, strongTerms)) return 10;
    const weakTerms = [
        normalize('\uc0ac\uc9c4'),
        'photo',
        'picture',
        'image',
        'avatar'
    ];
    return containsAny(normalized, weakTerms) ? 5 : 0;
}

function fileInputLooksImageOnly(control) {
    const accept = cleanText(control?.getAttribute?.('accept'));
    if (!accept) return true;
    const items = accept.split(',').map((item) => item.trim().toLowerCase()).filter(Boolean);
    if (!items.length) return true;
    return items.some((item) => item === 'image/*' || item.startsWith('image/') || ['.jpg', '.jpeg', '.png', '.webp'].includes(item));
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
        addFirstValue(values, highSchool, ['admissionDate', 'entranceDate'], 'education.highSchool.admissionDate', '\uace0\ub4f1\ud559\uad50 \uc785\ud559\uc77c', ['\uc7ac\ud559\uae30\uac04', '\uc785\ud559\uc77c', 'startdate']);
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
        addFirstValue(values, record, ['admissionDate', 'entranceDate'], `education.${group}.${index}.admissionDate`, `${label} \uc785\ud559\uc77c`, ['\uc7ac\ud559\uae30\uac04', '\uc785\ud559\uc77c', 'startdate']);
        addValue(values, record, 'graduationDate', `education.${group}.${index}.graduationDate`, `${label} \uc878\uc5c5\uc77c`, ['\uc7ac\ud559\uae30\uac04', '\uc878\uc5c5\uc77c', 'enddate']);
        addValue(values, record, 'graduationStatus', `education.${group}.${index}.graduationStatus`, `${label} \uc878\uc5c5\uad6c\ubd84`, ['\uc878\uc5c5\uad6c\ubd84', 'graduationstatus']);
        addValue(values, record, 'degreeType', `education.${group}.${index}.degreeType`, `${label} \ud559\uc704\uad6c\ubd84`, ['\ud559\uc704\uad6c\ubd84', 'degreetype']);
        addValue(values, record, 'admissionType', `education.${group}.${index}.admissionType`, `${label} \uc785\ud559\uad6c\ubd84`, ['\uc785\ud559\uad6c\ubd84', 'admissiontype']);
        addValue(values, record, 'location', `education.${group}.${index}.location`, `${label} 학교 소재지`, ['학교소재지', '소재지', 'location']);
        addValue(values, record, 'campusType', `education.${group}.${index}.campusType`, `${label} 본교/분교`, ['본교', '분교', '본교분교', 'campustype']);
        addEducationGroupMajorCategoryValue(values, record, group, index, label);
        addEducationMajorValues(values, record, group, index, label);
        addValue(values, record, 'grade', `education.${group}.${index}.grade`, `${label} \uc131\uc801 \ud3c9\uc810`, ['\ud559\uc5c5\uc131\uc801', '\uc131\uc801\ud3c9\uc810', '\ud3c9\uc810', 'gpa', 'grade']);
        addFirstValue(values, record, ['gradeScale', 'gradeMax', 'maxGrade', 'fullScore'], `education.${group}.${index}.gradeScale`, `${label} \ub9cc\uc810\uae30\uc900`, ['\ub9cc\uc810\uae30\uc900', 'gradescale', 'fullscore', 'maxgrade']);
        addFirstValue(values, record, ['credits', 'completedCredits'], `education.${group}.${index}.credits`, `${label} \uc774\uc218\ud559\uc810`, ['\uc774\uc218\ud559\uc810', '\ucde8\ub4dd\ud559\uc810', 'credits', 'credit']);
    });
}

function addEducationGroupMajorCategoryValue(values, record, group, index, label) {
    const key = `education.${group}.${index}.majorCategory`;
    const terms = ['\ud559\uacfc\uacc4\uc5f4', 'departmentcategory'].map(normalize);
    const directValue = cleanText(record?.majorCategory);
    if (directValue && !isPlaceholderProfileValue(directValue)) {
        values.push({ key, label: `${label} \ud559\uacfc\uacc4\uc5f4`, value: directValue, terms });
        return;
    }
    const inferredValue = inferredEducationGroupMajorCategory(record);
    if (inferredValue) {
        values.push({ key, label: `${label} \ud559\uacfc\uacc4\uc5f4`, value: inferredValue, terms });
    }
}

function inferredEducationGroupMajorCategory(record) {
    const majors = Array.isArray(record?.majors)
        ? record.majors.map(asRecord).filter(Boolean)
        : [];
    for (const major of majors) {
        const category = cleanText(major?.majorCategory);
        if (!category || isPlaceholderProfileValue(category)) continue;
        const broad = broadEducationCategoryValue(category);
        if (broad) return broad;
    }
    return '';
}

function broadEducationCategoryValue(value) {
    const normalized = normalize(value);
    const categories = [
        ['\uacf5\ud559', '\uacf5\ud559'],
        ['\uc778\ubb38', '\uc778\ubb38'],
        ['\uc0c1\uacbd', '\uc0c1\uacbd'],
        ['\uc0ac\ud68c', '\uc0ac\ud68c'],
        ['\uad50\uc721', '\uad50\uc721'],
        ['\uc790\uc5f0', '\uc790\uc5f0'],
        ['\uc758\uc57d', '\uc758\uc57d'],
        ['\uc608\uccb4\ub2a5', '\uc608\uccb4\ub2a5'],
        ['\uae30\ud0c0', '\uae30\ud0c0']
    ];
    return categories.find(([term]) => normalized.includes(normalize(term)))?.[1] ?? '';
}

function addEducationMajorValues(values, record, group, educationIndex, label) {
    const majors = Array.isArray(record?.majors)
        ? record.majors.map(asRecord).filter(Boolean)
        : [];
    if (!majors.length) {
        addEducationMajorValueSet(values, record, `education.${group}.${educationIndex}`, label);
        return;
    }
    orderedEducationMajors(majors).forEach((major, majorIndex) => {
        addEducationMajorValueSet(values, major, `education.${group}.${educationIndex}.majors.${majorIndex}`, `${label} \uc804\uacf5 ${majorIndex + 1}`);
    });
}

function orderedEducationMajors(majors) {
    return majors
        .map((major, index) => ({ major, index }))
        .sort((left, right) => {
            const priorityDiff = educationMajorTypePriority(left.major) - educationMajorTypePriority(right.major);
            return priorityDiff || left.index - right.index;
        })
        .map((entry) => entry.major);
}

function educationMajorTypePriority(major) {
    const normalized = normalize(major?.majorType ?? major?.type ?? major?.category ?? '');
    if (normalized.includes(normalize('\uc8fc\uc804\uacf5'))) return 0;
    if (normalized.includes(normalize('\ubcf5\uc218\uc804\uacf5'))) return 1;
    if (normalized.includes(normalize('\ubd80\uc804\uacf5'))) return 2;
    if (normalized.includes(normalize('\uc5f0\uacc4\uc804\uacf5'))) return 3;
    if (normalized.includes(normalize('\uc735\ud569\uc804\uacf5'))) return 4;
    return 10;
}

function addEducationMajorValueSet(values, record, keyPrefix, label) {
    addValue(values, record, 'majorCategory', `${keyPrefix}.majorCategory`, `${label} \uc804\uacf5\uacc4\uc5f4`, ['\uc804\uacf5\uacc4\uc5f4', 'majorcategory']);
    addValue(values, record, 'majorType', `${keyPrefix}.majorType`, `${label} \uc804\uacf5\uad6c\ubd84`, ['\uc804\uacf5\uad6c\ubd84', 'majortype']);
    addValue(values, record, 'dayNight', `${keyPrefix}.dayNight`, `${label} \uc8fc\uac04/\uc57c\uac04`, ['\uc8fc\uac04', '\uc57c\uac04', '\uc8fc\uac04/\uc57c\uac04', 'daynight']);
    addFirstValue(values, record, ['majorName', 'major'], `${keyPrefix}.majorName`, `${label} \uc804\uacf5\uba85`, ['\uc804\uacf5', '\uc804\uacf5\uba85', 'major', 'majorname']);
}

function addCareerValues(values, careerSection) {
    const section = asRecord(careerSection);
    const records = Array.isArray(careerSection)
        ? careerSection
        : Array.isArray(section?.careers)
            ? section.careers
            : [];
    records.forEach((item, index) => {
        const record = asRecord(item);
        if (!record) return;
        const prefix = `career.careers.${index}`;
        const label = `\uacbd\ub825 ${index + 1}`;
        addFirstValue(values, record, ['companyName', 'company', 'title'], `${prefix}.companyName`, `${label} \ud68c\uc0ac\uba85`, ['\ud68c\uc0ac\uba85', 'companyname', 'company']);
        addValue(values, record, 'employmentType', `${prefix}.employmentType`, `${label} \uace0\uc6a9\ud615\ud0dc`, ['\uace0\uc6a9\ud615\ud0dc', 'employmenttype']);
        addValue(values, record, 'department', `${prefix}.department`, `${label} \ubd80\uc11c`, ['\ubd80\uc11c', '\ubd80\uc11c\uba85', 'department']);
        addValue(values, record, 'position', `${prefix}.position`, `${label} \uc9c1\uae09/\uc9c1\ucc45`, ['\uc9c1\uae09', '\uc9c1\ucc45', 'position']);
        addValue(values, record, 'roleName', `${prefix}.roleName`, `${label} \uc9c1\ubb34\uba85`, ['\uc9c1\ubb34\uba85', '\ub2f4\ub2f9\uc9c1\ubb34', 'rolename', 'jobtitle']);
        addValue(values, record, 'startDate', `${prefix}.startDate`, `${label} \uc785\uc0ac\uc77c`, ['\uadfc\ubb34\uae30\uac04', '\uc785\uc0ac\uc77c', 'startdate']);
        addValue(values, record, 'endDate', `${prefix}.endDate`, `${label} \ud1f4\uc0ac\uc77c`, ['\uadfc\ubb34\uae30\uac04', '\ud1f4\uc0ac\uc77c', 'enddate']);
        addCareerEmploymentStatusValue(values, record, `${prefix}.isEmployed`, `${label} \uc7ac\uc9c1 \uc5ec\ubd80`);
        addFirstValue(values, record, ['resignationReason', 'retirementReason'], `${prefix}.resignationReason`, `${label} \ud1f4\uc9c1\uc0ac\uc720`, ['\ud1f4\uc9c1\uc0ac\uc720', '\ud1f4\uc0ac\uc0ac\uc720', 'resignationreason', 'retirementreason']);
        addFirstValue(values, record, ['duties', 'comment', 'description', 'summary'], `${prefix}.duties`, `${label} \ub2f4\ub2f9\uc5c5\ubb34`, ['\ub2f4\ub2f9\uc5c5\ubb34', '\uc8fc\uc694\uc5c5\ubb34', 'duties', 'comment', 'description']);
        addValue(values, record, 'achievements', `${prefix}.achievements`, `${label} \uc8fc\uc694 \uc131\uacfc`, ['\uc8fc\uc694\uc131\uacfc', '\uc131\uacfc', 'achievements']);
    });
}

function addCareerEmploymentStatusValue(values, record, key, label) {
    if (!Object.prototype.hasOwnProperty.call(record, 'isEmployed')) return;
    const value = record.isEmployed === true ? '\uc7ac\uc9c1\uc911' : record.isEmployed === false ? '\ud1f4\uc0ac' : cleanText(record.isEmployed);
    if (value) values.push({ key, label, value, terms: [normalize('\uadfc\ubb34\uae30\uac04'), normalize('\uc7ac\uc9c1\uc911'), normalize('\ud1f4\uc0ac'), 'isemployed'] });
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

function addActivityValues(values, sections) {
    const other = asRecord(sections.other);
    const activities = Array.isArray(other?.activities)
        ? other.activities
        : Array.isArray(sections.activities)
            ? sections.activities
            : [];
    activities.forEach((item, index) => {
        const record = asRecord(item);
        if (!record) return;
        const label = `\ud65c\ub3d9 ${index + 1}`;
        addActivityValue(values, `${label} \ud65c\ub3d9\uad6c\ubd84`, `activities.${index}.activityType`, record.activityType, ['\ud65c\ub3d9\uad6c\ubd84', 'activitytype']);
        addActivityValue(values, `${label} \ud65c\ub3d9\uba85`, `activities.${index}.activityName`, record.activityName ?? record.title, ['\ud65c\ub3d9\uba85', 'activityname']);
        addActivityValue(values, `${label} \uae30\uad00/\uc870\uc9c1`, `activities.${index}.organization`, record.organization, ['\uae30\uad00', '\uc870\uc9c1', 'organization']);
        addActivityValue(values, `${label} \uc2dc\uc791\uc77c`, `activities.${index}.startDate`, record.startDate, ['\ud65c\ub3d9\uae30\uac04', '\uc2dc\uc791\uc77c', 'startdate']);
        addActivityValue(values, `${label} \uc885\ub8cc\uc77c`, `activities.${index}.endDate`, record.endDate, ['\ud65c\ub3d9\uae30\uac04', '\uc885\ub8cc\uc77c', 'enddate']);
        const period = [cleanText(record.startDate), cleanText(record.endDate)].filter(Boolean).join(' ~ ');
        addCopyOnlyValue(values, `${label} \ud65c\ub3d9\uae30\uac04`, `activities.${index}.period`, period);
        addActivityValue(values, `${label} \uc5ed\ud560`, `activities.${index}.role`, record.role, ['\uc5ed\ud560', '\uc9c1\uc704', 'role']);
        addActivityValue(values, `${label} \uc0c1\uc138 \ub0b4\uc6a9`, `activities.${index}.description`, record.description ?? record.summary, ['\uc0c1\uc138\ub0b4\uc6a9', '\ud65c\ub3d9\ub0b4\uc6a9', 'description', 'contents']);
        addCopyOnlyValue(values, `${label} \uc131\uacfc`, `activities.${index}.outcome`, record.outcome);
    });
}

function addActivityValue(values, label, key, rawValue, terms) {
    const value = cleanText(rawValue);
    if (value && !isPlaceholderProfileValue(value)) values.push({ key, label, value, terms: terms.map(normalize) });
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
        const label = `\uD65C\uB3D9 ${index + 1}`;
        addCopyOnlyValue(values, `${label} \uD65C\uB3D9\uAD6C\uBD84`, `activities.${index}.activityType`, record.activityType);
        addCopyOnlyValue(values, `${label} \uD65C\uB3D9\uBA85`, `activities.${index}.activityName`, record.activityName ?? record.title);
        addCopyOnlyValue(values, `${label} \uAE30\uAD00/\uC870\uC9C1`, `activities.${index}.organization`, record.organization);
        const period = [cleanText(record.startDate), cleanText(record.endDate)].filter(Boolean).join(' ~ ');
        addCopyOnlyValue(values, `${label} \uD65C\uB3D9\uAE30\uAC04`, `activities.${index}.period`, period);
        addCopyOnlyValue(values, `${label} \uC5ED\uD560`, `activities.${index}.role`, record.role);
        addCopyOnlyValue(values, `${label} \uC0C1\uC138 \uB0B4\uC6A9`, `activities.${index}.description`, record.description ?? record.summary);
        addCopyOnlyValue(values, `${label} \uC131\uACFC`, `activities.${index}.outcome`, record.outcome);
    });
}

function addValue(values, record, field, key, label, terms) {
    const value = cleanText(record?.[field]);
    if (value && !isPlaceholderProfileValue(value)) values.push({ key, label, value, terms: terms.map(normalize) });
}

function addProfilePhotoValue(values, basicInfo) {
    const record = asRecord(basicInfo);
    const rawValue = record?.profilePhoto ?? record?.photo ?? record?.profileImage ?? record?.photoDataUrl ?? record?.photoBase64;
    const payload = normalizeProfilePhotoPayload(rawValue);
    if (!payload) return;
    values.push({
        key: PROFILE_PHOTO_FIELD_KEY,
        label: '\uc9c0\uc6d0\uc11c \uc0ac\uc9c4',
        value: rawValue,
        terms: [
            normalize('\uc99d\uba85\uc0ac\uc9c4'),
            normalize('\uc9c0\uc6d0\uc11c\uc0ac\uc9c4'),
            normalize('\uc774\ub825\uc11c\uc0ac\uc9c4'),
            normalize('\uc0ac\uc9c4'),
            'profilephoto',
            'resumephoto',
            'photo'
        ]
    });
}

function addFirstValue(values, record, fields, key, label, terms) {
    const field = fields.find((candidate) => cleanText(record?.[candidate]));
    if (!field) return;
    addValue(values, record, field, key, label, terms);
}

function addCopyOnlyValue(values, label, key, rawValue) {
    const value = cleanText(rawValue);
    if (value) values.push({ key, label, value, terms: [normalize(`copyonly${key}`)], copyOnly: true });
}

function isPlaceholderProfileValue(value) {
    const normalized = normalize(value);
    return normalized.includes(normalize('\uc120\ud0dd\ud574\uc8fc\uc138\uc694')) ||
        normalized.includes(normalize('\uc785\ub825\ud574\uc8fc\uc138\uc694')) ||
        normalized.includes(normalize('\uc120\ud0dd\ud558\uc138\uc694')) ||
        normalized.includes(normalize('\uc785\ub825\ud558\uc138\uc694')) ||
        normalized.includes('pleaseselect') ||
        normalized.includes('pleaseenter');
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

function isAutocompleteSearchControlForField(control, fieldKey) {
    if (!isAutocompletePrimaryFieldKey(fieldKey)) return false;
    if (isAutocompleteSearchControl(control)) return true;
    if (isCertificatePrimaryFieldKey(fieldKey)) return isMidasCertificateSearchInput(control, fieldKey);
    if (isEducationSchoolNameField(fieldKey)) return isMidasSchoolSearchInput(control);
    return isEducationMajorNameField(fieldKey) && isMidasMajorSearchInput(control);
}

function isEducationSchoolNameField(fieldKey) {
    return /^education\.(?:highSchool|universities\.(?:\d+|\*)|graduateSchools\.(?:\d+|\*))\.schoolName$/.test(fieldKey);
}

function isEducationMajorNameField(fieldKey) {
    return /^education\.(?:universities\.(?:\d+|\*)|graduateSchools\.(?:\d+|\*))(?:\.majors\.\d+)?\.majorName$/.test(fieldKey);
}

function isMidasSchoolSearchInput(control) {
    if (control?.tagName?.toLowerCase() !== 'input') return false;
    const signature = normalize([
        control.getAttribute('placeholder'),
        control.getAttribute('aria-label'),
        control.getAttribute('name'),
        labelText(control),
        nearbyText(control)
    ].filter(Boolean).join(' '));
    return signature.includes(normalize('\ud559\uad50\uba85')) ||
        signature.includes(normalize('\ud559\uad50\uc815\ubcf4')) ||
        signature.includes('schoolname');
}

function isMidasMajorSearchInput(control) {
    if (control?.tagName?.toLowerCase() !== 'input') return false;
    const signature = normalize([
        control.getAttribute('placeholder'),
        control.getAttribute('aria-label'),
        control.getAttribute('name'),
        labelText(control),
        nearbyText(control)
    ].filter(Boolean).join(' '));
    return signature.includes(normalize('\uc804\uacf5\uba85')) ||
        signature.includes('majorname');
}

function isMidasCertificateSearchInput(control, fieldKey) {
    if (control?.tagName?.toLowerCase() !== 'input') return false;
    const autocompleteSignature = normalize([
        control.getAttribute('placeholder'),
        control.getAttribute('aria-label'),
        control.getAttribute('role'),
        control.getAttribute('aria-autocomplete'),
        control.getAttribute('aria-haspopup')
    ].filter(Boolean).join(' '));
    if (!autocompleteSignature.includes(normalize('\uac80\uc0c9')) &&
        !autocompleteSignature.includes('search') &&
        !autocompleteSignature.includes('combobox') &&
        !autocompleteSignature.includes('list')) {
        return false;
    }
    const signature = normalize([
        control.getAttribute('placeholder'),
        control.getAttribute('aria-label'),
        control.getAttribute('name'),
        labelText(control),
        nearbyText(control)
    ].filter(Boolean).join(' '));
    if (/^certificates\.languageTests\.(?:\d+|\*)\.testName$/.test(String(fieldKey ?? ''))) {
        return signature.includes(normalize('\uc2dc\ud5d8\uba85')) ||
            signature.includes(normalize('\uc2dc\ud5d8')) ||
            signature.includes(normalize('\uacf5\uc778\uc678\uad6d\uc5b4\uc2dc\ud5d8')) ||
            signature.includes(normalize('\uc5b4\ud559')) ||
            signature.includes('testname') ||
            signature.includes('examname') ||
            signature.includes('language');
    }
    if (/^certificates\.certificates\.(?:\d+|\*)\.certificateName$/.test(String(fieldKey ?? ''))) {
        return signature.includes(normalize('\uc790\uaca9\uc99d\uba85')) ||
            signature.includes(normalize('\uc790\uaca9\uc99d')) ||
            signature.includes(normalize('\uba74\ud5c8')) ||
            signature.includes('certificatename') ||
            signature.includes('certificate') ||
            signature.includes('license');
    }
    return false;
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
    if (isIconOnlyActionButton(control)) return false;
    const text = choiceCandidateText(control);
    if (isMilitaryServicePeriodChoiceText(text)) return false;
    if (!text || text.length > 20 || !isChoiceText(text)) return false;
    return !ACTION_BUTTON_TERMS.includes(normalize(text));
}

function isActionButtonControl(control) {
    const normalized = normalize(choiceCandidateText(control) || choiceElementText(control));
    if (!normalized) return false;
    return ACTION_BUTTON_TERMS.some((term) => normalized === term || normalized.includes(term));
}

function isPotentialCustomSelectControl(control) {
    if (isAutomationControl(control) || isChoiceButtonCandidate(control)) return false;
    if (isIconOnlyActionButton(control)) return false;
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
    const normalized = normalize(text);
    return CHOICE_BUTTON_TERMS.includes(normalized) || ADDITIONAL_CHOICE_BUTTON_TERMS.includes(normalized);
}

function choiceControlMatchesValue(control, value) {
    const normalizedValue = normalize(value);
    const text = normalize(choiceCandidateText(control) || choiceElementText(control));
    const optionValue = normalize(control.getAttribute?.('data-value') || control.getAttribute?.('data-option') || control.getAttribute?.('value'));
    return Boolean(normalizedValue && (text === normalizedValue || optionValue === normalizedValue));
}

function isMilitaryServicePeriodChoiceText(text) {
    const normalized = normalize(text);
    if (['18', '21', '24'].some((months) => normalized === `${months}${normalize('\uac1c\uc6d4')}` || normalized === `${months} ${normalize('\uac1c\uc6d4')}` || normalized === months)) return true;
    return ['18', '21', '24'].some((months) => normalized === `${months}${normalize('개월')}` || normalized === months);
}

function isCompletedMilitaryStatus(value) {
    return normalize(value) === normalize('\uAD70\uD544');
}

function isButtonLikeChoiceControl(control) {
    if (isIconOnlyActionButton(control)) return false;
    const tagName = control.tagName.toLowerCase();
    const role = (control.getAttribute('role') ?? '').toLowerCase();
    return tagName === 'button' || ['button', 'radio', 'checkbox', 'switch'].includes(role);
}

function isIconOnlyActionButton(control) {
    if (!control) return false;
    const tagName = control.tagName?.toLowerCase();
    const role = (control.getAttribute?.('role') ?? '').toLowerCase();
    if (tagName !== 'button' && role !== 'button') return false;
    if (cleanText(control.getAttribute?.('aria-label')) ||
        cleanText(control.getAttribute?.('data-value')) ||
        cleanText(control.getAttribute?.('data-option')) ||
        cleanText(control.getAttribute?.('value')) ||
        cleanText(control.textContent)) {
        return false;
    }
    return Boolean(control.querySelector?.('svg, path'));
}

function choiceElementText(element) {
    return cleanText(element?.textContent) ||
        cleanText(element?.getAttribute?.('aria-label')) ||
        cleanText(element?.getAttribute?.('data-value')) ||
        cleanText(element?.getAttribute?.('data-option')) ||
        cleanText(element?.getAttribute?.('value'));
}

function choiceCandidateText(control) {
    return cleanText(labelText(control)) || choiceElementText(control);
}

function isChoiceOnlyText(text, optionText) {
    const normalized = normalize(text);
    const normalizedOption = normalize(optionText);
    return Boolean(normalizedOption && normalized === normalizedOption);
}

function shouldSkipLongText(control, context) {
    return control.tagName.toLowerCase() === 'textarea' &&
        (ESSAY_TERMS.some((term) => context.normalized.includes(normalize(term))) ||
            isManualFreeTextControl(control, context));
}

function isManualFreeTextControl(control, context) {
    if (control?.tagName?.toLowerCase() !== 'textarea') return false;
    const signature = normalize([
        context?.normalized,
        control.getAttribute?.('placeholder'),
        control.getAttribute?.('aria-label'),
        nearbyText(control),
        ancestorPreviousSiblingText(control)
    ].filter(Boolean).join(' '));
    return MANUAL_FREE_TEXT_TERMS.some((term) => signature.includes(term));
}

function manualFreeTextReason(control, context) {
    return isManualFreeTextControl(control, context) ? 'manual_free_text' : 'essay_or_long_text';
}

function manualReviewFreeTextLabel(control) {
    return cleanText(precedingHeadingText(control)) ||
        cleanText(control?.getAttribute?.('aria-label')) ||
        cleanText(control?.getAttribute?.('placeholder')) ||
        cleanText(ancestorPreviousSiblingText(control)) ||
        '장문 입력칸';
}

function isTailoredActivityControl(control, context = {}) {
    if (!control) return false;
    const signature = normalize([
        context.normalized,
        context.displayLabel,
        choiceElementText(control),
        closestSectionText(control),
        nearbyText(control),
        ancestorPreviousSiblingText(control)
    ].filter(Boolean).join(' '));
    if (!signature || !isInActivitySection(control, signature)) return false;
    return containsAny(signature, [
        normalize('\ud65c\ub3d9\uad6c\ubd84'),
        normalize('\ud65c\ub3d9\uba85'),
        normalize('\uae30\uad00\ubc0f\uc870\uc9c1\uba85'),
        normalize('\uae30\uad00 \ubc0f \uc870\uc9c1\uba85'),
        normalize('\ud65c\ub3d9\uae30\uac04'),
        normalize('\uc9c1\uc704\ub610\ub294\uc5ed\ud560'),
        normalize('\uc9c1\uc704 \ub610\ub294 \uc5ed\ud560'),
        normalize('\uc0c1\uc138\ub0b4\uc6a9'),
        normalize('\uc0c1\uc138 \ub0b4\uc6a9'),
        normalize('\ud65c\ub3d9\ub0b4\uc6a9'),
        'activityanswers',
        'activitytype',
        'activityname',
        'activityperiod',
        'organization',
        'contents'
    ]);
}

function closestSectionText(control) {
    const section = control.closest('section, fieldset, [role="region"], article');
    if (!section) return '';
    return [
        section.getAttribute('aria-label'),
        section.querySelector('h1, h2, h3, h4, h5, legend')?.textContent
    ].filter(Boolean).join(' ');
}

function precedingHeadingText(control) {
    const headings = Array.from(control?.ownerDocument?.querySelectorAll?.('h1, h2, h3, h4, h5, legend') ?? [])
        .filter((heading) => !isHiddenElement(heading));
    let latest = '';
    for (const heading of headings) {
        if (heading === control || heading.compareDocumentPosition(control) & Node.DOCUMENT_POSITION_FOLLOWING) {
            latest = heading.textContent;
            continue;
        }
        break;
    }
    return latest;
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

function addManualReviewHintItems(documentRef, skipped) {
    const controls = getApplicationFormElements(documentRef, 'button[type="button"], button:not([type]), [role="button"]');
    const seen = new Set(skipped.map((item) => item?.fieldKey ?? item?.label).filter(Boolean));
    for (const control of controls) {
        const label = manualAddSectionLabel(control);
        if (!label) continue;
        const key = `manual.${normalize(label)}.add`;
        if (seen.has(key)) continue;
        seen.add(key);
        skipped.push({
            fieldKey: key,
            label: `${label} 추가`,
            reason: 'manual_add_section'
        });
    }
}

function manualAddSectionLabel(control) {
    if (!control || isHiddenElement(control) || isAutomationControl(control) || isEffectivelyDisabled(control)) return null;
    const ownText = normalize(choiceCandidateText(control) || choiceElementText(control));
    if (!ownText.includes(normalize('추가')) && !ownText.includes('add')) return null;
    const signature = normalize([
        ownText,
        ancestorPreviousSiblingText(control),
        nearbyText(control),
        precedingHeadingText(control)
    ].filter(Boolean).join(' '));
    const matchedTerm = MANUAL_ADD_SECTION_TERMS.find((term) => signature.includes(term));
    if (!matchedTerm) return null;
    if (signature.includes(normalize('포트폴리오'))) return '포트폴리오';
    if (signature.includes('portfolio')) return '포트폴리오';
    return '경력기술서';
}

function isRequiredApplicationControl(control, context = {}) {
    if (!control) return false;
    if (control.required || control.getAttribute?.('aria-required') === 'true') return true;
    if (hasRequiredMarker(context.displayLabel)) return true;
    const labelElement = control.closest?.('label');
    if (hasRequiredMarker(labelElement?.textContent)) return true;
    const fieldContainer = control.closest?.('.field, .form-group, .input-group, div');
    return Array.from(fieldContainer?.querySelectorAll?.('span, p, em, strong') ?? [])
        .map((element) => cleanText(element.textContent))
        .some(hasRequiredMarker);
}

function hasRequiredMarker(text) {
    return /[*＊]/.test(cleanText(text));
}

function cleanRequiredFieldLabel(label) {
    return cleanText(String(label ?? '').replace(/[*＊]/g, ' ')) || '입력칸';
}

function addMissingProfileValue(failed, fieldKey) {
    if (!fieldKey || failed.some((item) => item.fieldKey === fieldKey)) return;
    failed.push({ fieldKey, label: labelForFieldKey(fieldKey), reason: 'missing_profile_value' });
}

function addMissingProfileValueForAvailableProfileScope(failed, fieldKey, values) {
    if (!shouldReportMissingProfileValue(fieldKey, values)) return;
    addMissingProfileValue(failed, fieldKey);
}

function shouldReportMissingProfileValue(fieldKey, values) {
    const key = String(fieldKey ?? '');
    if (/^career\.careers\.(?:\*|\d+)\./.test(key)) {
        return values.some((value) => /^career\.careers\.\d+\./.test(String(value?.key ?? '')));
    }
    if (/^activities\.(?:\*|\d+)\./.test(key)) return false;
    return true;
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

function copyCandidatesFromValues(values, excludedFieldKeys = new Set(), allowedFieldKeys = null, fieldOrderMap = null) {
    const candidates = [];
    const seen = new Set();
    for (const value of values) {
        if (!value?.key) continue;
        const keepAsCopyCandidate = shouldKeepPersistentCopyCandidate(value.key, allowedFieldKeys);
        if (excludedFieldKeys.has(value.key) && !keepAsCopyCandidate) continue;
        if (!isAllowedCopyCandidateKey(value.key, allowedFieldKeys)) continue;
        const text = cleanText(value.value);
        if (!text) continue;
        const dedupeKey = `${value.key}|${normalize(text)}`;
        if (seen.has(dedupeKey)) continue;
        seen.add(dedupeKey);
        const displayOrder = fieldOrderMap?.get?.(value.key);
        const candidate = { key: value.key, label: value.label, value: text };
        if (Number.isFinite(displayOrder)) candidate.displayOrder = displayOrder;
        candidates.push(candidate);
    }
    return candidates;
}

function isAllowedCopyCandidateKey(key, allowedFieldKeys = null) {
    if (!allowedFieldKeys) return true;
    if (allowedFieldKeys.has(key)) return true;
    return key.startsWith('activities.') && allowedFieldKeys.has(ACTIVITY_COPY_CANDIDATE_MARKER);
}

function shouldKeepPersistentCopyCandidate(key, allowedFieldKeys = null) {
    return PERSISTENT_COPY_CANDIDATE_KEYS.has(key) && (!allowedFieldKeys || allowedFieldKeys.has(key));
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
            const candidate = { key: item.key, label: item.label, value };
            if (Number.isFinite(item.displayOrder)) candidate.displayOrder = item.displayOrder;
            candidates.push(candidate);
        }
    }
    return candidates;
}

function isManualCopyCandidate(item) {
    return Boolean(item?.fieldKey && cleanText(item.value) && ['disabled_control', 'control_not_ready', 'autofill_timeout', 'apply_failed', 'select_option_not_found'].includes(item.reason));
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
    const normalizedSignature = normalize(signature);
    if (signature.includes('yyyy.mm.dd') || signature.includes('yyyy.') ||
        normalizedSignature.includes(normalize('\uc785\ud559\uc77c')) ||
        normalizedSignature.includes(normalize('\uc878\uc5c5\uc77c')) ||
        normalizedSignature.includes(normalize('\uc7ac\ud559\uae30\uac04')) ||
        normalizedSignature.includes(normalize('\uc785\uc0ac\uc77c')) ||
        normalizedSignature.includes(normalize('\ud1f4\uc0ac\uc77c')) ||
        normalizedSignature.includes(normalize('\uadfc\ubb34\uae30\uac04'))) {
        return dateValue.replace(/-/g, '.');
    }
    if (signature.includes('yyyymmdd')) return dateValue.replace(/-/g, '');
    return dateValue;
}

function parseIsoDate(value) {
    const match = cleanText(value)?.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    return match ? `${match[1]}-${match[2]}-${match[3]}` : null;
}

function hasAutoFillTimeRemaining(deadlineAt) {
    return Date.now() < deadlineAt;
}

function boundedAutoFillWaitMs(timeoutMs, deadlineAt) {
    if (!Number.isFinite(deadlineAt)) return timeoutMs;
    return Math.max(0, Math.min(timeoutMs, deadlineAt - Date.now()));
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

function isEffectivelyDisabled(element) {
    if (!element) return true;
    if (element.disabled || element.getAttribute?.('aria-disabled') === 'true') return true;
    const disabledAncestor = element.closest?.('[disabled], [aria-disabled="true"]');
    return Boolean(disabledAncestor && disabledAncestor !== element);
}

function isHiddenElement(element) {
    let current = element;
    while (current && current.nodeType === Node.ELEMENT_NODE) {
        if (current.hidden || current.getAttribute?.('aria-hidden') === 'true') return true;
        const style = (current.getAttribute('style') ?? '').toLowerCase().replace(/\s+/g, '');
        if (style.includes('display:none') || style.includes('visibility:hidden')) return true;
        current = current.parentElement;
    }
    return false;
}

if (typeof chrome !== 'undefined' && chrome.runtime?.onMessage && !window.ezOneAutoFillApplicationLoaded) {
    window.ezOneAutoFillApplicationLoaded = true;
    chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
        if (!['EZONE_PREVIEW_APPLICATION_AUTOFILL', 'EZONE_APPLY_APPLICATION_AUTOFILL', 'EZONE_AUTOFILL_APPLICATION'].includes(message?.type)) {
            return false;
        }
        if (message.type === 'EZONE_PREVIEW_APPLICATION_AUTOFILL') {
            const plan = getApplicationAutoFillPlanForMessage(document, message.profile, { cacheResult: true });
            sendResponse(previewAutoFillPlan(plan));
            return true;
        }
        const plan = getApplicationAutoFillPlanForMessage(document, message.profile, { reuseCached: true });
        applyAutoFillPlanFastAsync(plan)
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
            })
            .finally(() => {
                applicationAutoFillPlanCache = null;
            });
        return true;
    });
}
