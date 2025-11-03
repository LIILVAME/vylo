<template>
  <div class="flex flex-col items-center justify-center py-12 px-4 text-center">
    <!-- Illustration -->
    <div
      v-if="illustration !== 'none' || $slots.illustration"
      class="mb-4"
      :class="illustrationSizeClass"
    >
      <!-- Illustration par défaut (uniquement si aucun slot illustration n'est fourni) -->
      <div
        v-if="illustration === 'default' && !$slots.illustration"
        class="w-24 h-24 mx-auto bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center"
      >
        <svg
          class="w-12 h-12 text-gray-500 dark:text-gray-300"
          fill="none"
          stroke="currentColor"
          stroke-width="1.5"
          viewBox="0 0 24 24"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
          />
        </svg>
      </div>

      <!-- Slot pour illustration custom (remplace l'illustration par défaut si fourni) -->
      <slot v-if="$slots.illustration" name="illustration" />
    </div>

    <!-- Titre -->
    <h3
      v-if="title"
      class="text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-50 mb-2 tracking-tight"
    >
      {{ title }}
    </h3>

    <!-- Description -->
    <p
      v-if="description"
      class="text-sm sm:text-base text-gray-900 dark:text-gray-300 mb-6 max-w-md mx-auto leading-relaxed"
    >
      {{ description }}
    </p>

    <!-- Actions (CTA) -->
    <div
      v-if="$slots.actions || actionLabel"
      class="flex flex-col sm:flex-row gap-3 items-center justify-center"
    >
      <slot name="actions">
        <button
          v-if="actionLabel"
          @click="handleAction"
          :class="[
            'px-6 py-3 rounded-lg font-medium transition-all',
            'bg-primary-500 text-white hover:bg-primary-600',
            'shadow-sm hover:shadow-md',
            'focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2'
          ]"
        >
          {{ actionLabel }}
        </button>
      </slot>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  title: {
    type: String,
    default: ''
  },
  description: {
    type: String,
    default: ''
  },
  illustration: {
    type: String,
    default: 'default', // 'default', 'none', ou slot 'illustration'
    validator: value => ['default', 'none'].includes(value) || value === 'custom'
  },
  illustrationSize: {
    type: String,
    default: 'md', // 'sm', 'md', 'lg'
    validator: value => ['sm', 'md', 'lg'].includes(value)
  },
  actionLabel: {
    type: String,
    default: ''
  },
  actionHandler: {
    type: Function,
    default: null
  }
})

const emit = defineEmits(['action'])

const illustrationSizeClass = computed(() => {
  const sizes = {
    sm: 'w-16 h-16',
    md: 'w-24 h-24',
    lg: 'w-32 h-32'
  }
  return sizes[props.illustrationSize] || sizes.md
})

const handleAction = () => {
  if (props.actionHandler) {
    props.actionHandler()
  }
  emit('action')
}
</script>
