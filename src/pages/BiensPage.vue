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
      <div class="max-w-7xl mx-auto px-2 sm:px-3 lg:px-6 xl:px-8 pt-16 pb-20 sm:pt-10 sm:pb-10">
        <!-- Header avec statistiques -->
        <PropertiesHeader :stats="stats" @add-property="isAddModalOpen = true" />

        <!-- Filtres et recherche -->
        <PropertiesFilters
          :search-term="searchTerm"
          :active-filter="activeFilter"
          :filter-counts="filterCounts"
          @search="handleSearch"
          @filter="handleFilter"
        />

        <!-- État de chargement avec skeletons (uniquement si aucune donnée) -->
        <div
          v-if="propertiesStore.loading && propertiesStore.properties.length === 0"
          class="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 lg:gap-6"
        >
          <SkeletonCard v-for="n in 6" :key="n" />
        </div>

        <!-- Erreur (uniquement si aucune donnée en cache) -->
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

        <!-- Contenu principal (s'affiche même si loading en arrière-plan) -->
        <div>
          <!-- Loader inline si refresh en cours ET données déjà présentes -->
          <div
            v-if="propertiesStore.loading && propertiesStore.properties.length > 0"
            class="text-center py-4 mb-4"
          >
            <InlineLoader />
          </div>

          <!-- Liste des biens -->
          <PropertiesList
            :properties="filteredProperties"
            :has-filters="hasActiveFilters"
            @edit-property="handleEditProperty"
            @delete-property="handleDeleteProperty"
            @clear-filters="clearFilters"
          />
        </div>
      </div>
    </main>

    <!-- Modal d'ajout de bien -->
    <AddPropertyModal
      :isOpen="isAddModalOpen"
      @close="isAddModalOpen = false"
      @submit="handleAddProperty"
    />

    <!-- Modal d'édition de bien -->
    <EditPropertyModal
      :isOpen="isEditModalOpen"
      :property="selectedProperty"
      @close="isEditModalOpen = false"
      @submit="handleUpdateProperty"
    />

    <!-- Floating Action Button (mobile only) -->
    <FloatingActionButton :aria-label="$t('common.addProperty')" @click="isAddModalOpen = true" />

    <!-- Modal de confirmation de suppression -->
    <ConfirmModal
      :isOpen="showDeleteConfirm"
      title="Supprimer ce bien ?"
      :message="
        $t('properties.confirmDelete') ||
        'Cette action est irréversible. Toutes les données associées seront également supprimées.'
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
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { usePullToRefresh } from '@/composables/usePullToRefresh'
import Sidebar from '../components/Sidebar.vue'
import PropertiesHeader from '../components/properties/PropertiesHeader.vue'
import PropertiesFilters from '../components/properties/PropertiesFilters.vue'
import PropertiesList from '../components/properties/PropertiesList.vue'
import AddPropertyModal from '../components/dashboard/AddPropertyModal.vue'
import EditPropertyModal from '../components/properties/EditPropertyModal.vue'
import ConfirmModal from '../components/common/ConfirmModal.vue'
import SkeletonCard from '../components/common/SkeletonCard.vue'
import InlineLoader from '../components/common/InlineLoader.vue'
import FloatingActionButton from '../components/common/FloatingActionButton.vue'
import PullToRefresh from '../components/common/PullToRefresh.vue'
import { usePropertiesStore } from '@/stores/propertiesStore'
import { PROPERTY_STATUS } from '@/utils/constants'

const propertiesStore = usePropertiesStore()
const route = useRoute()
const router = useRouter()

// Pull-to-refresh
const mainElement = ref(null)
const { isPulling, pullDistance, isRefreshing } = usePullToRefresh(
  async () => {
    // Force le rafraîchissement des données
    await propertiesStore.fetchProperties(true) // force = true pour bypasser le cache
  },
  { threshold: 80 }
)

/**
 * Charge les propriétés depuis Supabase au montage
 * Note: App.vue charge déjà les données au démarrage, on ne recharge jamais ici
 * pour éviter les conflits et les états loading bloqués
 */
onMounted(() => {
  // App.vue gère déjà le chargement initial et le realtime
  // On fait confiance au store pour les données déjà chargées

  // Gère les query params pour ouvrir automatiquement le modal d'édition
  if (route.query.mode === 'edit' && route.query.id) {
    const property = propertiesStore.properties.find(p => p.id === route.query.id)
    if (property) {
      selectedProperty.value = property
      isEditModalOpen.value = true
      // Nettoie l'URL
      router.replace({ path: '/biens' })
    }
  } else if (route.query.mode === 'add') {
    isAddModalOpen.value = true
    // Nettoie l'URL
    router.replace({ path: '/biens' })
  }
})

// Surveille les changements de route pour gérer les modals
watch(
  () => route.query,
  query => {
    if (query.mode === 'edit' && query.id) {
      const property = propertiesStore.properties.find(p => p.id === query.id)
      if (property) {
        selectedProperty.value = property
        isEditModalOpen.value = true
        router.replace({ path: '/biens' })
      }
    } else if (query.mode === 'add') {
      isAddModalOpen.value = true
      router.replace({ path: '/biens' })
    }
  }
)

/**
 * Arrête le temps réel au démontage (optionnel, peut rester actif globalement)
 */
onUnmounted(() => {
  // propertiesStore.stopRealtime() // Décommenter si on veut arrêter en quittant la page
})

// Utilise les propriétés du store Pinia (synchronisé avec DashboardPage)
const properties = computed(() => propertiesStore.properties)

// État local pour recherche et filtres
const searchTerm = ref('')
const activeFilter = ref('all')
const isAddModalOpen = ref(false)
const isEditModalOpen = ref(false)
const selectedProperty = ref(null)

/**
 * Statistiques globales depuis le store
 */
const stats = computed(() => ({
  totalProperties: propertiesStore.totalProperties,
  occupiedProperties: propertiesStore.occupiedProperties,
  vacantProperties: propertiesStore.vacantProperties,
  totalRent: propertiesStore.totalRent
}))

/**
 * Compteurs pour les filtres
 */
const filterCounts = computed(() => ({
  all: properties.value.length,
  occupied: properties.value.filter(p => p.status === PROPERTY_STATUS.OCCUPIED).length,
  vacant: properties.value.filter(p => p.status === PROPERTY_STATUS.VACANT).length
}))

/**
 * Vérifie si des filtres sont actifs
 */
const hasActiveFilters = computed(() => {
  return searchTerm.value.length > 0 || activeFilter.value !== 'all'
})

/**
 * Filtre les propriétés selon le terme de recherche et le filtre actif
 */
const filteredProperties = computed(() => {
  let filtered = properties.value

  // Filtrage par recherche (nom, ville, adresse)
  if (searchTerm.value.trim()) {
    const search = searchTerm.value.toLowerCase()
    filtered = filtered.filter(property => {
      const matchName = property.name?.toLowerCase().includes(search)
      const matchCity = property.city?.toLowerCase().includes(search)
      const matchAddress = property.address?.toLowerCase().includes(search)
      return matchName || matchCity || matchAddress
    })
  }

  // Filtrage par statut
  if (activeFilter.value !== 'all') {
    filtered = filtered.filter(property => property.status === activeFilter.value)
  }

  return filtered
})

/**
 * Gère la recherche
 */
const handleSearch = term => {
  searchTerm.value = term
}

/**
 * Gère le changement de filtre
 */
const handleFilter = filterValue => {
  activeFilter.value = filterValue
}

/**
 * Réinitialise tous les filtres
 */
const clearFilters = () => {
  searchTerm.value = ''
  activeFilter.value = 'all'
}

/**
 * Gère l'ajout d'un nouveau bien via le store Pinia (Supabase)
 */
const handleAddProperty = async newProperty => {
  try {
    await propertiesStore.addProperty(newProperty)
    isAddModalOpen.value = false
    // Le toast est géré dans le store
  } catch (error) {
    // Le toast d'erreur est géré dans le store
    console.error("Erreur lors de l'ajout du bien:", error)
  }
}

/**
 * Gère l'édition d'un bien
 * Ouvre le modal d'édition avec les données du bien sélectionné
 */
const handleEditProperty = property => {
  selectedProperty.value = property
  isEditModalOpen.value = true
}

/**
 * Gère la mise à jour d'un bien via le store Pinia (Supabase)
 */
const handleUpdateProperty = async updatedData => {
  if (!selectedProperty.value) return

  try {
    await propertiesStore.updateProperty(selectedProperty.value.id, {
      name: updatedData.name,
      address: updatedData.address,
      city: updatedData.city,
      rent: updatedData.rent,
      status: updatedData.status,
      tenant:
        updatedData.status === PROPERTY_STATUS.OCCUPIED && updatedData.tenant
          ? {
              name: updatedData.tenant.name,
              entryDate: updatedData.tenant.entryDate,
              exitDate: selectedProperty.value.tenant?.exitDate || null,
              rent: updatedData.rent,
              status: updatedData.tenant.status || 'on_time'
            }
          : null
    })

    // Ferme le modal
    isEditModalOpen.value = false
    selectedProperty.value = null
    // Le toast est géré dans le store
  } catch (error) {
    // Le toast d'erreur est géré dans le store
    console.error('Erreur lors de la mise à jour du bien:', error)
  }
}

/**
 * Gère la suppression d'un bien via Supabase
 */
const confirmDeleteId = ref(null)
const showDeleteConfirm = ref(false)

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
    confirmDeleteId.value = null
    showDeleteConfirm.value = false
  } finally {
    isDeletingProperty.value = false
  }
}

const cancelDelete = () => {
  confirmDeleteId.value = null
  showDeleteConfirm.value = false
}
</script>
