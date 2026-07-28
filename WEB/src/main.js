import { createApp } from "vue"
import App from "@/App.vue"
import { registerPlugins } from "@core/utils/plugins"

import "@core/scss/template/index.scss"
import "@styles/styles.scss"

import Notifications, { notify } from "@kyvg/vue3-notification"
import { router } from "@/router"
import print from "vue3-print-nb"

// ⬇️ Add this: PWA update handler
// import { registerSW } from "virtual:pwa-register"


// Create app
const app = createApp(App)

// Plugins
registerPlugins(app)
app.use(Notifications)
app.use(router)
app.directive("print", print)

// 🔧 Register SW before mount so it can take control early
// const updateSW = registerSW({
//     immediate: true,
//     onNeedRefresh() {
//         if (confirm('New version ready. Refresh now?')) {
//             updateSW(true)
//             location.reload()
//         }
//     },
// })

// // 🕒 Optional: poll for updates while app is open (e.g., every 30 min)
// setInterval(() => updateSW(), 30 * 60 * 1000)

// Mount
app.mount("#app")
