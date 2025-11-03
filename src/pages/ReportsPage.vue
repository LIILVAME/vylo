<template>
  <div class="flex min-h-screen bg-gray-50">
    <!-- Sidebar -->
    <Sidebar />

    <!-- Main Content -->
    <main ref="mainElement" class="flex-1 overflow-y-auto">
      <PullToRefresh
        :is-pulling="isPulling"
        :pull-distance="pullDistance"
        :is-refreshing="isRefreshing"
        :threshold="80"
      />
      <div
        class="max-w-7xl mx-auto px-2 sm:px-3 lg:px-6 xl:px-8 pt-16 pb-8 md:px-10 md:pt-10 md:pb-10"
      >
        <!-- Header -->
        <div class="mb-8 flex items-center justify-between">
          <div>
            <h1 class="text-3xl font-bold text-gray-900 mb-2">{{ $t('reports.title') }}</h1>
            <p class="text-gray-600">{{ $t('reports.subtitle') }}</p>
            <div class="border-b-2 border-green-500 w-20 mb-4 mt-3"></div>
          </div>

          <!-- Bouton d'action principal -->
          <button
            @click="handleExportPDF"
            :disabled="reportsStore.loading || !reportData"
            class="px-6 py-3 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed font-medium shadow-sm hover:shadow-md transition-all flex items-center gap-2"
          >
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
            {{ $t('reports.actions.exportPDF') }}
          </button>
        </div>

        <!-- Filtres -->
        <ReportFilters
          :selected-month="selectedMonth"
          :report-type="reportType"
          :selected-property="selectedProperty"
          :properties="propertiesStore.properties"
          :available-months="availableMonths"
          :loading="reportsStore.loading"
          @update:period="selectedMonth = $event"
          @update:reportType="reportType = $event"
          @update:property="selectedProperty = $event"
          @refresh="loadReport"
        />

        <!-- KPIs Section -->
        <div v-if="reportData" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <KpiCard
            :label="$t('reports.kpi.totalRevenue')"
            :value="reportData.statistics.totalRevenue"
            icon="currency"
            icon-color="text-green-600"
            icon-bg-color="bg-green-50"
            :formatter="formatCurrency"
            :tooltip="$t('reports.kpi.totalRevenueTooltip')"
          />
          <KpiCard
            :label="$t('reports.kpi.rentCollected')"
            :value="reportData.statistics.totalRevenue"
            icon="currency"
            icon-color="text-blue-600"
            icon-bg-color="bg-blue-50"
            :formatter="formatCurrency"
            :tooltip="$t('reports.kpi.rentCollectedTooltip')"
          />
          <KpiCard
            :label="$t('reports.kpi.occupancyRate')"
            :value="reportData.statistics.occupancyRate"
            icon="home"
            icon-color="text-purple-600"
            icon-bg-color="bg-purple-50"
            :formatter="val => `${val}%`"
            :tooltip="$t('reports.kpi.occupancyRateTooltip')"
          />
          <KpiCard
            :label="$t('reports.kpi.delayedPayments')"
            :value="reportData.statistics.latePayments"
            icon="clock"
            icon-color="text-red-600"
            icon-bg-color="bg-red-50"
            :tooltip="$t('reports.kpi.delayedPaymentsTooltip')"
          />
        </div>

        <!-- Loading State -->
        <div v-if="reportsStore.loading && !reportData" class="text-center py-12">
          <InlineLoader />
          <p class="mt-4 text-gray-600">{{ $t('reports.loading') }}</p>
        </div>

        <!-- Chart and Table Section -->
        <div v-if="reportData" class="space-y-6">
          <!-- Chart -->
          <ReportChart
            :title="$t('reports.chart.revenue.title')"
            :description="$t('reports.chart.revenue.description')"
            chart-type="bar"
            :series="chartSeries"
            :chart-options="chartOptions"
          />

          <!-- Table -->
          <ReportTable :table-data="tableData" />
        </div>

        <!-- Empty State -->
        <EmptyState
          v-if="!reportsStore.loading && !reportData"
          :title="$t('reports.noData.title')"
          :description="$t('reports.noData.message')"
          illustration="default"
        >
          <template #illustration>
            <div class="w-20 h-20 mx-auto flex items-center justify-center">
              <svg
                class="w-20 h-20 text-gray-600 dark:text-gray-200"
                fill="none"
                stroke="currentColor"
                stroke-width="1.5"
                viewBox="0 0 24 24"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
            </div>
          </template>
        </EmptyState>

        <!-- Summary Section -->
        <ReportSummary
          v-if="reportData"
          :statistics="reportData.statistics"
          :period="reportPeriod"
          :loading="reportsStore.loading"
          @export-pdf="handleExportPDF"
          @send-email="handleSendEmail"
        />
      </div>
    </main>

    <!-- Loading Overlay pour les exports -->
    <LoadingOverlay
      :isVisible="isExporting"
      :message="$t('reports.export.loading') || 'Export en cours...'"
      :description="$t('reports.export.loadingDescription') || 'Génération du fichier PDF'"
    />
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { usePullToRefresh } from '@/composables/usePullToRefresh'
import PullToRefresh from '../components/common/PullToRefresh.vue'
import { useI18n } from '@/composables/useLingui'
import Sidebar from '../components/Sidebar.vue'
import InlineLoader from '../components/common/InlineLoader.vue'
import EmptyState from '../components/common/EmptyState.vue'
import LoadingOverlay from '../components/common/LoadingOverlay.vue'
import KpiCard from '../components/stats/KpiCard.vue'
import ReportFilters from '../components/reports/ReportFilters.vue'
import ReportSummary from '../components/reports/ReportSummary.vue'
import ReportTable from '../components/reports/ReportTable.vue'
import ReportChart from '../components/reports/ReportChart.vue'
import { useReportsStore } from '@/stores/reportsStore'
import { usePropertiesStore } from '@/stores/propertiesStore'
import { useToastStore } from '@/stores/toastStore'
import { exportToPDF } from '@/utils/exportUtils'
import { formatCurrency, formatDate } from '@/utils/formatters'
import { useSettingsStore } from '@/stores/settingsStore'

const { t } = useI18n()
const reportsStore = useReportsStore()
const propertiesStore = usePropertiesStore()
const toast = useToastStore()
const settingsStore = useSettingsStore()

// Loading overlay pour les exports
const isExporting = ref(false)

// Pull-to-refresh
const mainElement = ref(null)
const { isPulling, pullDistance, isRefreshing } = usePullToRefresh(
  async () => {
    // Force le rafraîchissement du rapport
    await loadReport()
  },
  { threshold: 80 }
)

// State
const reportType = ref('global')
const selectedProperty = ref('all')
const reportData = ref(null)
const selectedMonth = ref('')

// Génère les 12 derniers mois
const availableMonths = computed(() => {
  const months = []

  for (let i = 0; i < 12; i++) {
    const date = new Date()
    date.setMonth(date.getMonth() - i)
    const monthKey = date.toLocaleDateString('fr-FR', { month: 'short', year: 'numeric' })
    months.push({
      label: monthKey,
      value: monthKey
    })
  }

  return months
})

// Période du rapport
const reportPeriod = computed(() => {
  if (!selectedMonth.value) return { startDate: new Date(), endDate: new Date() }

  // Parse le mois (format "janv. 2025")
  const [monthName, year] = selectedMonth.value.split(' ')
  const monthMap = {
    'janv.': 0,
    'févr.': 1,
    mars: 2,
    'avr.': 3,
    mai: 4,
    juin: 5,
    'juil.': 6,
    août: 7,
    'sept.': 8,
    'oct.': 9,
    'nov.': 10,
    'déc.': 11
  }
  const monthNum = monthMap[monthName] || 0

  const startDate = new Date(year, monthNum, 1)
  const endDate = new Date(year, monthNum + 1, 0, 23, 59, 59)

  return { startDate, endDate }
})

// Données du tableau
const tableData = computed(() => {
  if (!reportData.value) return []

  const properties = reportData.value.properties || []
  const payments = reportData.value.payments || []

  return properties.map(property => {
    const propertyPayments = payments.filter(
      p => p.property === property.name || p.propertyId === property.id
    )
    const paidPayments = propertyPayments.filter(p => p.status === 'paid')
    const totalPaid = paidPayments.reduce((sum, p) => sum + (p.amount || 0), 0)
    const delayed = propertyPayments.filter(p => p.status === 'late').length

    // Trouve le dernier paiement (le plus récent)
    const latestPayment =
      propertyPayments.length > 0
        ? propertyPayments.sort((a, b) => {
            const dateA = a.paidAt || a.dueDate || a.createdAt
            const dateB = b.paidAt || b.dueDate || b.createdAt
            return new Date(dateB) - new Date(dateA)
          })[0]
        : null

    return {
      property: property.name,
      city: property.city || '-',
      rent: property.rent || 0,
      status: property.status || 'vacant',
      totalPaid,
      delayed,
      occupancy: property.status === 'occupied' ? 100 : 0,
      paymentStatus: latestPayment ? latestPayment.status : null,
      paymentDate: latestPayment
        ? latestPayment.paidAt || latestPayment.dueDate || latestPayment.createdAt
        : null
    }
  })
})

// Données du graphique
const chartSeries = computed(() => {
  if (!reportData.value || !reportData.value.payments)
    return [{ name: t('reports.chart.revenue.label'), data: [] }]

  const payments = reportData.value.payments || []
  const paidPayments = payments.filter(p => p.status === 'paid')

  if (paidPayments.length === 0) {
    return [{ name: t('reports.chart.revenue.label'), data: [] }]
  }

  // Groupe par semaine
  const grouped = {}
  const categories = []

  paidPayments.forEach(payment => {
    const date = new Date(payment.dueDate)
    const weekKey = `${date.getFullYear()}-W${getWeekNumber(date)}`
    if (!grouped[weekKey]) {
      grouped[weekKey] = 0
      if (!categories.includes(weekKey)) {
        categories.push(weekKey)
      }
    }
    grouped[weekKey] += payment.amount || 0
  })

  // Trier les catégories et créer les données
  categories.sort()
  const data = categories.map(key => grouped[key] || 0)

  return [
    {
      name: t('reports.chart.revenue.label'),
      data: data
    }
  ]
})

// Catégories pour le graphique
const chartCategories = computed(() => {
  if (!reportData.value || !reportData.value.payments) return []

  const payments = reportData.value.payments || []
  const paidPayments = payments.filter(p => p.status === 'paid')

  const categories = []
  paidPayments.forEach(payment => {
    const date = new Date(payment.dueDate)
    const weekKey = `${date.getFullYear()}-W${getWeekNumber(date)}`
    if (!categories.includes(weekKey)) {
      categories.push(weekKey)
    }
  })

  return categories.sort()
})

const chartOptions = computed(() => {
  const currency = settingsStore.currency
  const locale = currency === 'USD' ? 'en-US' : currency === 'GBP' ? 'en-GB' : 'fr-FR'

  return {
    chart: {
      type: 'bar',
      toolbar: { show: false },
      animations: {
        enabled: true,
        easing: 'easeinout',
        speed: 800,
        animateGradually: {
          enabled: true,
          delay: 150
        }
      }
    },
    plotOptions: {
      bar: {
        borderRadius: 8,
        columnWidth: '60%',
        dataLabels: {
          position: 'top',
          formatter: val => {
            if (val === 0) return ''
            return new Intl.NumberFormat(locale, {
              style: 'currency',
              currency,
              minimumFractionDigits: 0,
              maximumFractionDigits: 0
            }).format(val)
          },
          style: {
            colors: ['#059669'],
            fontSize: '11px'
          }
        }
      }
    },
    dataLabels: {
      enabled: true
    },
    xaxis: {
      categories: chartCategories.value,
      labels: {
        style: {
          colors: '#6b7280',
          fontSize: '12px'
        },
        rotate: -45,
        rotateAlways: false
      }
    },
    yaxis: {
      labels: {
        formatter: val => {
          if (val === 0) return '0'
          return new Intl.NumberFormat(locale, {
            style: 'currency',
            currency,
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
          }).format(val)
        },
        style: {
          colors: '#6b7280',
          fontSize: '12px'
        }
      }
    },
    tooltip: {
      y: {
        formatter: val => {
          return new Intl.NumberFormat(locale, {
            style: 'currency',
            currency,
            minimumFractionDigits: 0,
            maximumFractionDigits: 2
          }).format(val)
        }
      }
    },
    colors: ['#22c55e'],
    grid: {
      borderColor: '#e5e7eb',
      strokeDashArray: 3,
      xaxis: {
        lines: {
          show: true
        }
      },
      yaxis: {
        lines: {
          show: true
        }
      }
    }
  }
})

// Utilitaires
const getWeekNumber = date => {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
  const dayNum = d.getUTCDay() || 7
  d.setUTCDate(d.getUTCDate() + 4 - dayNum)
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
  return Math.ceil(((d - yearStart) / 86400000 + 1) / 7)
}

/**
 * Charge le rapport
 */
const loadReport = async () => {
  if (!selectedMonth.value) {
    selectedMonth.value = availableMonths.value[0]?.value || ''
  }

  try {
    const data = await reportsStore.generateMonthlyReport(selectedMonth.value)
    reportData.value = data
  } catch (error) {
    toast.error(`Erreur lors du chargement du rapport : ${error.message}`)
  }
}

/**
 * Génère un nom de fichier formaté pour l'export
 */
const generateExportFilename = (format = 'pdf') => {
  const now = new Date()
  const dateStr = now
    .toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    })
    .replace(/\//g, '-') // Convertit 15/01/2025 en 15-01-2025

  const timeStr = now
    .toLocaleTimeString('fr-FR', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    })
    .replace(':', 'h') // Convertit 14:30 en 14h30

  // Inclut la période si disponible
  let periodPart = ''
  if (selectedMonth.value) {
    // Nettoie la période pour le nom de fichier
    periodPart = selectedMonth.value
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // Enlève les accents
      .replace(/[^a-z0-9]/g, '-') // Remplace caractères spéciaux par -
      .replace(/-+/g, '-') // Élimine les tirets multiples
      .replace(/^-|-$/g, '') // Enlève les tirets en début/fin
    periodPart = periodPart ? `_${periodPart}` : ''
  }

  return `rapport-doogoo_${dateStr}_${timeStr}${periodPart}.${format}`
}

/**
 * Exporte le rapport en PDF
 */
const handleExportPDF = async () => {
  if (!reportData.value || !tableData.value || tableData.value.length === 0) {
    toast.error('Aucun rapport à exporter')
    return
  }

  isExporting.value = true

  try {
    // Formateur pour les statuts
    const formatStatus = status => {
      if (!status) return '-'
      if (status === 'paid' || status === 'occupied') return t('payments.paidThisMonth') || 'Payé'
      if (status === 'late') return t('payments.late') || 'En retard'
      if (status === 'pending') return t('payments.pending') || 'En attente'
      if (status === 'vacant') return t('properties.vacant') || 'Vacant'
      return String(status)
    }

    // Colonnes pour l'export
    const columns = [
      { key: 'property', header: t('reports.table.columns.property') || 'Bien' },
      { key: 'city', header: t('reports.table.columns.city') || 'Ville' },
      {
        key: 'rent',
        header: t('reports.table.columns.rent') || 'Loyer',
        accessor: item => item.rent
      },
      {
        key: 'status',
        header: t('reports.table.columns.status') || 'Statut',
        formatter: formatStatus
      },
      {
        key: 'paymentDate',
        header: t('reports.table.columns.paymentDate') || 'Date de paiement',
        accessor: item => item.paymentDate,
        formatter: val => (val ? formatDate(val) : '-')
      },
      {
        key: 'totalPaid',
        header: t('reports.table.columns.totalPaid') || 'Total payé',
        accessor: item => item.totalPaid
      }
    ]

    // Préparation des KPIs
    const kpis = {
      totalRevenue: reportData.value.statistics?.totalRevenue || 0,
      occupancyRate: reportData.value.statistics?.occupancyRate || 0,
      latePaymentsAmount: reportData.value.statistics?.latePaymentsAmount || 0,
      averageRent: reportData.value.statistics?.averageRent || 0
    }

    // Titre du rapport
    const title = t('reports.title') || 'Rapports & Synthèses'

    // Période
    const period = selectedMonth.value || 'Période sélectionnée'

    // Options d'export
    const pdfOptions = {
      kpis,
      period
    }

    // Export PDF avec branding Doogoo
    exportToPDF(
      title,
      tableData.value,
      columns,
      generateExportFilename('pdf').replace('.pdf', ''), // exportToPDF ajoute .pdf automatiquement
      pdfOptions
    )

    toast.success(t('reports.export.success') || 'Export réussi')
  } catch (error) {
    toast.error(`Erreur lors de l'export : ${error.message}`)
    console.error('Export PDF error:', error)
  } finally {
    isExporting.value = false
  }
}

/**
 * Envoie le rapport par email (TODO)
 */
const handleSendEmail = () => {
  toast.info(t('reports.actions.comingSoon'))
}

onMounted(async () => {
  // Charge les propriétés si nécessaire
  if (propertiesStore.properties.length === 0) {
    await propertiesStore.fetchProperties()
  }

  // Charge le rapport initial
  if (availableMonths.value.length > 0) {
    selectedMonth.value = availableMonths.value[0].value
    await loadReport()
  }
})
</script>
