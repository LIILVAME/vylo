<template>
  <div>
    <slot />
    <OnboardingStep
      v-if="shouldShow && currentStep"
      :step="currentStep"
      :step-index="currentStepIndex"
      :total-steps="onboardingStepsList"
      :has-next="hasNext"
      :has-previous="hasPrevious"
      @next="next"
      @previous="previous"
      @complete="complete"
      @dismiss="dismiss"
    />
  </div>
</template>

<script setup>
import { watch } from 'vue'
import { useOnboarding } from '@/composables/useOnboarding'
import OnboardingStep from './OnboardingStep.vue'

const props = defineProps({
  steps: {
    type: Array,
    required: true
  },
  autoStart: {
    type: Boolean,
    default: false
  }
})

const {
  shouldShow,
  currentStep,
  currentStepIndex,
  steps: onboardingStepsList,
  hasNext,
  hasPrevious,
  init,
  next,
  previous,
  complete,
  dismiss
} = useOnboarding()

// Initialise l'onboarding quand les steps sont fournis (mais ne démarre pas automatiquement)
watch(
  () => props.steps,
  newSteps => {
    if (newSteps && newSteps.length > 0 && !shouldShow.value) {
      // Init sans activer (activate = false) sauf si autoStart est true
      init(newSteps, props.autoStart)
    }
  },
  { immediate: true }
)

/**
 * Démarre l'onboarding (pour déclenchement manuel)
 */
const startOnboarding = () => {
  if (props.steps && props.steps.length > 0) {
    // Init avec activation
    init(props.steps, true)
  }
}

// Expose les méthodes pour contrôle externe
defineExpose({
  start: startOnboarding,
  next,
  previous,
  complete,
  dismiss
})
</script>
