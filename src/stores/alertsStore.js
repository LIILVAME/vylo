import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { useAuthStore } from './authStore'
import { formatDate, formatRelativeDate, formatCurrency } from '@/utils/formatters'
import { alertsApi } from '@/api/alerts'

/**
 * Store Pinia pour gérer les alertes automatiques
 */
export const useAlertsStore = defineStore('alerts', () => {
  const loading = ref(false)
  const error = ref(null)
  const alerts = ref([])

  /**
   * Types d'alertes (réexport depuis l'API)
   */
  const ALERT_TYPES = alertsApi.ALERT_TYPES

  /**
   * Récupère toutes les alertes pour l'utilisateur via l'API layer
   */
  const fetchAlerts = async () => {
    loading.value = true
    error.value = null

    try {
      const authStore = useAuthStore()
      if (!authStore.user) {
        throw new Error('User not authenticated')
      }

      // Utilise l'API layer pour bénéficier de retry, timeout et gestion d'erreur centralisée
      const result = await alertsApi.getAlerts(authStore.user.id)

      if (!result.success) {
        error.value = result.message
        loading.value = false
        throw new Error(result.message)
      }

      // Formate les messages avec formatCurrency pour la cohérence
      const formattedAlerts = result.data.map(alert => {
        if (alert.amount) {
          return {
            ...alert,
            message: alert.message.replace(`${alert.amount}€`, formatCurrency(alert.amount))
          }
        }
        if (alert.date && alert.type === alertsApi.ALERT_TYPES.UPCOMING_LEASE_END) {
          return {
            ...alert,
            message: alert.message.replace(
              new Date(alert.date).toLocaleDateString(),
              formatDate(new Date(alert.date))
            )
          }
        }
        return alert
      })

      alerts.value = formattedAlerts
      loading.value = false
    } catch (err) {
      error.value = err.message
      loading.value = false
      console.error('Error fetching alerts:', err)
    }
  }

  /**
   * Marque une alerte comme résolue (supprime de la liste)
   * TODO v0.3.0+ : Stocker dans Supabase pour persistance
   */
  const markAsResolved = alertId => {
    alerts.value = alerts.value.filter(a => a.id !== alertId)
  }

  /**
   * Computed : Nombre d'alertes par sévérité
   */
  const highSeverityAlerts = computed(() => alerts.value.filter(a => a.severity === 'high'))
  const mediumSeverityAlerts = computed(() => alerts.value.filter(a => a.severity === 'medium'))
  const lowSeverityAlerts = computed(() => alerts.value.filter(a => a.severity === 'low'))

  return {
    loading,
    error,
    alerts,
    ALERT_TYPES,
    fetchAlerts,
    markAsResolved,
    highSeverityAlerts,
    mediumSeverityAlerts,
    lowSeverityAlerts
  }
})
