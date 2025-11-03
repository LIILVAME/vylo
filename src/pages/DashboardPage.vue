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

        <!-- État de chargement initial avec skeletons (uniquement si aucune donnée) -->
        <div
          v-if="
            (propertiesStore.loading || paymentsStore.loading) &&
            propertiesStore.properties.length === 0 &&
            paymentsStore.payments.length === 0
          "
          class="space-y-4 sm:space-y-6"
        >
          <div class="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 lg:gap-6">
            <SkeletonCard v-for="n in 3" :key="n" />
          </div>
        </div>

        <!-- Erreur (uniquement si aucune donnée en cache) -->
        <div
          v-else-if="
            (propertiesStore.error || paymentsStore.error) &&
            propertiesStore.properties.length === 0 &&
            paymentsStore.payments.length === 0
          "
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

        <!-- Contenu principal (s'affiche même si loading en arrière-plan) -->
        <div>
          <!-- Loader inline si refresh en cours ET données déjà présentes -->
          <div
            v-if="
              (propertiesStore.loading || paymentsStore.loading) &&
              (propertiesStore.properties.length > 0 || paymentsStore.payments.length > 0)
            "
            class="text-center py-4 mb-4"
          >
            <InlineLoader />
          </div>

          <!-- Liste des appartements -->
          <PropertiesList
            :properties="properties"
            @add-click="isModalOpen = true"
            @edit-property="handleEditProperty"
            @delete-property="handleDeleteProperty"
          />

          <!-- Section Paiements -->
          <PaymentsSection
            :payments="payments"
            @edit-payment="handleEditPayment"
            @delete-payment="handleDeletePayment"
          />
        </div>
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

    <!-- Modal de confirmation de suppression -->
    <ConfirmModal
      :isOpen="showDeleteConfirm"
      title="Supprimer ce bien ?"
      :message="
        $t('properties.confirmDelete') ||
        'Êtes-vous sûr de vouloir supprimer ce bien ? Cette action est irréversible.'
      "
      confirm-label="Supprimer"
      cancel-label="Annuler"
      variant="danger"
      :isLoading="isDeletingProperty"
      @confirm="confirmDelete"
      @cancel="cancelDelete"
      @update:isOpen="showDeleteConfirm = $event"
    />
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { usePullToRefresh } from '@/composables/usePullToRefresh'
import Sidebar from '../components/Sidebar.vue'
import DashboardHeader from '../components/dashboard/DashboardHeader.vue'
import PropertiesList from '../components/dashboard/PropertiesList.vue'
import PaymentsSection from '../components/dashboard/PaymentsSection.vue'
import AddPropertyModal from '../components/dashboard/AddPropertyModal.vue'
import ConfirmModal from '../components/common/ConfirmModal.vue'
import SkeletonCard from '../components/common/SkeletonCard.vue'
import InlineLoader from '../components/common/InlineLoader.vue'
import FloatingActionButton from '../components/common/FloatingActionButton.vue'
import PullToRefresh from '../components/common/PullToRefresh.vue'
import { usePropertiesStore } from '@/stores/propertiesStore'
import { usePaymentsStore } from '@/stores/paymentsStore'

const propertiesStore = usePropertiesStore()
const paymentsStore = usePaymentsStore()
const router = useRouter()

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
 * Note: App.vue charge déjà les données au démarrage, on ne recharge jamais ici
 * pour éviter les conflits et les états loading bloqués
 */
onMounted(() => {
  // App.vue gère déjà le chargement initial et le realtime
  // On fait confiance au store pour les données déjà chargées
  // Si les données ne sont pas présentes, c'est que App.vue est encore en train de charger
  // ou qu'il y a un problème de session, on attend simplement
})

/**
 * Arrête le temps réel au démontage (optionnel)
 */
onUnmounted(() => {
  // propertiesStore.stopRealtime()
  // paymentsStore.stopRealtime()
})

const isModalOpen = ref(false)
const confirmDeleteId = ref(null)
const showDeleteConfirm = ref(false)

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

/**
 * Gère l'édition d'un bien - redirige vers BiensPage
 */
const handleEditProperty = property => {
  // Redirige vers la page Biens qui gère les modals d'édition
  router.push({ path: '/biens', query: { mode: 'edit', id: property.id } })
}

/**
 * Gère la suppression d'un bien
 */
const handleDeleteProperty = propertyId => {
  confirmDeleteId.value = propertyId
  showDeleteConfirm.value = true
}

const isDeletingProperty = ref(false)

const confirmDelete = async () => {
  if (!confirmDeleteId.value) return

  isDeletingProperty.value = true
  try {
    await propertiesStore.removeProperty(confirmDeleteId.value)
    confirmDeleteId.value = null
    showDeleteConfirm.value = false
    // Le toast est géré dans le store
  } catch (error) {
    // Le toast d'erreur est géré dans le store
    console.error('Erreur lors de la suppression du bien:', error)
  } finally {
    isDeletingProperty.value = false
  }
}

const cancelDelete = () => {
  confirmDeleteId.value = null
  showDeleteConfirm.value = false
}

/**
 * Gère l'édition d'un paiement - redirige vers PaiementsPage
 */
const handleEditPayment = payment => {
  // Redirige vers la page Paiements qui gère les modals d'édition
  router.push({ path: '/paiements', query: { mode: 'edit', id: payment.id } })
}

const isDeletingPayment = ref(false)

/**
 * Gère la suppression d'un paiement
 */
const handleDeletePayment = async paymentId => {
  isDeletingPayment.value = true
  try {
    await paymentsStore.removePayment(paymentId)
    // Le toast est géré dans le store
  } catch (error) {
    // Le toast d'erreur est géré dans le store
    console.error('Erreur lors de la suppression du paiement:', error)
  } finally {
    isDeletingPayment.value = false
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
