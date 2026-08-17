export const requestLoanTabs = [
  {
    title: "Request Loans",
    icon: "tabler-list",
    tab: "request-loans",
    permission: "",
    sub: [
      {
        title: "Request Loans",
        icon: "tabler-edit",
        tab: "request",
        permission: "loans:view-page",
      },
      {
        title: "Awaiting Approval",
        icon: "tabler-hourglass-empty",
        tab: "awaiting-approval",
        permission: "loans:view-page",
      },

    ],
  },
];
