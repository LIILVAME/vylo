/**
 * Utilitaires de formatage pour l'application Doogoo
 * Évite la duplication de code entre les composants
 */

/**
 * Cache pour le store settings (évite les imports circulaires)
 * Sera initialisé lors de la première utilisation
 */
let settingsStoreCache = null

/**
 * Récupère le store settings de manière synchrone
 * @returns {Object|null} Le store settings ou null si non disponible
 */
function getSettingsStore() {
  if (settingsStoreCache) {
    return settingsStoreCache
  }

  try {
    // Essaie de récupérer le store depuis un contexte Vue si disponible
    // Dans les composants Vue, on peut utiliser useSettingsStore() directement
    // Cette fonction est utilisée dans des contextes non-Vue (utils)
    if (typeof window !== 'undefined' && window.__doogoo_settingsStore) {
      settingsStoreCache = window.__doogoo_settingsStore
      return settingsStoreCache
    }
  } catch (_error) {
    // Ignore les erreurs
  }

  return null
}

/**
 * Définit le store settings dans le cache (appelé depuis les composants)
 * @param {Object} store - Le store settings
 */
export function setSettingsStoreCache(store) {
  settingsStoreCache = store
  if (typeof window !== 'undefined') {
    window.__doogoo_settingsStore = store
  }
}

/**
 * Formate un montant selon la devise sélectionnée dans settingsStore
 * @param {number} amount - Montant à formater
 * @param {Object} options - Options de formatage
 * @param {string} options.currency - Devise à utiliser (optionnel, utilise celle du store par défaut)
 * @param {string} options.locale - Locale pour le formatage (optionnel)
 * @returns {string} Montant formaté
 */
export function formatCurrency(amount, options = {}) {
  if (amount === null || amount === undefined) {
    return '-'
  }

  // Si une devise est explicitement fournie dans les options, l'utiliser directement
  let currency = options.currency || 'EUR'
  let locale = options.locale || 'fr-FR'

  // Si aucune devise explicite, essaie de récupérer depuis le store
  if (!options.currency) {
    const store = getSettingsStore()
    if (store && store.currency) {
      currency = store.currency
    }
  }

  // Détermine la locale selon la devise
  if (currency === 'XOF') {
    locale = 'fr-FR'
  } else if (currency === 'USD') {
    locale = 'en-US'
  } else if (currency === 'GBP') {
    locale = 'en-GB'
  } else {
    locale = options.locale || 'fr-FR'
  }

  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: options.minimumFractionDigits ?? 0,
    maximumFractionDigits: options.maximumFractionDigits ?? 2,
    ...options
  }).format(amount)
}

/**
 * Formate une date au format français
 * @param {string|Date} dateString - Date à formater (ISO string ou Date)
 * @param {Object} options - Options de formatage
 * @returns {string} Date formatée (ex: "15 déc. 2024")
 */
export function formatDate(dateString, options = {}) {
  if (!dateString) return '-'

  const date = dateString instanceof Date ? dateString : new Date(dateString)

  // Vérifier si la date est valide
  if (isNaN(date.getTime())) {
    console.warn('Invalid date:', dateString)
    return '-'
  }

  const defaultOptions = {
    day: 'numeric',
    month: options.shortMonth ? 'short' : 'long',
    year: 'numeric',
    ...options
  }

  return date.toLocaleDateString('fr-FR', defaultOptions)
}

/**
 * Formate une date relative (ex: "Il y a 2 jours")
 * @param {string|Date} dateString - Date à formater
 * @returns {string} Date relative formatée
 */
export function formatRelativeDate(dateString) {
  if (!dateString) return '-'

  const date = dateString instanceof Date ? dateString : new Date(dateString)

  if (isNaN(date.getTime())) return '-'

  const now = new Date()
  const diffInMs = now - date
  const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24))

  if (diffInDays === 0) return "Aujourd'hui"
  if (diffInDays === 1) return 'Hier'
  if (diffInDays < 7) return `Il y a ${diffInDays} jours`
  if (diffInDays < 30) return `Il y a ${Math.floor(diffInDays / 7)} semaines`
  if (diffInDays < 365) return `Il y a ${Math.floor(diffInDays / 30)} mois`
  return `Il y a ${Math.floor(diffInDays / 365)} ans`
}

/**
 * Formate un numéro de téléphone français
 * @param {string} phone - Numéro de téléphone
 * @returns {string} Numéro formaté (ex: "06 12 34 56 78")
 */
export function formatPhone(phone) {
  if (!phone) return '-'

  // Supprimer tous les caractères non numériques
  const cleaned = phone.replace(/\D/g, '')

  // Formater selon le format français
  if (cleaned.length === 10) {
    return cleaned.replace(/(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})/, '$1 $2 $3 $4 $5')
  }

  return phone
}
