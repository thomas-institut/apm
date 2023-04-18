import './style.css'
import { createApp } from 'vue'
import App from "./App.vue";
import router from '@/router/index.js'

const app = createApp(App)
app.use(router)
app.config.globalProperties.document = document
app.config.globalProperties.appConfig = window.appConfig
app.mount('#app')