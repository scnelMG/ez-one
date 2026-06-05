<template>
  <article class="shell-card">
    <div class="shell-card-top">
      <span class="shell-card-kicker">{{ kicker }}</span>
      <span class="status-chip">{{ status }}</span>
    </div>
    <strong v-if="meta" class="shell-card-meta">{{ meta }}</strong>
    <h2>{{ title }}</h2>
    <p>{{ body }}</p>
  </article>
</template>

<script setup>defineProps({
  kicker: {
    type: String,
    required: true
  },
  status: {
    type: String,
    required: true
  },
  title: {
    type: String,
    required: true
  },
  body: {
    type: String,
    required: true
  },
  meta: {
    type: String,
    default: ''
  }
});
</script>
