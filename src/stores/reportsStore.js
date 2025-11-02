import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { useAuthStore } from './authStore'
import { formatCurrency, formatDate } from '@/utils/formatters'
import { reportsApi } from '@/api/reports'

/**
 * Store Pinia pour gérer les rapports et exports
 */
export const useReportsStore = defineStore('reports', () => {
  const loading = ref(false)
  const error = ref(null)
  const recentReports = ref([])

  /**
   * Génère les données pour un rapport mensuel via l'API layer
   * @param {string} month - Format "YYYY-MM" ou "janv. 2025"
   * @returns {Promise<Object>} Données du rapport
   */
  const generateMonthlyReport = async month => {
    loading.value = true
    error.value = null

    try {
      const authStore = useAuthStore()
      if (!authStore.user) {
        throw new Error('User not authenticated')
      }

      // Utilise l'API layer pour bénéficier de retry, timeout et gestion d'erreur centralisée
      const result = await reportsApi.generateMonthlyReport(authStore.user.id, month)

      if (!result.success) {
        error.value = result.message
        loading.value = false
        throw new Error(result.message)
      }

      loading.value = false
      return result.data
    } catch (err) {
      error.value = err.message
      loading.value = false
      console.error('Error generating monthly report:', err)
      throw err
    }
  }

  /**
   * Récupère les rapports récents via l'API layer
   */
  const fetchRecentReports = async () => {
    try {
      const authStore = useAuthStore()
      if (!authStore.user) {
        return
      }

      // Utilise l'API layer (pour l'instant retourne liste vide, sera implémenté en v0.3.0+)
      const result = await reportsApi.getRecentReports(authStore.user.id)

      if (result.success) {
        recentReports.value = result.data || []
      }
    } catch (err) {
      console.error('Error fetching recent reports:', err)
      recentReports.value = []
    }
  }

  return {
    loading,
    error,
    recentReports,
    generateMonthlyReport,
    fetchRecentReports
  }
})
