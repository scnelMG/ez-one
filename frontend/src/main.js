import { createPinia } from 'pinia';
import { createApp } from 'vue';
import App from './App.vue';
import { router } from './router';
import { setLoginRedirectHandler } from './shared/apiClient';
import './styles.css';
setLoginRedirectHandler((path) => router.push(path));
createApp(App).use(createPinia()).use(router).mount('#app');
