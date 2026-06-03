<template>
  <section class="state-panel" :aria-labelledby="`${id}-title`">
    <span class="state-dot" :class="tone" aria-hidden="true"></span>
    <div>
      <h2 :id="`${id}-title`">{{ title }}</h2>
      <p>{{ body }}</p>
    </div>
  </section>
</template>

<script setup lang="ts">
defineProps<{
  id: string
  title: string
  body: string
  tone?: 'purple' | 'navy' | 'green'
}>()
</script>
