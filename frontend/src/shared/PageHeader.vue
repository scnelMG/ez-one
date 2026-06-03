<template>
  <section class="page-header">
    <p class="eyebrow">{{ eyebrow }}</p>
    <div class="page-header-row">
      <div>
        <h1>{{ title }}</h1>
        <p>{{ description }}</p>
      </div>
      <slot name="action" />
    </div>
  </section>
</template>

<script setup lang="ts">
defineProps<{
  eyebrow: string
  title: string
  description: string
}>()
</script>
