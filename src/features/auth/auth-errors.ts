const MESSAGES: Record<string, string> = {
  INVALID_EMAIL_OR_PASSWORD: 'E-mail ou mot de passe incorrect.',
  INVALID_EMAIL: 'Adresse e-mail invalide.',
  INVALID_PASSWORD: 'Mot de passe actuel incorrect.',
  PASSWORD_TOO_SHORT:'Le mot de passe doit contenir au moins 8 caractères.',
  USER_ALREADY_EXISTS: 'Un compte existe déjà avec cet e-mail.',
  USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL: 'Un compte existe déjà avec cet e-mail.',
}

const FALLBACK = 'Échec. Vérifiez vos informations et votre connexion internet.'

export function authErrorMessage(error: { code?: string; status?: number }): string {
  if (error.status === 429) return 'Trop de tentatives. Réessayez dans un instant.'
  return (error.code && MESSAGES[error.code]) || FALLBACK
}
