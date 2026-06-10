<template>
  <div class="skeleton-loader" :aria-label="label" role="status">
    <span v-for="n in lines" :key="n" class="skeleton-line" :style="lineStyle(n)" />
  </div>
</template>

<script setup>
defineProps({
  lines: { type: Number, default: 3 },
  label: { type: String, default: '불러오는 중' }
});
function lineStyle(n) {
  const widths = [100, 88, 72, 60, 80, 66];
  return { width: (widths[(n - 1) % widths.length]) + '%' };
}
</script>
