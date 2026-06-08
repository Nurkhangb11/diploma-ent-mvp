import { withLang, normalizeLocale } from '../i18n'

export function apiFetch(url, locale, init) {
  return fetch(withLang(url, locale), init)
}

export function apiJsonBody(data, locale) {
  return JSON.stringify({
    ...data,
    lang: normalizeLocale(locale),
  })
}

export function authHeaders(token) {
  return {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  }
}
