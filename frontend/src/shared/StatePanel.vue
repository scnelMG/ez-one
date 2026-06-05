<template>
  <section class="state-panel" :aria-labelledby="`${id}-title`">
    <span class="state-dot" :class="tone" aria-hidden="true"></span>
    <div>
      <h2 :id="`${id}-title`">{{ title }}</h2>
      <p>{{ body }}</p>
    </div>
  </section>
</template>

<script setup>defineProps({
  id: {
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
  tone: {
    type: String,
    default: 'purple'
  }
});
</script>
