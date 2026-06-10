import { reactive } from 'vue';

const state = reactive({ visible: false, message: '', tone: 'blue', timerId: null });

export function showToast(message, options = {}) {
  if (state.timerId) {
    clearTimeout(state.timerId);
  }
  state.message = message;
  state.tone = options.tone ?? 'blue';
  state.visible = true;
  state.timerId = setTimeout(() => {
    state.visible = false;
    state.timerId = null;
  }, options.duration ?? 3200);
}

export function useToast() {
  return { state, showToast };
}
