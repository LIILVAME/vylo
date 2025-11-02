<template>
  <div class="flex min-h-screen bg-gray-50">
    <!-- Sidebar -->
    <Sidebar />

    <!-- Main Content -->
    <main
      ref="mainElement"
      class="flex-1 overflow-y-auto"
      role="main"
      aria-label="Tableau de bord principal"
    >
      <PullToRefresh
        :is-pulling="isPulling"
        :pull-distance="pullDistance"
        :is-refreshing="isRefreshing"
        :threshold="80"
      />
      <div class="max-w-7xl mx-auto px-2 sm:px-3 lg:px-6 xl:px-8 pt-16 pb-20 sm:pt-10 sm:pb-10">
        <!-- Header avec statistiques -->
        <DashboardHeader :stats="globalStats" />

        <!-- État de chargement initial avec skeletons -->
        <div
          v-if="
            (propertiesStore.loading || paymentsStore.loading) &&
            propertiesStore.properties.length === 0
          "
          class="space-y-4 sm:space-y-6"
        >
          <div class="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 lg:gap-6">
            <SkeletonCard v-for="n in 3" :key="n" />
          </div>
        </div>

        <!-- Loader inline si données déjà chargées -->
        <div v-else-if="propertiesStore.loading || paymentsStore.loading" class="text-center py-8">
          <InlineLoader />
        </div>

        <!-- Erreur -->
        <div
          v-else-if="propertiesStore.error || paymentsStore.error"
          class="bg-red-50 border border-red-200 rounded-lg p-4 mb-6"
        >
          <div class="flex items-center">
            <svg
              class="w-5 h-5 text-red-600 mr-2"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <p class="text-red-700 font-medium">
              {{ $t('common.errorWithColon') }} {{ propertiesStore.error || paymentsStore.error }}
            </p>
          </div>
        </div>

        <!-- Contenu principal -->
        <template v-else>
          <!-- Liste des appartements -->
          <PropertiesList :properties="properties" @add-click="isModalOpen = true" />

          <!-- Section Paiements -->
          <PaymentsSection :payments="payments" />
        </template>
      </div>
    </main>

    <!-- Modal d'ajout de bien -->
    <AddPropertyModal
      :isOpen="isModalOpen"
      @close="isModalOpen = false"
      @submit="handleAddProperty"
    />

    <!-- Floating Action Button (mobile only) -->
    <FloatingActionButton :aria-label="$t('common.addProperty')" @click="isModalOpen = true" />
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { usePullToRefresh } from '@/composables/usePullToRefresh'
import Sidebar from '../components/Sidebar.vue'
import DashboardHeader from '../components/dashboard/DashboardHeader.vue'
import PropertiesList from '../components/dashboard/PropertiesList.vue'
import PaymentsSection from '../components/dashboard/PaymentsSection.vue'
import AddPropertyModal from '../components/dashboard/AddPropertyModal.vue'
import SkeletonCard from '../components/common/SkeletonCard.vue'
import InlineLoader from '../components/common/InlineLoader.vue'
import FloatingActionButton from '../components/common/FloatingActionButton.vue'
import PullToRefresh from '../components/common/PullToRefresh.vue'
import { usePropertiesStore } from '@/stores/propertiesStore'
import { usePaymentsStore } from '@/stores/paymentsStore'

const propertiesStore = usePropertiesStore()
const paymentsStore = usePaymentsStore()

// Pull-to-refresh
const mainElement = ref(null)
const { isPulling, pullDistance, isRefreshing } = usePullToRefresh(
  async () => {
    // Force le rafraîchissement des données
    await Promise.all([
      propertiesStore.fetchProperties(true), // force = true pour bypasser le cache
      paymentsStore.fetchPayments(true)
    ])
  },
  { threshold: 80 }
)

// Utilise les propriétés du store Pinia (synchronisé avec BiensPage)
const properties = computed(() => propertiesStore.properties)

// Utilise les paiements du store Pinia (synchronisé avec PaiementsPage)
const payments = computed(() => paymentsStore.payments)

// Utilise les statistiques du store Pinia
const globalStats = computed(() => ({
  totalProperties: propertiesStore.totalProperties,
  occupiedProperties: propertiesStore.occupiedProperties,
  vacantProperties: propertiesStore.vacantProperties,
  totalRent: propertiesStore.totalRent,
  latePayments: paymentsStore.latePayments.length
}))

/**
 * Charge les données depuis Supabase au montage du composant
 * Initialise le temps réel pour les mises à jour automatiques
 */
onMounted(async () => {
  await Promise.all([propertiesStore.fetchProperties(), paymentsStore.fetchPayments()])

  // Note: Realtime est déjà initialisé globalement dans App.vue
  // Pas besoin de réinitialiser ici
})

/**
 * Arrête le temps réel au démontage (optionnel)
 */
onUnmounted(() => {
  // propertiesStore.stopRealtime()
  // paymentsStore.stopRealtime()
})

const isModalOpen = ref(false)

/**
 * Gère l'ajout d'un nouveau bien via le store Pinia (Supabase)
 */
const handleAddProperty = async newProperty => {
  try {
    await propertiesStore.addProperty(newProperty)
    isModalOpen.value = false
    // Le toast est géré dans le store
  } catch (error) {
    // Le toast d'erreur est géré dans le store
    console.error("Erreur lors de l'ajout du bien:", error)
  }
}

// TODO v0.2.0 : Rediriger vers /biens?mode=add au lieu d'ouvrir un modal local
// const handleAddPropertyClick = () => {
//   router.push({ path: '/biens', query: { mode: 'add' } })
// }
</script>

<style scoped>
/* Layout responsive géré par Tailwind :
   - Mobile: Sidebar fixed avec overlay
   - Desktop: Sidebar static dans flex, contenu centré avec max-w-7xl
*/
</style>
