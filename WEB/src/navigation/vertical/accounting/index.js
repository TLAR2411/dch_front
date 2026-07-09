export default [
    {
        title: "Dashboards",
        to: { name: "accounting-dashboards" },
        icon: { icon: "tabler-dashboard" },
    },
    {
        heading: 'Accounting',
        permission: [
            "reports-loan-loan-portfolio",
            "cash-flow-summary-accounting-reports",
            "profit-and-loss-summary-accounting-reports",
            "balance-sheet-summary-accounting-reports",
            "view-journals",
            "view-journal-settings",
            "view-chart-accounts",
            "view-people",
            "view-journal-classes"
        ],
    },
    {
        title: "Accounting",
        to: { name: "accounting-journals-tab", params: { tab: "list" } },
        icon: { icon: "tabler-calculator" },
        permission: "view-journals",
    },
    {
        title: "Reports",
        icon: { icon: "tabler-chart-area-line" },
        permission: [
            "cash-flow-summary-accounting-reports",
            "profit-and-loss-detail-accounting-reports",
            "profit-and-loss-summary-accounting-reports",
            "balance-sheet-summary-accounting-reports",
            "expense-summary-accounting-reports",
            "cash-denomination-tracking-accounting-reports",
            "the-executive-summary-accounting-reports"

        ],
        children: [
            {
                title: "Balance Sheet",
                icon: { icon: "tabler-scale", size: "20px" },
                to: {
                    name: "accounting-reports-balance-sheet",
                },
                permission: "balance-sheet-summary-accounting-reports",
            },
            {
                title: "Profit And Loss",
                icon: { icon: "tabler-chart-histogram", size: "20px" },
                to: {
                    name: "accounting-reports-profit-and-loss",
                },
                permission: "profit-and-loss-detail-accounting-reports",
            },
            {
                title: "Summary Profit And Loss",
                icon: { icon: "tabler-chart-histogram", size: "20px" },
                to: {
                    name: "accounting-reports-profit-and-loss-summary",
                },
                permission: "profit-and-loss-summary-accounting-reports",
            },
            {
                title: "Expense",
                icon: { icon: "tabler-cash-banknote-move", size: "20px" },
                to: {
                    name: "accounting-reports-expense-summary",
                },
                permission: "expense-summary-accounting-reports",
            },
            {
                title: "Cash Flow",
                icon: { icon: "tabler-cash-move", size: "20px" },
                to: {
                    name: "accounting-reports-cash-flow-summary",
                },
                permission: "cash-flow-summary-accounting-reports",
            },

            {
                title: "Cash Denomination Tracking",
                icon: { icon: "tabler-cash", size: "20px" },
                to: {
                    name: "accounting-reports-cash-denomination-tracking",
                },
                permission: "cash-denomination-tracking-accounting-reports",
            },
            {
                title: "The Executive Summary",
                icon: { icon: "tabler-chart-bar", size: "20px" },
                to: {
                    name: "accounting-reports-the-executive-summary",
                },
                permission: "the-executive-summary-accounting-reports",
            },
        ],
    },

    { heading: 'Settings', permission: ["journal-settings", "delete-close-entries"], },
    {
        title: "Settings",
        icon: { icon: "tabler-settings" },
        permission: ["view-journal-settings", "view-chart-accounts", "view-people", "view-journal-classes"],
        children: [
            {
                title: "Chart Accounts",
                icon: { icon: "tabler-calculator", size: "20px" },
                to: {
                    name: "accounting-chart-accounts",
                },
                permission: "view-chart-accounts",
            },
            {
                title: "Name",
                icon: { icon: "tabler-user-square", size: "20px" },
                to: {
                    name: "accounting-people",
                },
                permission: "view-people",
            },
            {
                title: "Budget Classification",
                icon: { icon: "tabler-book", size: "20px" },
                to: {
                    name: "accounting-journal-classes",
                },
                permission: "view-journal-classes",
            },
            {
                title: "Journal Settings",
                icon: { icon: "tabler-settings", size: "20px" },
                to: {
                    name: "accounting-journal-settings",
                },
            },
        ],
    },
];
