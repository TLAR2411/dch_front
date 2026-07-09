export default [
    {
        title: "Dashboards",
        to: { name: "admin-dashboards" },
        icon: { icon: "tabler-dashboard" },
    },
    {
        title: "Students",
        to: {
            name: "admin-students",
        },
        icon: { icon: "tabler-user" },
        // permission: "view-students",
    },


    // {
    //     title: "Rooms",
    //     icon: { icon: "tabler-home" },
    //     permission: '',
    //     to: {
    //         name: "admin-rooms"
    //     }
    // },

    // {
    //     title: "Grades",
    //     icon: { icon: "tabler-rosette-discount-check" },
    //     permission: '',
    //     to: {
    //         name: "global-grades"
    //     }
    // },







    // {
    //     title: "Address",

    //     icon: { icon: "tabler-map" },
    //     permission: 'view-address',
    //     children: [
    //         {
    //             title: "Villages",
    //             to: {
    //                 name: "admin-address-villages",
    //             },
    //             permission: "view-villages",
    //         },
    //         {
    //             title: "Communes",
    //             to: {
    //                 name: "admin-address-communes",
    //             },
    //             permission: "view-communes",
    //         },
    //         {
    //             title: "Districts",
    //             to: {
    //                 name: "admin-address-districts",
    //             },
    //             permission: "view-districts",
    //         },
    //         {
    //             title: "Provinces",
    //             to: {
    //                 name: "admin-address-provinces",
    //             },
    //             permission: "view-provinces",
    //         },
    //     ],
    // },


    {
        title: "Branches",
        to: {
            name: "admin-branches",
        },
        permission: "view-branches",
        icon: { icon: "tabler-building-bank" },
    },
    {
        title: "Years",
        to: {
            name: "admin-years",
        },
        icon: { icon: "tabler-calendar" },
        // permission: "view-years",
    },

    {
        title: "Curriculums",
        to: {
            name: "admin-curriculums",
        },
        icon: { icon: "tabler-books" },
        // permission: "view-curriculumns",
    },
    {
        title: "Generals",
        icon: { icon: "tabler-settings" },
        permission: '',
        children: [

            {
                title: "Closed Days",
                to: {
                    name: "admin-closed-days",
                },
                permission: "",
            },
            {
                title: "Term Periods",
                to: {
                    name: "global-term",
                },
                permission: "",
            },





        ],
    },

    {
        title: "List Users",
        to: { name: "admin-users" },
        icon: { icon: "tabler-users" },
        permission: "view-users"
    },
    {
        title: "Activity Log",
        to: { name: "admin-activity-log" },
        icon: { icon: "tabler-file-text-shield" },
        permission: "view-activity-log"
    },


    {
        title: "Auth",

        icon: { icon: "tabler-shield-lock" },
        permission: '',
        children: [
            {
                title: "Roles",
                to: {
                    name: "admin-roles",
                },
                // permission: "view-roles",
            },
            {
                title: "Positions",
                to: {
                    name: "admin-positions",
                },
                permission: "view-positions",
            },
        ],
    },

    {
        title: "Chat",
        to: {
            name: "global-chat",
        },
        icon: { icon: "tabler-books" },
        // permission: "view-curriculumns",
    },
];
