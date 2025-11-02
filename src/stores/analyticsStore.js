import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { useAuthStore } from './authStore'
import { formatCurrency } from '@/utils/formatters'
import { analyticsApi } from '@/api/analytics'

/**
 * Store Pinia pour gérer les statistiques et analyses
 * Connecté à Supabase pour calculer les métriques depuis les données réelles
 * Version v0.3.0 : Dashboard avancé avec comparaisons
 */
export const useAnalyticsStore = defineStore('analytics', () => {
  // State
  const loading = ref(false)
  const error = ref(null)

  // Données brutes
  const revenueByMonth = ref([])
  const revenueByProperty = ref([])
  const occupancyRate = ref(0)
  const latePayments = ref(0)
  const totalRevenue = ref(0)
  const averageRent = ref(0)
  const paymentStatusBreakdown = ref({
    paid: 0,
    pending: 0,
    late: 0
  })

  // Données pour comparaison de périodes (v0.3.0)
  const currentPeriod = ref(null)
  const previousPeriod = ref(null)
  const periodComparison = ref(null)

  /**
   * Récupère toutes les données analytiques depuis Supabase
   * @param {Object} options - Options de période { currentStart, currentEnd, previousStart, previousEnd }
   */
  const fetchAnalytics = async (options = {}) => {
    loading.value = true
    error.value = null

    try {
      const authStore = useAuthStore()
      if (!authStore.user) {
        throw new Error('User not authenticated')
      }

      // Utilise l'API layer pour bénéficier de retry, timeout et gestion d'erreur centralisée
      const result = await analyticsApi.getAnalytics(authStore.user.id, options)

      if (!result.success) {
        throw new Error(result.message)
      }

      const { payments, properties: fetchedProperties } = result.data
      const properties = fetchedProperties

      // 3️⃣ Calcule le revenu mensuel (sur les 12 derniers mois)
      const revenueByMonthMap = new Map()
      const last12Months = []

      // Génère les 12 derniers mois
      for (let i = 11; i >= 0; i--) {
        const date = new Date()
        date.setMonth(date.getMonth() - i)
        const monthKey = date.toLocaleDateString('fr-FR', { month: 'short', year: 'numeric' })
        last12Months.push({
          month: monthKey,
          monthNum: date.getMonth(),
          year: date.getFullYear(),
          total: 0
        })
        revenueByMonthMap.set(monthKey, 0)
      }

      // Agrége les paiements par mois (seulement les payés)
      const paidPayments = payments?.filter(p => p.status === 'paid') || []
      paidPayments.forEach(payment => {
        const date = new Date(payment.due_date)
        const monthKey = date.toLocaleDateString('fr-FR', { month: 'short', year: 'numeric' })
        const currentTotal = revenueByMonthMap.get(monthKey) || 0
        revenueByMonthMap.set(monthKey, currentTotal + Number(payment.amount))
      })

      // Construit le tableau avec les 12 derniers mois
      revenueByMonth.value = last12Months.map(item => ({
        month: item.month,
        total: revenueByMonthMap.get(item.month) || 0
      }))

      // 4️⃣ Calcule le revenu par bien
      const revenueByPropertyMap = new Map()
      paidPayments.forEach(payment => {
        if (payment.properties) {
          const propertyId = payment.properties.id
          const propertyName = payment.properties.name || 'N/A'
          const current = revenueByPropertyMap.get(propertyId) || { name: propertyName, total: 0 }
          revenueByPropertyMap.set(propertyId, {
            ...current,
            total: current.total + Number(payment.amount)
          })
        }
      })

      revenueByProperty.value = Array.from(revenueByPropertyMap.values()).sort(
        (a, b) => b.total - a.total
      )

      // 5️⃣ Calcule le taux d'occupation
      const totalProperties = properties?.length || 0
      const occupiedProperties = properties?.filter(p => p.status === 'occupied').length || 0
      occupancyRate.value =
        totalProperties > 0 ? Math.round((occupiedProperties / totalProperties) * 100) : 0

      // 6️⃣ Compte les retards de paiement
      latePayments.value = payments?.filter(p => p.status === 'late').length || 0

      // 7️⃣ Revenu total (tous les paiements payés)
      totalRevenue.value = paidPayments.reduce((sum, p) => sum + Number(p.amount || 0), 0)

      // 8️⃣ Loyer moyen
      const propertiesWithRent = properties?.filter(p => p.rent && p.rent > 0) || []
      if (propertiesWithRent.length > 0) {
        averageRent.value =
          propertiesWithRent.reduce((sum, p) => sum + Number(p.rent), 0) / propertiesWithRent.length
      }

      // 9️⃣ Répartition des statuts de paiement
      paymentStatusBreakdown.value = {
        paid: payments?.filter(p => p.status === 'paid').length || 0,
        pending: payments?.filter(p => p.status === 'pending').length || 0,
        late: payments?.filter(p => p.status === 'late').length || 0
      }

      // 🔟 Comparaison de périodes (v0.3.0)
      if (
        options.currentStart &&
        options.currentEnd &&
        options.previousStart &&
        options.previousEnd
      ) {
        await fetchPeriodComparison(payments, properties, options)
      }

      loading.value = false
    } catch (err) {
      error.value = err.message
      loading.value = false
      console.error('Error fetching analytics:', err)
    }
  }

  /**
   * Compare deux périodes (v0.3.0)
   */
  const fetchPeriodComparison = async (payments, properties, options) => {
    const { currentStart, currentEnd, previousStart, previousEnd } = options

    // Filtre les paiements par période
    const currentPayments =
      payments?.filter(p => {
        const date = new Date(p.due_date)
        return date >= new Date(currentStart) && date <= new Date(currentEnd)
      }) || []

    const previousPayments =
      payments?.filter(p => {
        const date = new Date(p.due_date)
        return date >= new Date(previousStart) && date <= new Date(previousEnd)
      }) || []

    const currentRevenue = currentPayments
      .filter(p => p.status === 'paid')
      .reduce((sum, p) => sum + Number(p.amount || 0), 0)

    const previousRevenue = previousPayments
      .filter(p => p.status === 'paid')
      .reduce((sum, p) => sum + Number(p.amount || 0), 0)

    const revenueChange =
      previousRevenue > 0 ? ((currentRevenue - previousRevenue) / previousRevenue) * 100 : 0

    // Taux d'occupation (utilisation des données actuelles car elles ne changent pas beaucoup)
    const currentOccupied = properties?.filter(p => p.status === 'occupied').length || 0
    const previousOccupied = currentOccupied // TODO v0.3.0+ : Historique réel si stocké

    periodComparison.value = {
      currentPeriod: {
        revenue: currentRevenue,
        payments: currentPayments.length,
        occupied: currentOccupied
      },
      previousPeriod: {
        revenue: previousRevenue,
        payments: previousPayments.length,
        occupied: previousOccupied
      },
      changes: {
        revenue: revenueChange,
        payments:
          previousPayments.length > 0
            ? ((currentPayments.length - previousPayments.length) / previousPayments.length) * 100
            : 0,
        occupancy:
          previousOccupied > 0 ? ((currentOccupied - previousOccupied) / previousOccupied) * 100 : 0
      }
    }
  }

  /**
   * Récupère le top 5 des biens les plus rentables
   */
  const topProperties = computed(() => {
    return revenueByProperty.value.slice(0, 5)
  })

  /**
   * Computed : Format les données de revenu mensuel pour ApexCharts
   */
  const revenueChartSeries = computed(() => [
    {
      name: 'Revenus',
      data: revenueByMonth.value.map(r => r.total)
    }
  ])

  const revenueChartOptions = computed(() => ({
    xaxis: {
      categories: revenueByMonth.value.map(r => r.month)
    },
    colors: ['#3B82F6']
  }))

  /**
   * Computed : Format les données de revenu par bien pour ApexCharts
   */
  const revenueByPropertyChartSeries = computed(() => [
    {
      name: 'Revenus',
      data: revenueByProperty.value.map(r => r.total)
    }
  ])

  const revenueByPropertyChartOptions = computed(() => ({
    xaxis: {
      categories: revenueByProperty.value.map(r =>
        r.name.length > 15 ? r.name.substring(0, 15) + '...' : r.name
      )
    },
    colors: ['#10B981'],
    plotOptions: {
      bar: {
        horizontal: true
      }
    }
  }))

  /**
   * Computed : Format les données de répartition des paiements pour ApexCharts
   */
  const paymentStatusChartSeries = computed(() => [
    paymentStatusBreakdown.value.paid,
    paymentStatusBreakdown.value.pending,
    paymentStatusBreakdown.value.late
  ])

  const paymentStatusChartOptions = computed(() => ({
    labels: ['Payés', 'En attente', 'En retard'],
    colors: ['#10B981', '#F59E0B', '#EF4444'],
    legend: {
      position: 'bottom'
    }
  }))

  return {
    // State
    loading,
    error,
    revenueByMonth,
    revenueByProperty,
    occupancyRate,
    latePayments,
    totalRevenue,
    averageRent,
    paymentStatusBreakdown,
    currentPeriod,
    previousPeriod,
    periodComparison,
    // Actions
    fetchAnalytics,
    fetchPeriodComparison,
    // Computed (pour les graphiques)
    revenueChartSeries,
    revenueChartOptions,
    revenueByPropertyChartSeries,
    revenueByPropertyChartOptions,
    paymentStatusChartSeries,
    paymentStatusChartOptions,
    topProperties
  }
})
