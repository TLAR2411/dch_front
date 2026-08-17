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
        createTo: {
            name: "admin-students-create",
        },
        icon: { icon: "tabler-user" },
        permission: "students:view-page",
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
    //             permission: "villages:view-page",
    //         },
    //         {
    //             title: "Communes",
    //             to: {
    //                 name: "admin-address-communes",
    //             },
    //             permission: "communes:view-page",
    //         },
    //         {
    //             title: "Districts",
    //             to: {
    //                 name: "admin-address-districts",
    //             },
    //             permission: "districts:view-page",
    //         },
    //         {
    //             title: "Provinces",
    //             to: {
    //                 name: "admin-address-provinces",
    //             },
    //             permission: "provinces:view-page",
    //         },
    //     ],
    // },


    {
        title: "Branches",
        to: {
            name: "admin-branches",
        },
        permission: "branches:view-page",
        icon: { icon: "tabler-building-bank" },
    },
    {
        title: "Years",
        to: {
            name: "admin-years",
        },
        icon: { icon: "tabler-calendar" },
        permission: "years:view-page",
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
        title: "Families",
        to: { name: "global-families" },
        icon: { icon: "tabler-home-heart" },
        permission: "families:view-page",
    },
    // {
    //     title: "Generals",
    //     icon: { icon: "tabler-settings" },
    //     permission: '',
    //     children: [

    //         {
    //             title: "Closed Days",
    //             to: {
    //                 name: "admin-closed-days",
    //             },
    //             permission: "",
    //         },
    //         // {
    //         //     title: "Term Periods",
    //         //     to: {
    //         //         name: "global-term",
    //         //     },
    //         //     permission: "",
    //         // },
    //     ],
    // },

    {
        icon: { icon: "tabler-calendar-week" },
        title: "Term Periods",
        to: {
            name: "global-term",
        },
        permission: "academics-periods:view-page",
    },

    {
        title: "List Users",
        to: { name: "admin-users" },
        icon: { icon: "tabler-users" },
        permission: "users:view-page"
    },

    {
        title: "Auth",
        icon: { icon: "tabler-shield-lock" },
        permission: ["roles:view-page", "permissions:view-page"],
        children: [
            {
                title: "Roles",
                to: {
                    name: "admin-roles",
                },
                permission: "roles:view-page",
            },
            {
                title: "Permissions",
                to: {
                    name: "admin-permissions",
                },
                permission: "permissions:view-page",
            },
        ],
    },
];
