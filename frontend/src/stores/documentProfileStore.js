import { defineStore } from 'pinia';
import { computed, ref } from 'vue';
import { documentProfileApi } from '@/features/document-profile/api/documentProfileApi';
import { messageFromError } from '@/shared/errorMessage';
const emptyBasicInfo = {
    nameKo: '',
    nameEn: '',
    nameHanja: '',
    email: '',
    phone: '',
    gender: '',
    birthdate: '',
    address: '',
    addressDetail: ''
};
export const useDocumentProfileStore = defineStore('documentProfile', () => {
    const status = ref('idle');
    const profile = ref(null);
    const errorMessage = ref('');
    const basicInfo = computed(() => {
        return normalizeBasicInfo(profile.value?.sections.basicInfo);
    });
    const education = computed(() => normalizeReusableItems(profile.value?.sections.education));
    const career = computed(() => normalizeReusableItems(profile.value?.sections.career));
    const courses = computed(() => normalizeReusableItems(profile.value?.sections.courses));
    const projects = computed(() => normalizeReusableItems(profile.value?.sections.projects));
    const certificates = computed(() => normalizeReusableItems(profile.value?.sections.certificates));
    const awards = computed(() => normalizeReusableItems(profile.value?.sections.awards));
    const essays = computed(() => normalizeReusableItems(profile.value?.sections.essays));
    const military = computed(() => normalizeReusableItems(profile.value?.sections.military));
    const internships = computed(() => normalizeReusableItems(profile.value?.sections.internships));
    const trainings = computed(() => normalizeReusableItems(profile.value?.sections.trainings));
    const activities = computed(() => normalizeReusableItems(profile.value?.sections.activities));
    async function loadDocumentProfile() {
        status.value = 'loading';
        errorMessage.value = '';
        try {
            profile.value = await documentProfileApi.getDocumentProfile();
            status.value = 'ready';
        }
        catch (error) {
            status.value = 'error';
            profile.value = null;
            errorMessage.value = messageFromError(error, '서류 입력 정보를 불러오지 못했습니다.');
        }
    }
    async function saveBasicInfo(payload) {
        status.value = 'saving';
        errorMessage.value = '';
        try {
            profile.value = await documentProfileApi.saveSection('basicInfo', { ...payload });
            status.value = 'ready';
        }
        catch (error) {
            status.value = 'error';
            errorMessage.value = messageFromError(error, '기본 정보를 저장하지 못했습니다.');
        }
    }
    async function saveReusableSection(sectionType, payload) {
        status.value = 'saving';
        errorMessage.value = '';
        try {
            profile.value = await documentProfileApi.saveSection(sectionType, payload);
            status.value = 'ready';
        }
        catch (error) {
            status.value = 'error';
            errorMessage.value = messageFromError(error, '서류 섹션을 저장하지 못했습니다.');
        }
    }
    async function createCustomField(payload) {
        status.value = 'saving';
        errorMessage.value = '';
        try {
            const field = await documentProfileApi.createCustomField(payload);
            if (profile.value) {
                profile.value = {
                    ...profile.value,
                    customFields: [...profile.value.customFields, field]
                };
            }
            status.value = 'ready';
        }
        catch (error) {
            status.value = 'error';
            errorMessage.value = messageFromError(error, '커스텀 항목을 추가하지 못했습니다.');
        }
    }
    async function updateCustomField(fieldId, payload) {
        status.value = 'saving';
        errorMessage.value = '';
        try {
            const field = await documentProfileApi.updateCustomField(fieldId, payload);
            if (profile.value) {
                profile.value = {
                    ...profile.value,
                    customFields: profile.value.customFields.map((item) => (item.id === fieldId ? field : item))
                };
            }
            status.value = 'ready';
        }
        catch (error) {
            status.value = 'error';
            errorMessage.value = messageFromError(error, '커스텀 항목을 수정하지 못했습니다.');
        }
    }
    async function deleteCustomField(fieldId) {
        status.value = 'saving';
        errorMessage.value = '';
        try {
            await documentProfileApi.deleteCustomField(fieldId);
            if (profile.value) {
                profile.value = {
                    ...profile.value,
                    customFields: profile.value.customFields.filter((item) => item.id !== fieldId)
                };
            }
            status.value = 'ready';
        }
        catch (error) {
            status.value = 'error';
            errorMessage.value = messageFromError(error, '커스텀 항목을 삭제하지 못했습니다.');
        }
    }
    return {
        status,
        profile,
        errorMessage,
        basicInfo,
        education,
        career,
        courses,
        projects,
        certificates,
        awards,
        essays,
        military,
        internships,
        trainings,
        activities,
        loadDocumentProfile,
        saveBasicInfo,
        saveReusableSection,
        createCustomField,
        updateCustomField,
        deleteCustomField
    };
});
function normalizeBasicInfo(payload) {
    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
        return emptyBasicInfo;
    }
    const record = payload;
    return {
        nameKo: stringValue(record.nameKo),
        nameEn: stringValue(record.nameEn),
        nameHanja: stringValue(record.nameHanja),
        email: stringValue(record.email),
        phone: stringValue(record.phone),
        gender: stringValue(record.gender),
        birthdate: stringValue(record.birthdate),
        address: stringValue(record.address),
        addressDetail: stringValue(record.addressDetail)
    };
}
function stringValue(value) {
    return typeof value === 'string' ? value : '';
}
function normalizeReusableItems(payload) {
    if (!Array.isArray(payload)) {
        return [];
    }
    return payload.map((item) => {
        const record = typeof item === 'object' && item !== null ? item : {};
        return {
            title: stringValue(record.title),
            summary: stringValue(record.summary)
        };
    });
}
