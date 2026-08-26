let deferredPrompt = null
let installed = false
const subscribers = new Set()

function notify() {
  subscribers.forEach(fn => fn())
}

function isStandaloneNow() {
  if (typeof window === "undefined") return false

  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    window.navigator.standalone === true
  )
}

if (typeof window !== "undefined") {
  installed = isStandaloneNow()

  window.addEventListener("beforeinstallprompt", e => {
    e.preventDefault()
    deferredPrompt = e
    notify()
  })

  window.addEventListener("appinstalled", () => {
    deferredPrompt = null
    installed = true
    notify()
  })
}

export function subscribePwaInstall(fn) {
  subscribers.add(fn)

  return () => subscribers.delete(fn)
}

export function getPwaInstallState() {
  return {
    deferredPrompt,
    installed: installed || isStandaloneNow(),
  }
}

export async function triggerPwaInstall() {
  if (!deferredPrompt) return "unavailable"

  deferredPrompt.prompt()
  const { outcome } = await deferredPrompt.userChoice

  deferredPrompt = null
  if (outcome === "accepted") installed = true
  notify()

  return outcome
}
