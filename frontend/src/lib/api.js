import { withLang } from '../i18n'

export function apiUrl(path, locale) {
  return withLang(path, locale)
}

export async function apiFetch(path, locale, options = {}) {
  return fetch(apiUrl(path, locale), options)
}

export function apiJsonBody(body, locale) {
  return JSON.stringify({ ...body, lang: locale })
}
