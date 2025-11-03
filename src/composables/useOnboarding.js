import { ref, computed } from 'vue'

/**
 * Composable pour gérer l'onboarding progressif
 * Stocke la progression dans localStorage
 */
export function useOnboarding() {
  const currentStep = ref(null)
  const isActive = ref(false)
  const steps = ref([])

  /**
   * Clés de progression dans localStorage
   */
  const STORAGE_KEYS = {
    completed: 'onboarding_completed',
    currentStep: 'onboarding_current_step',
    dismissed: 'onboarding_dismissed'
  }

  /**
   * Vérifie si l'onboarding a déjà été complété
   */
  const isCompleted = computed(() => {
    return localStorage.getItem(STORAGE_KEYS.completed) === 'true'
  })

  /**
   * Vérifie si l'onboarding a été rejeté par l'utilisateur
   */
  const isDismissed = computed(() => {
    return localStorage.getItem(STORAGE_KEYS.dismissed) === 'true'
  })

  /**
   * Vérifie si l'onboarding doit être affiché
   */
  const shouldShow = computed(() => {
    return !isCompleted.value && !isDismissed.value && isActive.value && currentStep.value !== null
  })

  /**
   * Initialise l'onboarding avec une liste d'étapes
   * @param {Array} stepsList - Liste des étapes [{ id, target, title, content, placement }]
   * @param {boolean} activate - Si true, active immédiatement l'onboarding (défaut: true)
   */
  const init = (stepsList, activate = true) => {
    steps.value = stepsList

    // Récupère la dernière étape enregistrée
    const savedStep = localStorage.getItem(STORAGE_KEYS.currentStep)
    if (savedStep && stepsList.find(s => s.id === savedStep)) {
      currentStep.value = savedStep
    } else if (stepsList.length > 0) {
      currentStep.value = stepsList[0].id
    }

    if (activate) {
      isActive.value = true
    }
  }

  /**
   * Passe à l'étape suivante
   */
  const next = () => {
    const currentIndex = steps.value.findIndex(s => s.id === currentStep.value)
    if (currentIndex < steps.value.length - 1) {
      currentStep.value = steps.value[currentIndex + 1].id
      localStorage.setItem(STORAGE_KEYS.currentStep, currentStep.value)
    } else {
      complete()
    }
  }

  /**
   * Revient à l'étape précédente
   */
  const previous = () => {
    const currentIndex = steps.value.findIndex(s => s.id === currentStep.value)
    if (currentIndex > 0) {
      currentStep.value = steps.value[currentIndex - 1].id
      localStorage.setItem(STORAGE_KEYS.currentStep, currentStep.value)
    }
  }

  /**
   * Va à une étape spécifique
   */
  const goToStep = stepId => {
    if (steps.value.find(s => s.id === stepId)) {
      currentStep.value = stepId
      localStorage.setItem(STORAGE_KEYS.currentStep, currentStep.value)
    }
  }

  /**
   * Marque l'onboarding comme complété
   */
  const complete = () => {
    isActive.value = false
    currentStep.value = null
    localStorage.setItem(STORAGE_KEYS.completed, 'true')
    localStorage.removeItem(STORAGE_KEYS.currentStep)
  }

  /**
   * Rejette l'onboarding (utilisateur a cliqué sur "Passer")
   */
  const dismiss = () => {
    isActive.value = false
    localStorage.setItem(STORAGE_KEYS.dismissed, 'true')
  }

  /**
   * Réinitialise l'onboarding (pour le redémarrer)
   */
  const reset = () => {
    localStorage.removeItem(STORAGE_KEYS.completed)
    localStorage.removeItem(STORAGE_KEYS.dismissed)
    localStorage.removeItem(STORAGE_KEYS.currentStep)
    isActive.value = false
    currentStep.value = null
  }

  /**
   * Récupère l'étape actuelle
   */
  const getCurrentStep = computed(() => {
    return steps.value.find(s => s.id === currentStep.value) || null
  })

  /**
   * Récupère l'index de l'étape actuelle
   */
  const getCurrentStepIndex = computed(() => {
    return steps.value.findIndex(s => s.id === currentStep.value)
  })

  /**
   * Vérifie s'il y a une étape suivante
   */
  const hasNext = computed(() => {
    return getCurrentStepIndex.value < steps.value.length - 1
  })

  /**
   * Vérifie s'il y a une étape précédente
   */
  const hasPrevious = computed(() => {
    return getCurrentStepIndex.value > 0
  })

  return {
    // State
    currentStep,
    isActive,
    steps,
    shouldShow,
    isCompleted,
    isDismissed,

    // Computed
    getCurrentStep,
    getCurrentStepIndex,
    hasNext,
    hasPrevious,

    // Methods
    init,
    next,
    previous,
    goToStep,
    complete,
    dismiss,
    reset
  }
}
