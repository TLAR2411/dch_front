export default [
    {
        title: "Dashboard",
        icon: { icon: "tabler-layout-dashboard" },
        to: {
            name: "english-dashboard",
        },
        permission: "",
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
        title: "Calendar",
        to: {
            name: "global-calendar",
        },
        icon: { icon: "tabler-calendar" },
        // permission: "view-students",
    },

    {
        title: "Schedules",
        to: {
            name: "global-schedule",
        },
        icon: { icon: "tabler-calendar-week" },
        // permission: "view-students",
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
        title: "Attendance",
        to: {
            name: "global-attendance",
        },
        icon: { icon: "tabler-file-check" },
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
            {
                title: "Category",
                to: {
                    name: "global-category",
                },
                // permission: "view-grades",
            },

        ],
    },

    {
        title: "Reports",
        icon: { icon: "tabler-book" },
        permission: '',
        children: [

            {
                title: "Attendance",
                to: {
                    name: "global-report-attendance",
                },
                // permission: "view-grades",
            },

        ],
    },

    {
        title: "Settings",
        icon: { icon: "tabler-settings" },
        permission: '',
        children: [
    
          {
            title: "Behavior",
            to: {
              name: "global-behavior",
            },
            // permission: "view-grades",
          },
          
    
        ],
      },
];