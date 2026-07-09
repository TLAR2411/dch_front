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
        permission: "view-loans",
      },
      {
        title: "Awaiting Approval",
        icon: "tabler-hourglass-empty",
        tab: "awaiting-approval",
        permission: "view-loans",
      },

    ],
  },
];
