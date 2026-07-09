export const journalTabs = [
  {
    title: "Journals",
    icon: "tabler-users",
    tab: "journals",
    permission: "",
    sub: [
      {
        title: "Account List",
        icon: "tabler-list-details",
        tab: "list",
        permission: "view-journals",
      },
      {
        title: "Journal",
        icon: "tabler-edit",
        tab: "create",
        permission: "add-journals",
      },
      {
        title: "Close Entry",
        tab: "close-entry",
        icon: "tabler-checklist",
        permission: "view-close-entries",
      },
      // {
      //   title: "Income",
      //   icon: "tabler-arrow-down",
      //   tab: "income",
      //   permission: "add-journals",
      // },
      // {
      //   title: "Expense",
      //   icon: "tabler-arrow-up",
      //   tab: "expense",
      //   permission: "add-journals",
      // },
    ],
  },
];
