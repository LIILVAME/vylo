import { defineStore } from 'pinia'
import { ref, watch, nextTick } from 'vue'
import { setSettingsStoreCache } from '@/utils/formatters'

/**
 * Store Pinia pour gérer les paramètres utilisateur
 * Gère la langue (FR/EN) et la devise (EUR/USD/GBP/XOF)
 * Persiste les préférences dans localStorage
 */
export const useSettingsStore = defineStore('settings', () => {
  // State
  const language = ref('fr')
  const currency = ref('EUR')
  const theme = ref('light')
  const alertThreshold = ref(5)
  const notifications = ref({
    email: true,
    payments: true,
    reminders: false,
    maintenance: false
  })

  // Clés localStorage
  const STORAGE_KEY = 'vylo-settings'

  /**
   * Charge les paramètres depuis localStorage
   */
  const loadSettings = () => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) {
        const parsed = JSON.parse(stored)
        if (parsed.language) language.value = parsed.language
        if (parsed.currency) currency.value = parsed.currency
        if (parsed.theme) {
          // Normalise 'auto' en 'system' pour la cohérence
          theme.value = parsed.theme === 'auto' ? 'system' : parsed.theme
        }
        if (parsed.alertThreshold !== undefined) alertThreshold.value = parsed.alertThreshold
        if (parsed.notifications)
          notifications.value = { ...notifications.value, ...parsed.notifications }
      }
    } catch (error) {
      console.warn('Erreur lors du chargement des paramètres depuis localStorage:', error)
    }
  }

  /**
   * Sauvegarde les paramètres dans localStorage
   */
  const saveSettings = () => {
    try {
      const settings = {
        language: language.value,
        currency: currency.value,
        theme: theme.value,
        alertThreshold: alertThreshold.value,
        notifications: notifications.value
      }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settings))
    } catch (error) {
      console.warn('Erreur lors de la sauvegarde des paramètres dans localStorage:', error)
    }
  }

  /**
   * Change la langue
   * @param {string} lang - Code langue ('fr' ou 'en')
   */
  const setLanguage = lang => {
    if (['fr', 'en'].includes(lang) && lang !== language.value) {
      language.value = lang
      saveSettings()

      // Met à jour i18n immédiatement
      try {
        // Utilise un import dynamique pour charger i18n
        import('@/i18n')
          .then(module => {
            const i18nInstance = module.default
            if (i18nInstance && i18nInstance.locale) {
              i18nInstance.locale.value = lang
            }
          })
          .catch(error => {
            console.warn('Impossible de mettre à jour i18n:', error)
          })
      } catch (error) {
        console.warn('Impossible de mettre à jour i18n:', error)
      }

      // Track language changed event
      if (import.meta.env.VITE_ENABLE_ANALYTICS === 'true') {
        import('@/utils/analytics')
          .then(({ trackDoogooEvent, DoogooEvents }) => {
            trackDoogooEvent(DoogooEvents.LANGUAGE_CHANGED, {
              language: lang
            })
          })
          .catch(() => {})
      }

      // Recharger la page pour appliquer la nouvelle langue partout
      // (nécessaire car certains composants sont déjà rendus)
      if (typeof window !== 'undefined') {
        window.location.reload()
      }
    }
  }

  /**
   * Change la devise
   * @param {string} curr - Code devise ('EUR', 'USD', 'GBP', 'XOF')
   */
  const setCurrency = curr => {
    if (['EUR', 'USD', 'GBP', 'XOF'].includes(curr)) {
      currency.value = curr
      saveSettings()

      // Track currency changed event
      if (import.meta.env.VITE_ENABLE_ANALYTICS === 'true') {
        import('@/utils/analytics')
          .then(({ trackDoogooEvent, DoogooEvents }) => {
            trackDoogooEvent(DoogooEvents.CURRENCY_CHANGED, {
              currency: curr
            })
          })
          .catch(() => {})
      }
    }
  }

  /**
   * Applique le thème sur le document HTML
   * @param {string} themeValue - Thème à appliquer ('light', 'dark', 'auto')
   */
  const applyTheme = themeValue => {
    if (typeof window === 'undefined' || !document?.documentElement) {
      if (import.meta.env.DEV) {
        console.warn('⚠️ applyTheme - Window ou document non disponible')
      }
      return
    }

    const root = document.documentElement

    if (!root) {
      if (import.meta.env.DEV) {
        console.warn('⚠️ applyTheme - Element <html> non trouvé')
      }
      return
    }

    if (import.meta.env.DEV) {
      console.debug('🎨 applyTheme - Application du thème:', themeValue)
    }

    // Supprime les classes dark existantes
    root.classList.remove('dark')

    if (themeValue === 'dark') {
      root.classList.add('dark')
      if (import.meta.env.DEV) {
        console.debug('✅ applyTheme - Classe dark ajoutée')
      }
    } else if (themeValue === 'auto' || themeValue === 'system') {
      // Détecte la préférence système
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
      if (prefersDark) {
        root.classList.add('dark')
        if (import.meta.env.DEV) {
          console.debug('✅ applyTheme - Mode système dark, classe dark ajoutée')
        }
      } else {
        if (import.meta.env.DEV) {
          console.debug('✅ applyTheme - Mode système light, classe dark retirée')
        }
      }
    } else {
      // 'light' - pas de classe dark
      if (import.meta.env.DEV) {
        console.debug('✅ applyTheme - Mode light, classe dark retirée')
      }
    }

    // Vérification finale
    if (import.meta.env.DEV) {
      console.debug('🎨 applyTheme - État final - Classe dark:', root.classList.contains('dark'))
    }
  }

  /**
   * Détecte et applique le thème système
   */
  const detectSystemTheme = () => {
    if (theme.value === 'auto' || theme.value === 'system') {
      applyTheme(theme.value)
    }
  }

  /**
   * Change le thème
   * @param {string} newTheme - Thème ('light', 'dark', 'auto' ou 'system')
   */
  const setTheme = newTheme => {
    if (['light', 'dark', 'auto', 'system'].includes(newTheme)) {
      theme.value = newTheme
      saveSettings()
      applyTheme(newTheme)

      // Si mode système, écoute les changements de préférence
      if (newTheme === 'auto' || newTheme === 'system') {
        setupSystemThemeListener()
      } else {
        removeSystemThemeListener()
      }
    }
  }

  // Listener pour les changements de préférence système
  let systemThemeListener = null

  /**
   * Configure l'écouteur pour les changements de préférence système
   */
  const setupSystemThemeListener = () => {
    if (typeof window === 'undefined') return

    // Supprime l'ancien listener s'il existe
    removeSystemThemeListener()

    // Crée un nouveau listener
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')

    systemThemeListener = e => {
      if (theme.value === 'auto' || theme.value === 'system') {
        applyTheme(theme.value)
      }
    }

    // Écoute les changements (compatible avec différents navigateurs)
    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', systemThemeListener)
    } else if (mediaQuery.addListener) {
      // Fallback pour anciens navigateurs
      mediaQuery.addListener(systemThemeListener)
    }
  }

  /**
   * Supprime l'écouteur de préférence système
   */
  const removeSystemThemeListener = () => {
    if (typeof window === 'undefined' || !systemThemeListener) return

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')

    if (mediaQuery.removeEventListener) {
      mediaQuery.removeEventListener('change', systemThemeListener)
    } else if (mediaQuery.removeListener) {
      // Fallback pour anciens navigateurs
      mediaQuery.removeListener(systemThemeListener)
    }

    systemThemeListener = null
  }

  /**
   * Met à jour les notifications
   * @param {Object} newNotifications - Objet de notifications
   */
  const setNotifications = newNotifications => {
    notifications.value = { ...notifications.value, ...newNotifications }
    saveSettings()
  }

  /**
   * Met à jour le seuil d'alerte
   * @param {number} threshold - Nombre de jours
   */
  const setAlertThreshold = threshold => {
    if (typeof threshold === 'number' && threshold >= 0) {
      alertThreshold.value = threshold
      saveSettings()
    }
  }

  // Charge les paramètres au démarrage
  if (typeof window !== 'undefined') {
    loadSettings()
    // Applique le thème après chargement
    nextTick(() => {
      applyTheme(theme.value)
      // Si mode système, configure l'écouteur
      if (theme.value === 'auto' || theme.value === 'system') {
        setupSystemThemeListener()
      }
    })
  }

  // Sauvegarde automatique quand les valeurs changent
  watch(
    [language, currency, theme, alertThreshold, notifications],
    () => {
      saveSettings()
    },
    { deep: true }
  )

  // Expose le store dans le cache pour formatCurrency
  // Utilise un watch pour mettre à jour le cache quand currency change
  watch(
    currency,
    () => {
      const storeForCache = {
        get currency() {
          return currency.value
        },
        get language() {
          return language.value
        }
      }
      setSettingsStoreCache(storeForCache)
    },
    { immediate: true }
  )

  return {
    // State
    language,
    currency,
    theme,
    alertThreshold,
    notifications,
    // Actions
    setLanguage,
    setCurrency,
    setTheme,
    setNotifications,
    setAlertThreshold,
    loadSettings,
    saveSettings,
    applyTheme,
    detectSystemTheme
  }
})
