const PROBE_ORIGIN = 'https://vatel.invalid'
// Caractères de contrôle (dont tabulation et sauts de ligne, ignorés par les navigateurs dans les URL).
// eslint-disable-next-line no-control-regex -- détection volontaire des caractères de contrôle
const CONTROL_CHARS = /[\u0000-\u001f\u007f]/

/**
 * Chemin de redirection interne sûr, ou undefined.
 * Refuse tout ce qu'un navigateur pourrait résoudre vers un autre site : `//hôte`, `/\hôte`,
 * antislash, caractères de contrôle, schémas (`javascript:`), encodages de ces cas.
 */
export function safeRedirectPath(value: unknown): string | undefined {
  if (typeof value !== 'string' || value.length === 0 || value.length > 512) return undefined
  if (!value.startsWith('/') || value.includes('\\') || CONTROL_CHARS.test(value)) return undefined
  let decoded: string
  try {
    decoded = decodeURIComponent(value)
  } catch {
    return undefined
  }
  if (decoded.startsWith('//') || decoded.includes('\\') || CONTROL_CHARS.test(decoded)) return undefined
  const url = new URL(value, PROBE_ORIGIN)
  if (url.origin !== PROBE_ORIGIN) return undefined
  return `${url.pathname}${url.search}${url.hash}`
}
