import {
  defaultHttpClient,
  unwrapApiData,
  type ApiEnvelope,
  type HttpClient
} from '@/shared/apiClient'

export type DocumentSectionPayload = Record<string, unknown>

export interface DocumentCustomField {
  id: string
  label: string
  fieldType: string
  value: string
}

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

type DocumentProfileHttpClient = Pick<HttpClient, 'get' | 'put'>

export function createDocumentProfileApi(httpClient: DocumentProfileHttpClient = defaultHttpClient) {
  return {
    async getDocumentProfile(): Promise<DocumentProfile> {
      const response = await httpClient.get<ApiEnvelope<DocumentProfileDto>>('/api/document-profile')
      return toDocumentProfile(unwrapApiData(response.data))
    },

    async saveSection(sectionType: string, payload: DocumentSectionPayload): Promise<DocumentProfile> {
      const response = await httpClient.put<ApiEnvelope<DocumentProfileDto>>(
        `/api/document-profile/sections/${sectionType}`,
        { payload }
      )
      return toDocumentProfile(unwrapApiData(response.data))
    }
  }
}

function toDocumentProfile(dto: DocumentProfileDto): DocumentProfile {
  return {
    sections: dto.sections ?? {},
    customFields: (dto.customFields ?? []).map((field) => ({
      id: String(field.id),
      label: field.label,
      fieldType: field.fieldType,
      value: field.value
    }))
  }
}

export const documentProfileApi = createDocumentProfileApi()
