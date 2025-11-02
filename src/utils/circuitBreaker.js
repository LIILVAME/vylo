/**
 * Circuit Breaker Pattern pour éviter les appels répétés en cas d'erreur système
 *
 * Le circuit breaker a 3 états :
 * - CLOSED : Normal, les appels passent
 * - OPEN : Trop d'erreurs, bloque temporairement les appels
 * - HALF_OPEN : Teste si le service est de nouveau disponible
 */

const CIRCUIT_STATES = {
  CLOSED: 'CLOSED',
  OPEN: 'OPEN',
  HALF_OPEN: 'HALF_OPEN'
}

/**
 * Configuration par défaut du circuit breaker
 */
const DEFAULT_CONFIG = {
  failureThreshold: 5, // Nombre d'erreurs avant d'ouvrir le circuit
  resetTimeout: 60000, // Temps en ms avant de passer en HALF_OPEN (60s)
  monitoringPeriod: 60000 // Période de monitoring en ms (60s)
}

/**
 * État du circuit breaker par endpoint
 */
const circuitStates = new Map()

/**
 * Historique des erreurs par endpoint
 */
const errorHistory = new Map()

/**
 * Initialise ou récupère l'état du circuit breaker pour un endpoint
 * @param {string} endpoint - Nom de l'endpoint (ex: 'getProperties', 'createPayment')
 * @param {Object} config - Configuration du circuit breaker
 * @returns {Object} État du circuit breaker
 */
function getCircuitState(endpoint, config = {}) {
  const finalConfig = { ...DEFAULT_CONFIG, ...config }

  if (!circuitStates.has(endpoint)) {
    circuitStates.set(endpoint, {
      state: CIRCUIT_STATES.CLOSED,
      failureCount: 0,
      lastFailureTime: null,
      nextAttemptTime: null,
      successCount: 0,
      config: finalConfig
    })
    errorHistory.set(endpoint, [])
  }

  return circuitStates.get(endpoint)
}

/**
 * Enregistre un succès pour un endpoint
 * @param {string} endpoint - Nom de l'endpoint
 */
export function recordSuccess(endpoint) {
  const state = getCircuitState(endpoint)

  if (state.state === CIRCUIT_STATES.HALF_OPEN) {
    // Si on est en HALF_OPEN et qu'on a un succès, on ferme le circuit
    state.state = CIRCUIT_STATES.CLOSED
    state.failureCount = 0
    state.successCount = 0
    state.lastFailureTime = null
    state.nextAttemptTime = null
    console.log(`[CIRCUIT BREAKER] ${endpoint}: Circuit fermé après succès en HALF_OPEN`)
  } else if (state.state === CIRCUIT_STATES.CLOSED) {
    // Réinitialise le compteur d'erreurs après un succès
    state.failureCount = 0
    state.successCount++

    // Nettoie l'historique des erreurs anciennes (plus de monitoringPeriod)
    const now = Date.now()
    const history = errorHistory.get(endpoint) || []
    errorHistory.set(
      endpoint,
      history.filter(error => now - error.timestamp < state.config.monitoringPeriod)
    )
  }
}

/**
 * Enregistre une erreur pour un endpoint
 * @param {string} endpoint - Nom de l'endpoint
 * @param {Error} error - L'erreur survenue
 */
export function recordFailure(endpoint, error) {
  const state = getCircuitState(endpoint)
  const now = Date.now()

  // Ajoute l'erreur à l'historique
  const history = errorHistory.get(endpoint) || []
  history.push({ timestamp: now, error })

  // Garde seulement les erreurs dans la période de monitoring
  const recentHistory = history.filter(err => now - err.timestamp < state.config.monitoringPeriod)
  errorHistory.set(endpoint, recentHistory)

  // Met à jour le compteur d'erreurs
  state.failureCount = recentHistory.length
  state.lastFailureTime = now

  // Si on dépasse le seuil, ouvre le circuit
  if (state.failureCount >= state.config.failureThreshold) {
    if (state.state === CIRCUIT_STATES.CLOSED || state.state === CIRCUIT_STATES.HALF_OPEN) {
      state.state = CIRCUIT_STATES.OPEN
      state.nextAttemptTime = now + state.config.resetTimeout
      console.warn(
        `[CIRCUIT BREAKER] ${endpoint}: Circuit ouvert après ${state.failureCount} erreurs`
      )
      console.warn(
        `[CIRCUIT BREAKER] ${endpoint}: Prochaine tentative dans ${state.config.resetTimeout}ms`
      )
    }
  }
}

/**
 * Vérifie si le circuit breaker permet un appel pour un endpoint
 * @param {string} endpoint - Nom de l'endpoint
 * @returns {Object} { allowed: boolean, reason?: string }
 */
export function canAttempt(endpoint) {
  const state = getCircuitState(endpoint)
  const now = Date.now()

  // Circuit fermé : autorisé
  if (state.state === CIRCUIT_STATES.CLOSED) {
    return { allowed: true }
  }

  // Circuit ouvert : vérifie si on peut tenter HALF_OPEN
  if (state.state === CIRCUIT_STATES.OPEN) {
    if (now >= state.nextAttemptTime) {
      // Passe en HALF_OPEN pour tester
      state.state = CIRCUIT_STATES.HALF_OPEN
      state.successCount = 0
      console.log(`[CIRCUIT BREAKER] ${endpoint}: Passage en HALF_OPEN pour test`)
      return { allowed: true }
    }

    // Toujours ouvert, attendre
    const waitTime = Math.ceil((state.nextAttemptTime - now) / 1000)
    return {
      allowed: false,
      reason: `Circuit ouvert. Réessayer dans ${waitTime}s`
    }
  }

  // HALF_OPEN : autorisé pour tester
  if (state.state === CIRCUIT_STATES.HALF_OPEN) {
    return { allowed: true }
  }

  return { allowed: true }
}

/**
 * Réinitialise manuellement le circuit breaker pour un endpoint
 * @param {string} endpoint - Nom de l'endpoint
 */
export function reset(endpoint) {
  if (circuitStates.has(endpoint)) {
    const state = circuitStates.get(endpoint)
    state.state = CIRCUIT_STATES.CLOSED
    state.failureCount = 0
    state.successCount = 0
    state.lastFailureTime = null
    state.nextAttemptTime = null
    errorHistory.set(endpoint, [])
    console.log(`[CIRCUIT BREAKER] ${endpoint}: Circuit réinitialisé manuellement`)
  }
}

/**
 * Obtient l'état actuel du circuit breaker pour un endpoint
 * @param {string} endpoint - Nom de l'endpoint
 * @returns {Object} État du circuit breaker
 */
export function getState(endpoint) {
  const state = getCircuitState(endpoint)
  const history = errorHistory.get(endpoint) || []

  return {
    state: state.state,
    failureCount: state.failureCount,
    successCount: state.successCount,
    lastFailureTime: state.lastFailureTime,
    nextAttemptTime: state.nextAttemptTime,
    recentErrors: history.length,
    config: state.config
  }
}

/**
 * Obtient les statistiques de tous les circuits breakers
 * @returns {Object} Statistiques de tous les endpoints
 */
export function getAllStates() {
  const states = {}

  circuitStates.forEach((state, endpoint) => {
    states[endpoint] = getState(endpoint)
  })

  return states
}
