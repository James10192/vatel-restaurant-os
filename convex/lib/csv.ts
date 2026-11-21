/**
 * Export tableur (séparateur « ; », lu par Excel en français). Chaque cellule est entre guillemets ; un texte
 * qui commence par = + - @ (ou une tabulation) est préfixé d'une apostrophe pour qu'Excel ne l'exécute jamais
 * comme une formule (nom de fournisseur ou de plat saisi librement).
 */
export function csvCell(value: string | number | null | undefined): string {
  const text = String(value ?? '')
  const safe = typeof value === 'string' && /^[=+\-@\t\r]/.test(text) ? `'${text}` : text
  return `"${safe.replace(/"/g, '""')}"`
}

export const csvRows = (rows: Array<Array<string | number | null | undefined>>) => rows.map((row) => row.map(csvCell).join(';')).join('\r\n')
