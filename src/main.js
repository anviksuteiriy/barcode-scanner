import { createApp } from 'vue'
import App from './App.vue'
import './registerServiceWorker'
import router from './router'
import store from './store'
import { VueQrcodeReader } from 'vue-qrcode-reader';

createApp(App).use(store).use(router).use(VueQrcodeReader).mount('#app')
