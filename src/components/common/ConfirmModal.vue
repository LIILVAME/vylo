<template>
  <Teleport to="body">
    <Transition name="modal">
      <div
        v-if="isOpen"
        class="fixed inset-0 z-[100] flex items-center justify-center p-4"
        @click.self="handleCancel"
      >
        <!-- Overlay -->
        <div
          class="absolute inset-0 bg-black bg-opacity-50 transition-opacity"
          @click="handleCancel"
        />

        <!-- Modal -->
        <div
          class="relative bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-md w-full p-6 transform transition-all"
          role="dialog"
          aria-modal="true"
          :aria-labelledby="'confirm-title-' + modalId"
        >
          <!-- Icône d'avertissement -->
          <div
            v-if="variant === 'danger'"
            class="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 dark:bg-red-900/20 mb-4"
          >
            <svg
              class="h-6 w-6 text-red-600 dark:text-red-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>

          <!-- Icône d'info -->
          <div
            v-else-if="variant === 'info'"
            class="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-blue-100 dark:bg-blue-900/20 mb-4"
          >
            <svg
              class="h-6 w-6 text-blue-600 dark:text-blue-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>

          <!-- Titre -->
          <h3
            :id="'confirm-title-' + modalId"
            class="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2 text-center"
          >
            {{ title }}
          </h3>

          <!-- Message -->
          <p v-if="message" class="text-sm text-gray-600 dark:text-gray-400 mb-6 text-center">
            {{ message }}
          </p>

          <!-- Slot pour contenu personnalisé -->
          <div v-if="$slots.default" class="mb-6">
            <slot />
          </div>

          <!-- Actions -->
          <div class="flex flex-col-reverse sm:flex-row gap-3 sm:justify-end">
            <!-- Annuler -->
            <button
              @click="handleCancel"
              :disabled="isLoading"
              :class="[
                'px-4 py-2 rounded-lg font-medium transition-all',
                'text-gray-700 dark:text-gray-300',
                'bg-gray-100 dark:bg-gray-700',
                'hover:bg-gray-200 dark:hover:bg-gray-600',
                'focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2',
                'sm:order-2',
                'disabled:opacity-50 disabled:cursor-not-allowed'
              ]"
            >
              {{ cancelLabel }}
            </button>

            <!-- Confirmer -->
            <button
              @click="handleConfirm"
              :disabled="isLoading"
              :class="[
                'px-4 py-2 rounded-lg font-medium transition-all flex items-center justify-center gap-2',
                'text-white',
                'focus:outline-none focus:ring-2 focus:ring-offset-2',
                'sm:order-1',
                'disabled:opacity-50 disabled:cursor-not-allowed',
                variant === 'danger'
                  ? 'bg-red-600 hover:bg-red-700 focus:ring-red-500'
                  : 'bg-primary-500 hover:bg-primary-600 focus:ring-primary-500'
              ]"
            >
              <svg v-if="isLoading" class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle
                  class="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  stroke-width="4"
                />
                <path
                  class="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
              <span>{{ isLoading ? 'Suppression...' : confirmLabel }}</span>
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup>
import { computed } from 'vue'

defineProps({
  isOpen: {
    type: Boolean,
    default: false
  },
  title: {
    type: String,
    required: true
  },
  message: {
    type: String,
    default: ''
  },
  confirmLabel: {
    type: String,
    default: 'Confirmer'
  },
  cancelLabel: {
    type: String,
    default: 'Annuler'
  },
  variant: {
    type: String,
    default: 'danger', // 'danger', 'info'
    validator: value => ['danger', 'info'].includes(value)
  },
  isLoading: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['confirm', 'cancel', 'update:isOpen'])

const modalId = computed(() => `modal-${Date.now()}`)

const handleConfirm = () => {
  emit('confirm')
  emit('update:isOpen', false)
}

const handleCancel = () => {
  emit('cancel')
  emit('update:isOpen', false)
}
</script>

<style scoped>
/* Animations modal */
.modal-enter-active,
.modal-leave-active {
  transition: opacity 0.3s ease;
}

.modal-enter-active .bg-white,
.modal-leave-active .bg-white {
  transition:
    transform 0.3s ease,
    opacity 0.3s ease;
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}

.modal-enter-from .bg-white,
.modal-leave-to .bg-white {
  transform: scale(0.95);
  opacity: 0;
}
</style>
