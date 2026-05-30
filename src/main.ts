import { createApp } from 'vue';
import { createPinia } from 'pinia';
import { createHead } from '@unhead/vue/client';
import { createDiscreteApi } from 'naive-ui';
import App from './App.vue';
import router from './router';
import './style.css';

// Naive UI 전역 API 생성 (Provider 불필요)
const { message, dialog, notification, loadingBar } = createDiscreteApi([
  'message',
  'dialog',
  'notification',
  'loadingBar',
]);

// window 객체에 전역 할당
window.$message = message;
window.$dialog = dialog;
window.$notification = notification;
window.$loadingBar = loadingBar;

const app = createApp(App);
const head = createHead();

app.use(head);
app.use(createPinia());
app.use(router);

app.mount('#app');
