import {
  getPwaInstallState,
  subscribePwaInstall,
  triggerPwaInstall,
} from "@/utils/pwaInstall"

export function usePwaInstall() {
  const canPrompt = ref(false)
  const isInstalled = ref(false)
  const isIos = ref(false)
  const isIosSafari = ref(false)
  const showInstructions = ref(false)

  const showInstallButton = computed(() => !isInstalled.value)

  const syncState = () => {
    const state = getPwaInstallState()

    canPrompt.value = Boolean(state.deferredPrompt)
    isInstalled.value = state.installed
  }

  const install = async () => {
    if (canPrompt.value) {
      const outcome = await triggerPwaInstall()
      if (outcome !== "unavailable") return
    }

    showInstructions.value = true
  }

  onMounted(() => {
    const ua = window.navigator.userAgent || ""
    const iosDevice =
      /iphone|ipad|ipod/i.test(ua) ||
      (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)

    isIos.value = iosDevice
    isIosSafari.value =
      iosDevice && /safari/i.test(ua) && !/crios|fxios|edgios/i.test(ua)

    syncState()

    const unsubscribe = subscribePwaInstall(syncState)
    onUnmounted(unsubscribe)
  })

  return {
    canPrompt,
    isInstalled,
    isIos,
    isIosSafari,
    showInstallButton,
    showInstructions,
    install,
  }
}
