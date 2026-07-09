import { redirects } from "@/router/additional-routes";

export default [
    {
        title: "Dashboard",
        icon: { icon: "tabler-layout-dashboard" },
        to: {
            name: "chinese-dashboard",
        },
        permission: "",
    },
    {
        title: "Teachers",
        to: {
            name: "global-teachers",
        },
        icon: { icon: "tabler-school" },
        // permission: "view-students",
    },
    {
        title: "Students",
        to: {
            name: "global-student",
        },
        icon: { icon: "tabler-users" },
        // permission: "view-students",
    },
    {
        title: "Checkin Checkout",
        to: {
            name: "global-checkin-checkout",
        },
        icon: { icon: "tabler-clock-hour-1" },
        // permission: "view-curriculumns",
    },
    {
        title: "Manage Classes",
        icon: { icon: "tabler-home-cog" },
        permission: '',
        children: [

            {
                title: "Classes",
                to: {
                    name: "global-classes",
                },
                // permission: "view-grades",
            },
            {
                title: "Grades",
                to: {
                    name: "global-grades",
                },
                // permission: "view-grades",
            },
            {
                title: "Rooms",

                permission: '',
                to: {
                    name: "global-rooms"
                }
            },
        ],
    },

    {
        title: "Manage Subjects",
        icon: { icon: "tabler-book" },
        permission: '',
        children: [

            {
                title: "Subjects",
                to: {
                    name: "global-subjects",
                },
                // permission: "view-grades",
            },

        ],
    },
];