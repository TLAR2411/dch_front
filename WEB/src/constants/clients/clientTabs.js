export const clientTabs = [
  {
    title: "Clients",
    icon: "tabler-user-circle",
    tab: "clients",
    permission: "",
    sub: [
      {
        title: "List Clients",
        icon: "tabler-list-details",
        tab: "list",
        permission: "clients:view-page",
      },
      {
        title: "Client",
        icon: "tabler-edit",
        tab: "create",
        permission: "add-clients",
      },
      {
        title: "Black List",
        icon: "tabler-address-book-off",
        tab: "black-list",
        permission: "clients:view-page",
      },
    ],
  },
];
