<template>
  <section class="page-header">
    <div class="page-header-row">
      <div>
        <p v-if="eyebrow" class="eyebrow">{{ eyebrow }}</p>
        <h1>{{ title }}</h1>
        <p>{{ description }}</p>
      </div>
      <slot name="action" />
    </div>
  </section>
</template>

<script setup>defineProps({
  eyebrow: {
    type: String,
    default: ''
  },
  title: {
    type: String,
    required: true
  },
  description: {
    type: String,
    required: true
  }
});
</script>
