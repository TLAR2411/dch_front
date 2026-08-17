export default [
  {
    title: "Dashboard",
    icon: { icon: "tabler-layout-dashboard" },
    to: {
      name: "khmer-dashboard",
    },
    permission: "dashboard:view-page",
  },

  {
    title: "Students",
    to: {
      name: "global-student",
    },
    icon: { icon: "tabler-users" },
    permission: "students:view-page",
  },

  {
    title: "Attendance",
    to: {
      name: "global-attendance",
    },
    icon: { icon: "tabler-clipboard-check" },
    permission: "attendance:view-page",
  },

  {
    title: "Score Entry",
    to: {
      name: "global-score",
    },
    icon: { icon: "tabler-edit" },
    permission: "student-scores:view-page",
  },

  {
    title: "Schedules",
    to: {
      name: "global-schedule",
    },
    icon: { icon: "tabler-calendar-week" },
    permission: "schedules:view-page",
  },

  {
    title: "Calendar",
    to: {
      name: "global-calendar",
    },
    icon: { icon: "tabler-calendar" },
    permission: "holiday:view-page",
  },

  {
    title: "Teachers",
    to: {
      name: "global-teachers",
    },
    createTo: {
      name: "global-teachers-create",
    },
    icon: { icon: "tabler-school" },
    permission: "teachers:view-page",
  },

  {
    title: "Checkin Checkout",
    to: {
      name: "global-checkin-checkout",
    },
    icon: { icon: "tabler-clock-hour-1" },
    permission: "teachers-classes:view-page",
  },

  {
    title: "Manage Classes",
    icon: { icon: "tabler-home-cog" },
    permission: ["classes:view-page", "grades:view-page", "rooms:view-page"],
    children: [
      {
        title: "Classes",
        to: {
          name: "global-classes",
        },
        permission: "classes:view-page",
      },
      {
        title: "Grades",
        to: {
          name: "global-grades",
        },
        permission: "grades:view-page",
      },
      {
        title: "Rooms",
        to: {
          name: "global-rooms",
        },
        permission: "rooms:view-page",
      },
    ],
  },

  {
    title: "Manage Subjects",
    icon: { icon: "tabler-book" },
    permission: [
      "subjects:view-page",
      "subjects-grades:view-page",
      "categories:view-page",
      "grading-rule:view-page",
    ],
    children: [
      {
        title: "Subjects",
        to: {
          name: "global-subjects",
        },
        permission: "subjects:view-page",
      },
      {
        title: "Grade Subjects",
        to: {
          name: "global-gradesubject",
        },
        permission: "subjects-grades:view-page",
      },
      {
        title: "Category",
        to: {
          name: "global-category",
        },
        permission: "categories:view-page",
      },
      {
        title: "Subject Setting",
        to: {
          name: "global-subjectsetting",
        },
        permission: "grading-rule:view-page",
      },
    ],
  },

  {
    title: "Reports",
    icon: { icon: "tabler-report" },
    permission: ["view-attendance-report", "student-scores:view-page"],
    children: [
      {
        title: "Attendance",
        to: {
          name: "global-report-attendance",
        },
        permission: "view-attendance-report",
      },
      {
        title: "Exam",
        to: {
          name: "global-report-exam",
        },
        permission: "student-scores:view-page",
      },
    ],
  },

  {
    title: "Settings",
    icon: { icon: "tabler-settings" },
    permission: ["settings:view-page", "behaviors:view-page"],
    children: [
      {
        title: "Behavior & Rating",
        to: {
          name: "global-behavior",
        },
        permission: "behaviors:view-page",
      },
    ],
  },
];
