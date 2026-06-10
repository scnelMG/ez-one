<template>
  <Transition name="confirm-fade">
    <div v-if="show" class="confirm-modal-backdrop" role="presentation" @click.self="onCancel">
      <div
        class="confirm-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-title"
        aria-describedby="confirm-desc"
      >
        <div class="confirm-icon-area" :class="tone">
          <svg v-if="tone === 'danger'" viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
            <line x1="12" y1="9" x2="12" y2="13"></line>
            <line x1="12" y1="17" x2="12.01" y2="17"></line>
          </svg>
          <svg v-else viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="12" y1="16" x2="12" y2="12"></line>
            <line x1="12" y1="8" x2="12.01" y2="8"></line>
          </svg>
        </div>
        <div class="confirm-content">
          <h2 id="confirm-title">{{ title }}</h2>
          <p id="confirm-desc">{{ message }}</p>
        </div>
        <div class="confirm-actions">
          <button class="ghost-button" type="button" @click="onCancel">{{ cancelText }}</button>
          <button class="action-button" :class="tone" type="button" @click="onConfirm">{{ confirmText }}</button>
        </div>
      </div>
    </div>
  </Transition>
</template>

<script setup>
defineProps({
  show: Boolean,
  title: { type: String, default: '확인' },
  message: String,
  confirmText: { type: String, default: '확인' },
  cancelText: { type: String, default: '취소' },
  tone: { type: String, default: 'danger' } // danger, primary
});

const emit = defineEmits(['confirm', 'cancel']);

function onCancel() {
  emit('cancel');
}

function onConfirm() {
  emit('confirm');
}
</script>

<style scoped>
.confirm-modal-backdrop {
  position: fixed;
  inset: 0;
  z-index: 10000;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(15, 23, 42, 0.45);
  backdrop-filter: blur(6px);
  padding: 20px;
}

.confirm-dialog {
  width: 100%;
  max-width: 400px;
  background: #ffffff;
  border-radius: 16px;
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
  border: 1px solid #f1f5f9;
  padding: 24px;
  display: grid;
  grid-template-columns: 48px 1fr;
  gap: 16px;
  align-items: start;
}

.confirm-icon-area {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.confirm-icon-area.danger {
  background: #fef2f2;
  color: #ef4444;
}

.confirm-icon-area.primary {
  background: #e0e7ff;
  color: #6D4DFF;
}

.confirm-content {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.confirm-content h2 {
  margin: 0;
  font-size: 1.15rem;
  font-weight: 700;
  color: #0f172a;
  line-height: 1.4;
}

.confirm-content p {
  margin: 0;
  font-size: 0.95rem;
  color: #475569;
  line-height: 1.5;
  word-break: keep-all;
}

.confirm-actions {
  grid-column: 1 / -1;
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  margin-top: 16px;
}

.confirm-actions button {
  min-height: 40px;
  padding: 0 16px;
  font-size: 0.9rem;
  font-weight: 600;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.confirm-actions .ghost-button {
  background: #f8fafc;
  border: 1px solid #cbd5e1;
  color: #334155;
}

.confirm-actions .ghost-button:hover {
  background: #f1f5f9;
  color: #0f172a;
}

.confirm-actions .action-button {
  border: none;
  color: #ffffff;
}

.confirm-actions .action-button.danger {
  background: #ef4444;
}

.confirm-actions .action-button.danger:hover {
  background: #dc2626;
  box-shadow: 0 4px 12px rgba(239, 68, 68, 0.25);
}

.confirm-actions .action-button.primary {
  background: #6D4DFF;
}

.confirm-actions .action-button.primary:hover {
  background: #5b3bea;
  box-shadow: 0 4px 12px rgba(109, 77, 255, 0.25);
}

/* Transitions */
.confirm-fade-enter-active,
.confirm-fade-leave-active {
  transition: opacity 0.25s ease;
}

.confirm-fade-enter-active .confirm-dialog,
.confirm-fade-leave-active .confirm-dialog {
  transition: transform 0.25s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.25s ease;
}

.confirm-fade-enter-from,
.confirm-fade-leave-to {
  opacity: 0;
}

.confirm-fade-enter-from .confirm-dialog {
  transform: scale(0.9) translateY(10px);
  opacity: 0;
}

.confirm-fade-leave-to .confirm-dialog {
  transform: scale(0.95) translateY(5px);
  opacity: 0;
}
</style>
