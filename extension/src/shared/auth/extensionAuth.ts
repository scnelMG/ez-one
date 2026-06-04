export interface ExtensionAuthStorage {
  get(keys: string[] | Record<string, unknown>): Promise<Record<string, unknown>>
  set(values: Record<string, unknown>): Promise<void>
  remove(keys: string[]): Promise<void>
}

export interface ExtensionSession {
  accessToken: string
  refreshToken: string
  user: unknown
}

export const ACCESS_TOKEN_KEY = 'ezoneAccessToken'
export const REFRESH_TOKEN_KEY = 'ezoneRefreshToken'
export const CURRENT_USER_KEY = 'ezoneCurrentUser'

export function buildWebLoginUrl({
  webAppUrl,
  currentUrl
}: {
  webAppUrl: string
  currentUrl: string
}) {
  const url = new URL('/', webAppUrl)
  const connectPath = `/extension/connect?sourceUrl=${encodeURIComponent(currentUrl)}`
  url.searchParams.set('redirect', connectPath)
  return url
}

export async function handleExternalAuthMessage(storage: ExtensionAuthStorage, message: unknown) {
  if (!isAuthMessage(message)) {
    return false
  }

  await storage.set({
    [ACCESS_TOKEN_KEY]: message.accessToken,
    [REFRESH_TOKEN_KEY]: message.refreshToken,
    [CURRENT_USER_KEY]: message.user
  })
  return true
}

export async function getStoredSession(storage: ExtensionAuthStorage): Promise<ExtensionSession | null> {
  const values = await storage.get([ACCESS_TOKEN_KEY, REFRESH_TOKEN_KEY, CURRENT_USER_KEY])
  const accessToken = values[ACCESS_TOKEN_KEY]
  const refreshToken = values[REFRESH_TOKEN_KEY]

  if (typeof accessToken !== 'string' || typeof refreshToken !== 'string') {
    return null
  }

  return {
    accessToken,
    refreshToken,
    user: values[CURRENT_USER_KEY]
  }
}

export async function clearStoredSession(storage: ExtensionAuthStorage) {
  await storage.remove([ACCESS_TOKEN_KEY, REFRESH_TOKEN_KEY, CURRENT_USER_KEY])
}

function isAuthMessage(message: unknown): message is ExtensionSession & { type: 'EZONE_EXTENSION_AUTH_SESSION' } {
  if (!message || typeof message !== 'object') {
    return false
  }

  const value = message as Record<string, unknown>
  return value.type === 'EZONE_EXTENSION_AUTH_SESSION' &&
    typeof value.accessToken === 'string' &&
    typeof value.refreshToken === 'string'
}
