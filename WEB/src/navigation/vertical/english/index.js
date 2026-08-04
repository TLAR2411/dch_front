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
      title: "Score Entry",
      to: {
        name: "global-score",
      },
      icon: { icon: "tabler-file-check" },
      // permission: "view-grades",
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
      title: "Schedules",
      to: {
        name: "global-schedule",
      },
      icon: { icon: "tabler-calendar-week" },
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
      title: "Teachers",
      to: {
        name: "global-teachers",
      },
      createTo: {
        name: "global-teachers-create",
      },
      icon: { icon: "tabler-school" },
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
          title: "Grade Subjects",
          to: {
            name: "global-gradesubject",
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
  
        {
          title: "Subject Setting",
          to: {
            name: "global-subjectsetting",
          },
          // permission: "view-grades",
        },
        
  
      ],
    },
  
  
  
  
    {
      title: "Reports",
      icon: { icon: "tabler-report" },
      permission: '',
      children: [
  
        {
          title: "Attendance",
          to: {
            name: "global-report-attendance",
          },
          // permission: "view-grades",
        },
        {
          title: "Exam",
          to: {
            name: "global-report-exam",
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
          title: "Behavior & Rating",
          to: {
            name: "global-behavior",
          },
        },
      ],
    },
  ];