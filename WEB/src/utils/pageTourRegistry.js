import { computed, ref, shallowRef } from "vue";
import { getPageTour } from "@/utils/pageTours";

const activeTourId = ref(null);
const activeStartTour = shallowRef(null);

export function registerPageTour(tourId, startTourFn) {
  activeTourId.value = tourId;
  activeStartTour.value = startTourFn;
}

export function unregisterPageTour(tourId) {
  if (activeTourId.value !== tourId) return;
  activeTourId.value = null;
  activeStartTour.value = null;
}

export function usePageTourRegistry() {
  const hasActiveTour = computed(
    () => !!activeTourId.value && !!getPageTour(activeTourId.value),
  );

  function replayActiveTour() {
    activeStartTour.value?.({ force: true });
  }

  return {
    activeTourId,
    hasActiveTour,
    replayActiveTour,
  };
}
