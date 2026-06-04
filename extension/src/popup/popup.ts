import type { ExtractedJobPosting } from '../content/jobExtractor'
import { createExtensionJobApi } from '../shared/api/extensionJobApi'
import { ACCESS_TOKEN_KEY, buildWebLoginUrl, getStoredSession } from '../shared/auth/extensionAuth'
import './popup.css'

type SavedBasketJob = {
  id?: number
  companyName?: string
  positionTitle?: string
  workspaceId?: number
}

const apiBaseUrl = import.meta.env.VITE_EXTENSION_API_BASE_URL ?? 'http://localhost:8080/api'
const webAppUrl = import.meta.env.VITE_EXTENSION_WEB_APP_URL ?? 'http://localhost:5173'

const statusPanel = requireElement('status-panel')
const loginPanel = requireElement('login-panel')
const featurePanel = requireElement('feature-panel')
const previewPanel = requireElement('preview-panel')
const resultPanel = requireElement('result-panel')
const statusMessage = requireElement('status-message')
const loginButton = requireElement('login-button') as HTMLButtonElement
const jobSaveModeButton = requireElement('job-save-mode-button') as HTMLButtonElement
const saveButton = requireElement('save-button') as HTMLButtonElement
const companyNameInput = requireElement('company-name-input') as HTMLInputElement
const positionTitleInput = requireElement('position-title-input') as HTMLInputElement
const deadlineLabelInput = requireElement('deadline-label-input') as HTMLInputElement
const roleOptions = requireElement('role-options')
const basketLink = requireElement('basket-link') as HTMLAnchorElement
const savedJobList = requireElement('saved-job-list')

let currentPosting: ExtractedJobPosting | null = null

const jobApi = createExtensionJobApi({
  apiBaseUrl,
  getAccessToken: async () => {
    const values = await chrome.storage.local.get([ACCESS_TOKEN_KEY])
    const token = values[ACCESS_TOKEN_KEY]
    return typeof token === 'string' ? token : null
  }
})

setStaticLinks()

loginButton.addEventListener('click', async () => {
  const tab = await getActiveTab()
  const loginUrl = buildWebLoginUrl({
    webAppUrl,
    currentUrl: tab.url ?? ''
  })
  await chrome.tabs.create({ url: loginUrl.toString() })
  setStatus('웹 로그인 완료 후 이 팝업을 다시 열어 주세요.')
})

jobSaveModeButton.addEventListener('click', () => {
  void loadPreview()
})

saveButton.addEventListener('click', async () => {
  if (!currentPosting) {
    return
  }

  const selectedRoles = Array.from(roleOptions.querySelectorAll<HTMLInputElement>('input:checked'))
    .map((item) => item.value)

  if (selectedRoles.length === 0) {
    setStatus('저장할 직무를 하나 이상 선택해 주세요.', true)
    return
  }

  try {
    saveButton.disabled = true
    saveButton.textContent = '저장 중'
    const savedJobs = await jobApi.save({
      ...currentPosting,
      companyName: normalizeInput(companyNameInput.value),
      positionTitle: normalizeInput(positionTitleInput.value),
      deadlineLabel: normalizeInput(deadlineLabelInput.value),
      selectedRoles
    }) as SavedBasketJob[]
    const firstWorkspaceId = savedJobs[0]?.workspaceId
    basketLink.href = `${webAppUrl}/basket`
    requireElement('result-message').textContent = firstWorkspaceId
      ? '선택한 직무가 장바구니와 워크스페이스에 저장되었습니다.'
      : '이미 저장된 공고를 확인했습니다.'
    renderSavedJobs(savedJobs, currentPosting)
    showPanel(resultPanel)
  } catch (error) {
    setStatus(error instanceof Error ? error.message : '저장에 실패했습니다.', true)
  } finally {
    saveButton.disabled = false
    saveButton.textContent = '선택한 공고 장바구니에 담기'
  }
})

void init()

async function init() {
  const session = await getStoredSession(chrome.storage.local)

  if (!session) {
    showPanel(loginPanel)
    return
  }

  showPanel(featurePanel)
}

async function loadPreview() {
  try {
    setStatus('현재 페이지에서 공고 정보를 읽고 있습니다.')
    const tab = await getActiveTab()

    if (!tab.id || !tab.url?.includes('jasoseol.com')) {
      setStatus('자소설닷컴 공고 페이지에서 사용할 수 있습니다.', true)
      return
    }

    const posting = await chrome.tabs.sendMessage<unknown, ExtractedJobPosting>(tab.id, {
      type: 'EZONE_EXTRACT_JOB'
    })
    currentPosting = posting
    await jobApi.preview(posting)
    renderPosting(posting)
    showPanel(previewPanel)
  } catch (error) {
    setStatus(error instanceof Error ? error.message : '공고 정보를 추출하지 못했습니다.', true)
  }
}

function renderPosting(posting: ExtractedJobPosting) {
  companyNameInput.value = posting.companyName ?? ''
  positionTitleInput.value = posting.positionTitle ?? ''
  deadlineLabelInput.value = posting.deadlineLabel ?? ''

  const roles = posting.roleOptions.length > 0
    ? posting.roleOptions
    : [posting.positionTitle ?? '선택 직무']

  roleOptions.replaceChildren(...roles.map((role, index) => {
    const label = document.createElement('label')
    const input = document.createElement('input')
    const labelText = document.createElement('span')

    input.type = 'checkbox'
    input.value = role
    input.checked = index === 0
    labelText.textContent = role
    label.append(input, labelText)
    return label
  }))
}

function normalizeInput(value: string) {
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : null
}

function renderSavedJobs(savedJobs: SavedBasketJob[], posting: ExtractedJobPosting) {
  const items = savedJobs.length > 0
    ? savedJobs
    : [{ companyName: posting.companyName, positionTitle: posting.positionTitle }]

  savedJobList.replaceChildren(...items.map((job) => {
    const item = document.createElement('li')
    const company = document.createElement('span')
    const title = document.createElement('strong')

    company.textContent = job.companyName ?? posting.companyName ?? '회사 확인 필요'
    title.textContent = job.positionTitle ?? posting.positionTitle ?? '공고 확인 필요'
    item.append(company, title)
    return item
  }))
}

async function getActiveTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
  if (!tab) {
    throw new Error('현재 탭을 찾지 못했습니다.')
  }

  return tab
}

function showPanel(panel: HTMLElement) {
  for (const item of [statusPanel, loginPanel, featurePanel, previewPanel, resultPanel]) {
    item.hidden = item !== panel
  }
}

function setStatus(message: string, isError = false) {
  statusMessage.textContent = message
  statusPanel.classList.toggle('is-error', isError)
  showPanel(statusPanel)
}

function setStaticLinks() {
  for (const id of ['home-link', 'web-link', 'result-web-link']) {
    const link = requireElement(id) as HTMLAnchorElement
    link.href = webAppUrl
  }
}

function requireElement(id: string) {
  const element = document.getElementById(id)
  if (!element) {
    throw new Error(`Missing element: ${id}`)
  }

  return element
}
