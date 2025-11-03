import { ref } from 'vue'
import { useToastStore } from '@/stores/toastStore'

/**
 * Composable pour standardiser toutes les opérations de suppression
 * Gère automatiquement : confirmation, loading, erreurs, feedback
 *
 * @example
 * const { showConfirm, isDeleting } = useSafeDelete({
 *   onConfirm: async (id) => {
 *     await store.removeItem(id)
 *   },
 *   title: 'Supprimer cet élément ?',
 *   message: 'Cette action est irréversible.'
 * })
 *
 * // Dans le template
 * <ConfirmModal
 *   :isOpen="showConfirm.isOpen"
 *   :title="showConfirm.config.title"
 *   :message="showConfirm.config.message"
 *   :isLoading="isDeleting"
 *   @confirm="showConfirm.handleConfirm"
 *   @cancel="showConfirm.handleCancel"
 * />
 */
export function useSafeDelete(options = {}) {
  const {
    onConfirm,
    title = 'Supprimer ?',
    message = 'Cette action est irréversible.',
    confirmLabel = 'Supprimer',
    cancelLabel = 'Annuler',
    variant = 'danger',
    successMessage = 'Élément supprimé avec succès',
    errorMessage = 'Erreur lors de la suppression'
  } = options

  const toastStore = useToastStore()
  const isDeleting = ref(false)
  const isOpen = ref(false)
  const itemToDelete = ref(null)
  const config = ref({
    title,
    message,
    confirmLabel,
    cancelLabel,
    variant
  })

  /**
   * Ouvre la modal de confirmation
   * @param {any} item - L'élément à supprimer (ID ou objet)
   * @param {Object} customConfig - Configuration personnalisée pour cette suppression
   */
  const showDeleteConfirm = (item, customConfig = {}) => {
    itemToDelete.value = item
    config.value = {
      ...config.value,
      ...customConfig
    }
    isOpen.value = true
  }

  /**
   * Confirme et exécute la suppression
   */
  const handleConfirm = async () => {
    if (!itemToDelete.value || !onConfirm) {
      isOpen.value = false
      return
    }

    isDeleting.value = true

    try {
      await onConfirm(itemToDelete.value)
      toastStore?.success(successMessage)
      itemToDelete.value = null
      isOpen.value = false
    } catch (error) {
      console.error('Erreur lors de la suppression:', error)
      toastStore?.error(errorMessage)
      // On garde la modal ouverte en cas d'erreur pour permettre une nouvelle tentative
    } finally {
      isDeleting.value = false
    }
  }

  /**
   * Annule la suppression
   */
  const handleCancel = () => {
    itemToDelete.value = null
    isOpen.value = false
  }

  /**
   * Objet pour utilisation avec ConfirmModal
   */
  const confirmModal = {
    isOpen,
    config,
    handleConfirm,
    handleCancel
  }

  return {
    // State
    isDeleting,
    itemToDelete,
    // Actions
    showDeleteConfirm,
    handleConfirm,
    handleCancel,
    // Objet complet pour ConfirmModal
    confirmModal
  }
}
