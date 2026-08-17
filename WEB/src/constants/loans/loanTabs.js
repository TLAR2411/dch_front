export const loanTabs = [
  {
    title: "Loans",
    icon: "tabler-list",
    tab: "loans",
    permission: "",
    sub: [
      {
        title: "All Loans",
        icon: "tabler-file-text",
        tab: "all-loans",
        permission: "loans:view-page",
      },
      {
        title: "Current Loans",
        icon: "tabler-file-star",
        tab: "current-loans",
        permission: "loans:view-page",
      },
      {
        title: "Late Loans",
        icon: "tabler-file-alert",
        tab: "late-loans",
        permission: "loans:view-page",
      },
      {
        title: "Overdue Loans",
        icon: "tabler-file-neutral",
        tab: "overdue-loans",
        permission: "loans:view-page",
      },
      {
        title: "Closed Loans",
        icon: "tabler-file-check",
        tab: "closed-loans",
        permission: "loans:view-page",
      },
    ],
  },
];
