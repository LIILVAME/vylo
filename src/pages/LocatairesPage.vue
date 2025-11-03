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
        <!-- Header avec statistiques -->
        <TenantsHeader :stats="stats" @add-tenant="isModalOpen = true" />

        <!-- Filtres -->
        <div class="mb-6 flex flex-wrap items-center gap-4">
          <button
            v-for="filter in filters"
            :key="filter.value"
            @click="activeFilter = filter.value"
            :class="[
              'px-4 py-2 rounded-lg font-medium transition-colors text-sm',
              activeFilter === filter.value
                ? 'bg-primary-600 text-white shadow-sm'
                : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50 hover:border-gray-300'
            ]"
          >
            {{ filter.label }}
          </button>
        </div>

        <!-- État de chargement initial (première fois, pas de données) -->
        <div
          v-if="
            propertiesStore.loading &&
            propertiesStore.properties.length === 0 &&
            !propertiesStore.error
          "
          class="text-center py-16"
        >
          <div
            class="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mb-4"
          ></div>
          <p class="text-gray-500">{{ $t('tenants.loading') }}</p>
        </div>

        <!-- Erreur (uniquement si pas de données en cache) -->
        <div
          v-else-if="propertiesStore.error && propertiesStore.properties.length === 0"
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
              {{ $t('common.errorWithColon') }} {{ propertiesStore.error }}
            </p>
          </div>
        </div>

        <!-- Loader inline si données déjà chargées (refresh) -->
        <div v-else-if="propertiesStore.loading" class="text-center py-8">
          <InlineLoader />
        </div>

        <!-- Liste des locataires (s'affiche même si vide, le composant gère l'état vide) -->
        <!-- S'affiche dès que le chargement initial est terminé -->
        <TenantsList
          v-if="!propertiesStore.loading && !propertiesStore.error"
          :tenants="filteredTenants"
          :has-filters="hasActiveFilters"
          @edit-tenant="handleEditTenant"
          @delete-tenant="handleDeleteTenant"
          @clear-filters="clearFilters"
        />
      </div>
    </main>

    <!-- Modal d'ajout de locataire -->
    <AddTenantModal :isOpen="isModalOpen" @close="isModalOpen = false" @submit="handleAddTenant" />

    <!-- Modal de confirmation de suppression -->
    <ConfirmModal
      :isOpen="showDeleteConfirm"
      title="Supprimer ce locataire ?"
      :message="
        $t('tenants.confirmDelete') ||
        'Êtes-vous sûr de vouloir supprimer ce locataire ? Le bien sera libéré.'
      "
      confirm-label="Supprimer"
      cancel-label="Annuler"
      variant="danger"
      :isLoading="isDeletingTenant"
      @confirm="confirmDelete"
      @cancel="cancelDelete"
      @update:isOpen="showDeleteConfirm = $event"
    />
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from '@/composables/useLingui'
import { usePullToRefresh } from '@/composables/usePullToRefresh'
import Sidebar from '../components/Sidebar.vue'
import PullToRefresh from '../components/common/PullToRefresh.vue'
import TenantsHeader from '../components/tenants/TenantsHeader.vue'
import TenantsList from '../components/tenants/TenantsList.vue'
import AddTenantModal from '../components/tenants/AddTenantModal.vue'
import InlineLoader from '../components/common/InlineLoader.vue'
import ConfirmModal from '../components/common/ConfirmModal.vue'
import { useTenantsStore } from '@/stores/tenantsStore'
import { usePropertiesStore } from '@/stores/propertiesStore'
import { PAYMENT_STATUS } from '@/utils/constants'

const { t } = useI18n()
const router = useRouter()
const tenantsStore = useTenantsStore()
const propertiesStore = usePropertiesStore()

// Pull-to-refresh
const mainElement = ref(null)
const { isPulling, pullDistance, isRefreshing } = usePullToRefresh(
  async () => {
    // Force le rafraîchissement des propriétés (les locataires sont dérivés)
    await propertiesStore.fetchProperties(true) // force = true pour bypasser le cache
  },
  { threshold: 80 }
)

/**
 * Charge les propriétés depuis Supabase au montage (les locataires sont dérivés des propriétés)
 * Initialise le temps réel pour les mises à jour automatiques
 */
onMounted(async () => {
  try {
    // Force le fetch si pas encore chargé OU si loading est bloqué
    if (propertiesStore.properties.length === 0) {
      if (propertiesStore.loading) {
        // Attend max 3 secondes que le fetch se termine
        let attempts = 0
        while (propertiesStore.loading && attempts < 30) {
          await new Promise(resolve => setTimeout(resolve, 100))
          attempts++
        }
      }

      // Si toujours pas de données après attente (que loading soit true ou false), force un nouveau fetch
      if (propertiesStore.properties.length === 0) {
        if (propertiesStore.loading) {
          // Force loading à false pour débloquer
          propertiesStore.loading = false
        }
        await propertiesStore.fetchProperties(true) // force = true pour bypasser le check loading
      }
    }

    // Note: Realtime est déjà initialisé globalement dans App.vue
    // Pas besoin de réinitialiser ici
  } catch (error) {
    console.error('❌ Erreur lors du chargement des locataires:', error)
    // Force loading à false en cas d'erreur
    propertiesStore.loading = false
  }
})

/**
 * Arrête le temps réel au démontage (optionnel)
 */
onUnmounted(() => {
  // propertiesStore.stopRealtime()
})

// Utilise les locataires du store Pinia (synchronisé avec propertiesStore)
const tenants = computed(() => tenantsStore.tenants)

// État local pour filtres et modal
const activeFilter = ref('all')
const isModalOpen = ref(false)

/**
 * Statistiques globales depuis le store
 */
const stats = computed(() => ({
  totalTenants: tenants.value.length,
  onTimeTenants: tenantsStore.onTimeTenants.length,
  lateTenants: tenantsStore.lateTenants.length,
  totalRent: tenantsStore.totalTenantsRent
}))

/**
 * Filtres disponibles
 */
const filters = computed(() => [
  { label: t('common.all'), value: 'all' },
  { label: t('status.onTime'), value: PAYMENT_STATUS.ON_TIME },
  { label: t('status.late'), value: PAYMENT_STATUS.LATE }
])

/**
 * Vérifie si des filtres sont actifs
 */
const hasActiveFilters = computed(() => {
  return activeFilter.value !== 'all'
})

/**
 * Filtre les locataires selon le filtre actif
 */
const filteredTenants = computed(() => {
  if (activeFilter.value === 'all') {
    return tenants.value
  }
  return tenants.value.filter(tenant => tenant.status === activeFilter.value)
})

/**
 * Réinitialise tous les filtres
 */
const clearFilters = () => {
  activeFilter.value = 'all'
}

/**
 * Gère l'ajout d'un nouveau locataire via le store Pinia (Supabase)
 */
const handleAddTenant = async newTenant => {
  try {
    await tenantsStore.addTenant(newTenant)
    isModalOpen.value = false
    // Le toast est géré dans le store
  } catch (error) {
    // Le toast d'erreur est géré dans le store
    console.error("Erreur lors de l'ajout du locataire:", error)
  }
}

/**
 * Gère l'édition d'un locataire
 * Redirige vers la page de modification du bien associé
 */
const handleEditTenant = tenant => {
  // Un locataire est lié à un bien, on redirige vers la page de modification du bien
  if (tenant && tenant.propertyId) {
    router.push({ path: '/biens', query: { mode: 'edit', id: tenant.propertyId } })
  } else {
    console.warn('⚠️ handleEditTenant: locataire sans propertyId', tenant)
  }
}

/**
 * Gère la suppression d'un locataire (libère le bien) via Supabase
 */
const confirmDeleteId = ref(null)
const showDeleteConfirm = ref(false)

const handleDeleteTenant = tenantId => {
  confirmDeleteId.value = tenantId
  showDeleteConfirm.value = true
}

const isDeletingTenant = ref(false)

const confirmDelete = async () => {
  if (!confirmDeleteId.value) return

  isDeletingTenant.value = true
  try {
    await tenantsStore.removeTenant(confirmDeleteId.value)
    confirmDeleteId.value = null
    showDeleteConfirm.value = false
  } catch (error) {
    console.error('Erreur lors de la suppression du locataire:', error)
  } finally {
    isDeletingTenant.value = false
  }
}

const cancelDelete = () => {
  confirmDeleteId.value = null
  showDeleteConfirm.value = false
}
</script>
