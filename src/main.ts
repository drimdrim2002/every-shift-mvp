import { createApp } from 'vue'
import './style.css'
import App from './App.vue'

// Test Naive UI import
import naive from 'naive-ui'

const app = createApp(App)
app.use(naive)
app.mount('#app')
