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
        permission: "view-loans",
      },
      {
        title: "Current Loans",
        icon: "tabler-file-star",
        tab: "current-loans",
        permission: "view-loans",
      },
      {
        title: "Late Loans",
        icon: "tabler-file-alert",
        tab: "late-loans",
        permission: "view-loans",
      },
      {
        title: "Overdue Loans",
        icon: "tabler-file-neutral",
        tab: "overdue-loans",
        permission: "view-loans",
      },
      {
        title: "Closed Loans",
        icon: "tabler-file-check",
        tab: "closed-loans",
        permission: "view-loans",
      },
    ],
  },
];
