import { computed } from "vue";
import { usePartStore } from "@/stores/partStore";
import { getEntityLabel } from "@/utils/reportLabels.js";

export function useEntityLabel() {
  const partStore = usePartStore();
  const reportPart = computed(() => partStore.system_part || "english");

  function selectItemTitle(item) {
    return getEntityLabel(item, reportPart.value, "");
  }

  function entityLabel(entity, fallback = "—") {
    return getEntityLabel(entity, reportPart.value, fallback);
  }

  return { reportPart, selectItemTitle, entityLabel };
}
