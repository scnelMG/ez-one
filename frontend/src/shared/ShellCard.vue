<template>
  <article class="shell-card">
    <div class="shell-card-top">
      <span class="shell-card-kicker">{{ kicker }}</span>
      <span class="status-chip">{{ status }}</span>
    </div>
    <h2>{{ title }}</h2>
    <p>{{ body }}</p>
  </article>
</template>

<script setup lang="ts">
defineProps<{
  kicker: string
  title: string
  body: string
  status: string
}>()
</script>
