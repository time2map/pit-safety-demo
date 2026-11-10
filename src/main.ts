import { createApp } from 'vue'
import './styles/app.css'
import App from './App.vue'

// Dev-only: drive animation frames with timers (?rafshim=1) for previews that cannot animate.
if (import.meta.env.DEV && new URLSearchParams(location.search).get('rafshim') === '1') {
  window.requestAnimationFrame = (cb) => window.setTimeout(() => cb(performance.now()), 16)
  window.cancelAnimationFrame = (id) => window.clearTimeout(id)
}

createApp(App).mount('#app')
