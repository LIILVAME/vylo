import { useToastStore } from '@/stores/toastStore'
import { useDiagnosticStore } from '@/stores/diagnosticStore'
import { isRetryableError } from './retry'
import { canAttempt, recordSuccess, recordFailure, getState } from './circuitBreaker'

/**
 * Gestionnaire d'erreur centralisé pour les appels API Supabase
 * @param {Error|Object} error - L'erreur retournée par Supabase ou une erreur JavaScript
 * @param {string} context - Contexte de l'erreur (ex: "fetchProperties", "createPayment")
 * @returns {Object} { success: false, message: string }
 */
export function handleApiError(error, context = '') {
  // Log l'erreur pour le debugging
  console.warn(`[API ERROR] ${context}`, error)

  // Détermine le message d'erreur
  let message = 'Erreur API inconnue'

  if (error?.message) {
    message = error.message
  } else if (typeof error === 'string') {
    message = error
  } else if (error?.error_description) {
    message = error.error_description
  }

  // Messages d'erreur plus conviviaux pour les cas courants
  const userFriendlyMessages = {
    'Network request failed': 'Erreur réseau. Vérifiez votre connexion internet.',
    'Failed to fetch': 'Erreur réseau. Vérifiez votre connexion internet.',
    'JWT expired': 'Votre session a expiré. Veuillez vous reconnecter.',
    'Invalid API key': 'Erreur de configuration. Contactez le support.',
    'new row violates row-level security policy':
      "Action non autorisée. Vous n'avez pas les droits nécessaires.",
    'duplicate key value violates unique constraint': 'Cette valeur existe déjà.',
    'foreign key constraint fails': 'Impossible de supprimer : des données sont liées.',
    'null value in column': 'Des champs obligatoires sont manquants.'
  }

  // Remplace par un message plus convivial si disponible
  const friendlyMessage = Object.keys(userFriendlyMessages).find(key =>
    message.toLowerCase().includes(key.toLowerCase())
  )

  if (friendlyMessage) {
    message = userFriendlyMessages[friendlyMessage]
  }

  // Enregistre l'erreur dans le diagnosticStore
  try {
    const diagnosticStore = useDiagnosticStore()
    diagnosticStore.recordError(error, { context, message })
  } catch (diagError) {
    // Si le diagnosticStore n'est pas disponible, on continue
    console.warn("Impossible d'enregistrer dans diagnosticStore:", diagError)
  }

  // Affiche un toast d'erreur (si le toastStore est disponible)
  try {
    const toastStore = useToastStore()
    if (toastStore) {
      toastStore.error(message)
    }
  } catch (toastError) {
    // Si le toastStore n'est pas disponible, on continue sans toast
    console.warn("Impossible d'afficher un toast:", toastError)
  }

  // Capture les erreurs critiques dans Sentry (si configuré)
  try {
    const sentryDsn = import.meta.env.VITE_SENTRY_DSN
    if (sentryDsn && window.Sentry) {
      window.Sentry.captureException(error, {
        tags: { context },
        extra: { message, userMessage: message }
      })
    }
  } catch (sentryError) {
    // Sentry non disponible, on continue
  }

  return {
    success: false,
    message,
    error
  }
}

/**
 * Wrapper pour les appels API avec gestion d'erreur automatique et retry
 * @param {Function} apiCall - Fonction async qui retourne { data, error }
 * @param {string} context - Contexte pour les logs
 * @returns {Promise<Object>} { success: boolean, data?: any, error?: Error, retries?: number }
 */
export async function withErrorHandling(apiCall, context = '', options = {}) {
  const { retry } = await import('./retry')
  const { useConnectionStore } = await import('@/stores/connectionStore')
  const { useToastStore } = await import('@/stores/toastStore')
  const diagnosticStore = useDiagnosticStore()

  const connectionStore = useConnectionStore()
  const toastStore = useToastStore()

  // Démarre la mesure de latence
  const startTime = performance.now()
  const endpoint = context || 'unknown'

  // Vérifie le circuit breaker avant d'essayer
  const circuitCheck = canAttempt(endpoint)
  if (!circuitCheck.allowed) {
    const circuitState = getState(endpoint)
    return {
      success: false,
      error: new Error(circuitCheck.reason || 'Circuit breaker ouvert'),
      message: `Service temporairement indisponible. ${circuitCheck.reason || 'Réessayez plus tard.'}`,
      circuitBreakerOpen: true,
      nextAttemptTime: circuitState.nextAttemptTime
    }
  }

  // Timeout par défaut : 10 secondes pour éviter les blocages
  const timeout = options.timeout || 10000

  // Fonction wrapper pour le retry avec timeout
  const wrappedApiCall = async () => {
    try {
      // Ajoute un timeout pour éviter les blocages prolongés
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(
          () => reject(new Error(`Timeout: l'opération a pris plus de ${timeout}ms`)),
          timeout
        )
      })

      const result = await Promise.race([apiCall(), timeoutPromise])

      if (result.error) {
        // Vérifie si l'erreur est réessayable
        if (isRetryableError(result.error)) {
          // Retourne un objet avec success: false pour déclencher le retry
          return {
            success: false,
            error: result.error,
            message: result.error.message || 'Network error'
          }
        }
        // Erreur non réessayable, retourne directement
        return handleApiError(result.error, context)
      }

      // Succès
      return {
        success: true,
        data: result.data
      }
    } catch (error) {
      // Erreur non réessayable, retourne directement
      if (!isRetryableError(error)) {
        return handleApiError(error, context)
      }
      // Erreur réessayable, retourne pour le retry
      return {
        success: false,
        error,
        message: error.message || 'Network error'
      }
    }
  }

  // Si on n'est pas en ligne, ne pas essayer
  if (!connectionStore.isOnline) {
    return {
      success: false,
      error: new Error('No internet connection'),
      message: 'Pas de connexion internet'
    }
  }

  // Affiche un toast de reconnexion si nécessaire
  let retryToastShown = false
  const showRetryToast = () => {
    if (!retryToastShown && toastStore) {
      toastStore.info('Tentative de reconnexion...')
      retryToastShown = true
    }
  }

  // Exécute avec retry pour les erreurs réseau
  // Réduit les délais pour éviter les ralentissements (3 tentatives max : 300ms, 600ms, 1200ms = max 2.1s)
  const retryResult = await retry(wrappedApiCall, {
    maxRetries: 2, // Réduit à 2 tentatives (total 3 avec la première)
    initialDelay: 300, // Réduit à 300ms
    maxDelay: 1200, // Réduit à 1.2s max
    shouldRetry: error => {
      // Réessaye seulement pour les erreurs réseau
      if (isRetryableError(error)) {
        showRetryToast()
        return true
      }
      return false
    }
  })

  // Si le retry a échoué après toutes les tentatives
  if (!retryResult.success && retryResult.retries > 0) {
    if (toastStore) {
      toastStore.error('Connexion perdue. Vérifiez votre réseau.')
    }
    connectionStore.setOnline(false)
  }

  // Calcule et enregistre la latence
  const duration = performance.now() - startTime
  diagnosticStore.trackLatency(endpoint, duration)

  // Avertit si la latence est élevée (plus de 3 secondes)
  if (duration > 3000) {
    console.warn(`[API] Latence élevée pour ${endpoint}: ${Math.round(duration)}ms`)
    diagnosticStore.logEvent('warning', `Latence élevée: ${endpoint} (${Math.round(duration)}ms)`, {
      endpoint,
      duration
    })
  }

  // Si succès, met à jour la connexion et enregistre le succès
  if (retryResult.success) {
    connectionStore.setOnline(true)
    diagnosticStore.recordSuccess(endpoint)
    recordSuccess(endpoint) // Enregistre le succès dans le circuit breaker
    if (retryToastShown && toastStore) {
      // Le toast "reconnexion" sera automatiquement remplacé par le toast de succès de l'API
    }
  } else {
    // Enregistre l'échec dans le circuit breaker
    recordFailure(endpoint, retryResult.error || new Error(retryResult.message || 'Unknown error'))
  }

  return retryResult
}
