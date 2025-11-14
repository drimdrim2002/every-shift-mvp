import { createApp } from 'vue';
import { createPinia } from 'pinia';
import router from './router';
import './style.css';
import App from './App.vue';

// Test Naive UI import
import naive from 'naive-ui';

const app = createApp(App);
const pinia = createPinia();

// Register plugins
app.use(pinia);
app.use(router);
app.use(naive);

app.mount('#app');
