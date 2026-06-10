<template>
  <Teleport to="body">
    <Transition name="toast-slide">
      <div v-if="toast.state.visible" class="toast-notification" :class="toast.state.tone" role="status" aria-live="polite">
        <span class="toast-dot" aria-hidden="true" />
        <p>{{ toast.state.message }}</p>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup>
import { useToast } from './useToast';
const toast = useToast();
</script>
