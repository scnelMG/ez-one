import {
  defaultHttpClient,
  unwrapApiData,
  type ApiEnvelope,
  type HttpClient
} from '@/shared/apiClient'

export type DocumentSectionPayload = unknown

export interface DocumentCustomField {
  id: string
  label: string
  fieldType: string
  value: string
}

export type DocumentCustomFieldPayload = Omit<DocumentCustomField, 'id'>

export interface DocumentProfile {
  sections: Record<string, DocumentSectionPayload>
  customFields: DocumentCustomField[]
}

interface DocumentCustomFieldDto {
  id: number
  label: string
  fieldType: string
  value: string
}

interface DocumentProfileDto {
  sections: Record<string, DocumentSectionPayload>
  customFields: DocumentCustomFieldDto[]
}

type DocumentProfileHttpClient = Pick<HttpClient, 'get'> & Partial<Pick<HttpClient, 'put' | 'post' | 'patch' | 'delete'>>

export function createDocumentProfileApi(httpClient: DocumentProfileHttpClient = defaultHttpClient) {
  return {
    async getDocumentProfile(): Promise<DocumentProfile> {
      const response = await httpClient.get<ApiEnvelope<DocumentProfileDto>>('/api/document-profile')
      return toDocumentProfile(unwrapApiData(response.data))
    },

    async saveSection(sectionType: string, payload: DocumentSectionPayload): Promise<DocumentProfile> {
      const response = await httpClient.put!<ApiEnvelope<DocumentProfileDto>>(
        `/api/document-profile/sections/${sectionType}`,
        { payload }
      )
      return toDocumentProfile(unwrapApiData(response.data))
    },

    async createCustomField(payload: DocumentCustomFieldPayload): Promise<DocumentCustomField> {
      const response = await httpClient.post!<ApiEnvelope<DocumentCustomFieldDto>>(
        '/api/document-profile/custom-fields',
        payload
      )
      return toDocumentCustomField(unwrapApiData(response.data))
    },

    async updateCustomField(fieldId: string, payload: DocumentCustomFieldPayload): Promise<DocumentCustomField> {
      const response = await httpClient.patch!<ApiEnvelope<DocumentCustomFieldDto>>(
        `/api/document-profile/custom-fields/${fieldId}`,
        payload
      )
      return toDocumentCustomField(unwrapApiData(response.data))
    },

    async deleteCustomField(fieldId: string): Promise<void> {
      await httpClient.delete!<ApiEnvelope<null>>(`/api/document-profile/custom-fields/${fieldId}`)
    }
  }
}

function toDocumentProfile(dto: DocumentProfileDto): DocumentProfile {
  return {
    sections: dto.sections ?? {},
    customFields: (dto.customFields ?? []).map(toDocumentCustomField)
  }
}

function toDocumentCustomField(dto: DocumentCustomFieldDto): DocumentCustomField {
  return {
    id: String(dto.id),
    label: dto.label,
    fieldType: dto.fieldType,
    value: dto.value
  }
}

export const documentProfileApi = createDocumentProfileApi()
