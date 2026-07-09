import { computed } from 'vue';

/**
 * The main composable that assembles all navigation modules into one reactive list.
 */
export const useNavigation = () => {

  // Wrap the final, combined array in a computed property
  const allNavItems = computed(() => [
    {
      title: "Dashboards",
      to: { name: "dashboards" },
      icon: { icon: "tabler-dashboard" },
    },
  ]);

  return allNavItems;
}