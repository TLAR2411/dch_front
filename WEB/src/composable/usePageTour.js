import { onMounted, onUnmounted, nextTick } from "vue";
import { driver } from "driver.js";
import "driver.js/dist/driver.css";
import { getPageTour } from "@/utils/pageTours";
import {
  registerPageTour,
  unregisterPageTour,
} from "@/utils/pageTourRegistry";
import { markPageTourSeen } from "@/utils/pageTourStorage";

/**
 * Driver.js page tour. Tours never open on their own: they only run when the
 * user clicks a ? button, which calls startTour({ force: true }).
 * @param {string} tourId - key in pageTours
 * @param {{ autoStart?: boolean, delayMs?: number }} options - autoStart: false
 *   keeps the tour off the navbar ? button (dialogs have their own ? button)
 */
export function usePageTour(tourId, options = {}) {
  const { autoStart = true, delayMs = 450 } = options;
  let driverObj = null;
  let timer = null;

  const buildDriver = () => {
    const tour = getPageTour(tourId);
    if (!tour?.steps?.length) return null;

    return driver({
      showProgress: true,
      animate: true,
      allowClose: true,
      overlayOpacity: 0.45,
      stagePadding: 8,
      skipMissingElement: true,
      // Above Vuetify dialogs (z-index ~2400)
      overlayColor: "rgb(0 0 0 / 0.5)",
      nextBtnText: "Next",
      prevBtnText: "Back",
      doneBtnText: "Done",
      steps: tour.steps,
      onDestroyed: () => {
        markPageTourSeen(tourId);
        driverObj = null;
      },
    });
  };

  const startTour = async ({ force = true } = {}) => {
    if (!force) return;

    await nextTick();
    // Wait for layout / async fields to paint
    await new Promise((resolve) => {
      timer = setTimeout(resolve, delayMs);
    });

    if (driverObj?.isActive?.()) {
      driverObj.destroy();
    }

    driverObj = buildDriver();
    if (!driverObj) return;
    driverObj.drive();
  };

  onMounted(() => {
    if (autoStart) {
      registerPageTour(tourId, startTour);
    }
  });

  onUnmounted(() => {
    if (autoStart) {
      unregisterPageTour(tourId);
    }
    if (timer) clearTimeout(timer);
    if (driverObj?.isActive?.()) {
      driverObj.destroy();
    }
    driverObj = null;
  });

  return { startTour };
}
