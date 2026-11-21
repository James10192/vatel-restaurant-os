/** Marque d'ordre des octets : Excel ouvre alors le fichier en UTF-8 (accents corrects). */
const BOM = '\uFEFF'

/** Télécharge un texte CSV déjà construit (voir `csvRows`), sans passer par le serveur ni une URL partageable. */
export function downloadCsv(filename: string, csv: string) {
  const url = URL.createObjectURL(new Blob([BOM, csv], { type: 'text/csv;charset=utf-8' }))
  Object.assign(document.createElement('a'), { href: url, download: filename }).click()
  URL.revokeObjectURL(url)
}
