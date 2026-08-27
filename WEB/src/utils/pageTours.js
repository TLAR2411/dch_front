/**
 * Page tour step definitions for Driver.js.
 * Add a new entry here, then call usePageTour(tourId) on that page.
 */

const helpStep = (description) => ({
  element: "#page-tour-help-btn",
  popover: {
    title: "Page help",
    description: description.replace(
      /^Replay with \? — /,
      "Click ? in the top bar anytime to replay — ",
    ),
    side: "bottom",
    align: "end",
  },
});

/** First step for create-dialog tours — highlights ? in the dialog title. */
const dialogHelpStep = (description = "Click ? in this dialog anytime to replay this guide.") => ({
  element: "#page-tour-dialog-help-btn",
  popover: {
    title: "Form help",
    description,
    side: "bottom",
    align: "end",
  },
});

const createStep = (description) => ({
  element: "#page-tour-create-btn",
  popover: {
    title: "Create",
    description,
    side: "bottom",
    align: "end",
  },
});

const filterStep = (description) => ({
  element: "#page-tour-filter-btn",
  popover: {
    title: "Search & filters",
    description,
    side: "bottom",
    align: "end",
  },
});

const tableStep = (description) => ({
  element: "#page-tour-table",
  popover: {
    title: "Data list",
    description,
    side: "top",
    align: "center",
  },
});

const openRowMenu = () => {
  if (!document.querySelector("#page-tour-action-edit")) {
    document.querySelector("#page-tour-row-actions")?.click();
  }
};

const rowActionSteps = ({ editDesc, disableDesc, deleteDesc }) => [
  {
    element: "#page-tour-row-actions",
    popover: {
      title: "Row actions (⋮)",
      description:
        "Click the 3 dots on a row to open actions. Next steps explain each button.",
      side: "left",
      align: "start",
    },
    onHighlighted: (element) => {
      element?.click?.();
    },
  },
  {
    element: "#page-tour-action-edit",
    popover: {
      title: "Edit",
      description: editDesc,
      side: "left",
      align: "start",
    },
    waitForElement: 1500,
    onHighlightStarted: openRowMenu,
  },
  {
    element: "#page-tour-action-disable",
    popover: {
      title: "Active / Inactive",
      description: disableDesc,
      side: "left",
      align: "start",
    },
    waitForElement: 1500,
    onHighlightStarted: openRowMenu,
  },
  {
    element: "#page-tour-action-delete",
    popover: {
      title: "Delete",
      description: deleteDesc,
      side: "left",
      align: "start",
    },
    waitForElement: 1500,
    onHighlightStarted: openRowMenu,
  },
];

/** Standard AppCardTable list tour for admin / global setup pages */
function makeListTour({
  title,
  helpText,
  createText,
  filterText,
  tableText,
  editDesc,
  disableDesc,
  deleteDesc,
  includeRowActions = true,
}) {
  const steps = [
    helpStep(helpText),
    createStep(createText),
    filterStep(filterText),
    tableStep(tableText),
  ];

  if (includeRowActions) {
    steps.push(
      ...rowActionSteps({ editDesc, disableDesc, deleteDesc }),
    );
  }

  return { title, steps };
}

const disableOnlyRowSteps = (disableDesc) => [
  {
    element: "#page-tour-row-actions",
    popover: {
      title: "Row actions (⋮)",
      description:
        "Click the 3 dots on a student row to change enrollment status.",
      side: "left",
      align: "start",
    },
    onHighlighted: (element) => {
      element?.click?.();
    },
  },
  {
    element: "#page-tour-action-disable",
    popover: {
      title: "Active / Inactive",
      description: disableDesc,
      side: "left",
      align: "start",
    },
    waitForElement: 1500,
    onHighlightStarted: () => {
      if (!document.querySelector("#page-tour-action-disable")) {
        document.querySelector("#page-tour-row-actions")?.click();
      }
    },
  },
];

const openClassRowMenu = () => {
  if (!document.querySelector("#page-tour-action-add")) {
    document.querySelector("#page-tour-row-actions")?.click();
  }
};

const classListRowSteps = () => [
  {
    element: "#page-tour-row-actions",
    popover: {
      title: "Row actions (⋮)",
      description:
        "Each class row has actions in the 3-dot menu. Next steps explain the main ones.",
      side: "left",
      align: "start",
    },
    onHighlighted: (element) => {
      element?.click?.();
    },
  },
  {
    element: "#page-tour-action-add",
    popover: {
      title: "Add students",
      description:
        "Enroll students from this curriculum into the class. Use after the class is created.",
      side: "left",
      align: "start",
    },
    waitForElement: 1500,
    onHighlightStarted: openClassRowMenu,
  },
  {
    element: "#page-tour-action-view",
    popover: {
      title: "View",
      description: "Open class detail — students, schedule, and more.",
      side: "left",
      align: "start",
    },
    waitForElement: 1500,
    onHighlightStarted: openClassRowMenu,
  },
  {
    element: "#page-tour-action-attendance",
    popover: {
      title: "Attendance",
      description: "Go to attendance for this class.",
      side: "left",
      align: "start",
    },
    waitForElement: 1500,
    onHighlightStarted: openClassRowMenu,
  },
  {
    element: "#page-tour-action-edit",
    popover: {
      title: "Edit",
      description: "Change grade, symbol, room, year, or class names.",
      side: "left",
      align: "start",
    },
    waitForElement: 1500,
    onHighlightStarted: openClassRowMenu,
  },
  {
    element: "#page-tour-action-disable",
    popover: {
      title: "Active / Inactive",
      description:
        "Deactivate the class without deleting it, or activate it again.",
      side: "left",
      align: "start",
    },
    waitForElement: 1500,
    onHighlightStarted: openClassRowMenu,
  },
  {
    element: "#page-tour-action-delete",
    popover: {
      title: "Delete",
      description:
        "Permanently remove this class. Use only when you are sure.",
      side: "left",
      align: "start",
    },
    waitForElement: 1500,
    onHighlightStarted: openClassRowMenu,
  },
];

export const pageTours = {
  // ── Students (already wired) ───────────────────────────────────────
  "admin-students-list": makeListTour({
    title: "Students",
    helpText:
      "Click this ? button anytime to replay this guide if you forget how to use the page.",
    createText:
      "Click + to open the Create Student form and add a new student.",
    filterText:
      "Click here to open filters and search for students by name or other details.",
    tableText:
      "All students appear here. Use the ⋮ button on each row for actions.",
    editDesc:
      "Edit — open this student to change name, photo, family, and other details.",
    disableDesc:
      "Inactive (or Active) — mark the student as not studying, or activate them again. This does not delete the record.",
    deleteDesc:
      "Delete — permanently remove this student. Use only when you are sure; deleted data cannot be recovered.",
  }),

  "admin-students-create": {
    title: "Create Student",
    steps: [
      helpStep(
        "Click ? anytime to replay this guide for creating a student.",
      ),
      {
        element: "#page-tour-student-photo",
        popover: {
          title: "Photo",
          description: "Upload a student photo (JPG, PNG, or GIF, max 800KB).",
          side: "bottom",
          align: "start",
        },
      },
      {
        element: "#page-tour-student-personal",
        popover: {
          title: "Personal information",
          description:
            "Fill required fields: Khmer name, English name, gender, and date of birth.",
          side: "bottom",
          align: "start",
        },
      },
      {
        element: "#page-tour-student-curriculum",
        popover: {
          title: "Select curriculum (= assign)",
          description:
            "If you select a curriculum here (English, Khmer, Chinese, etc.), the student is assigned to that curriculum now. If you leave it empty, you must assign the student to a curriculum later from Student Curriculum / enrollment.",
          side: "bottom",
          align: "start",
        },
      },
      {
        element: "#page-tour-student-family",
        popover: {
          title: "Family",
          description:
            "Link an existing family, or click New Family to create one with guardians.",
          side: "top",
          align: "start",
        },
      },
      {
        element: "#page-tour-submit",
        popover: {
          title: "Submit",
          description:
            "When the form is complete, click Submit to save the student.",
          side: "top",
          align: "end",
        },
      },
    ],
  },

  // ── Admin dashboard ────────────────────────────────────────────────
  "admin-dashboards": {
    title: "Admin Dashboard",
    steps: [
      helpStep(
        "Click ? anytime to replay this dashboard guide and learn what each number means.",
      ),
      {
        element: "#page-tour-dash-title",
        popover: {
          title: "School overview",
          description:
            "This dashboard summarizes your school for the selected branch and academic year (see the navbar selectors). Counts refresh when you change branch or year.",
          side: "bottom",
          align: "start",
        },
      },
      {
        element: "#page-tour-dash-summary",
        popover: {
          title: "Main totals",
          description:
            "These cards show key counts. Click a card to open that page. Students shows total with enrolled / not enrolled and female / male. Teachers, Classes, Families, Branches, and Users are active totals in the current scope.",
          side: "bottom",
          align: "start",
        },
      },
      {
        element: "#page-tour-dash-students",
        popover: {
          title: "Students card",
          description:
            "Total students in scope. Subtitle: enrolled (already in a class/curriculum path) · not enrolled · female · male.",
          side: "bottom",
          align: "start",
        },
      },
      {
        element: "#page-tour-dash-curriculum",
        popover: {
          title: "By curriculum",
          description:
            "Breaks down how many students, teachers, and classes exist in each curriculum (English, Khmer, Chinese, etc.). Use this to see load per program.",
          side: "top",
          align: "start",
        },
      },
      {
        element: "#page-tour-dash-system",
        popover: {
          title: "System setup",
          description:
            "Setup health: active Years, Curriculums count, Users without a role (need role assignment), and Disabled users (inactive accounts). Click a card to manage that area.",
          side: "top",
          align: "start",
        },
      },
    ],
  },

  // ── Other admin nav list pages ─────────────────────────────────────
  "admin-branches": makeListTour({
    title: "Branches",
    helpText: "Replay this guide anytime with ? — Branches are school campuses/locations.",
    createText:
      "Click + to add a new branch (name Khmer/English, symbol, status).",
    filterText: "Open filters to search branches by name or symbol.",
    tableText:
      "Lists all branches. Active branches appear in the navbar branch switcher.",
    editDesc: "Edit — change branch name, symbol, or other details.",
    disableDesc:
      "Inactive / Active — turn a branch off without deleting it (it may hide from selectors).",
    deleteDesc: "Delete — permanently remove this branch. Use carefully.",
  }),

  "admin-years": makeListTour({
    title: "Years",
    helpText:
      "Replay with ? — Academic years define which school year you are working in.",
    createText:
      "Click + to create an academic year (e.g. 2025-2026) used across attendance, classes, and reports.",
    filterText: "Search years by name or code.",
    tableText:
      "All academic years. The active year in the navbar controls which year data you see.",
    editDesc: "Edit — update year name or dates.",
    disableDesc:
      "Inactive / Active — deactivate a year without deleting historical data.",
    deleteDesc: "Delete — remove this year. Prefer inactive if data already exists.",
  }),

  "admin-curriculums": makeListTour({
    title: "Curriculums",
    helpText:
      "Replay with ? — Curriculums are programs (English, Khmer, Chinese, etc.).",
    createText:
      "Click + to add a curriculum program students and classes can belong to.",
    filterText: "Search curriculums by name or symbol.",
    tableText:
      "All curriculum programs. Assigning a student to a curriculum links them to that program.",
    editDesc: "Edit — change curriculum name, symbol, or settings.",
    disableDesc:
      "Inactive / Active — stop using a curriculum without deleting past enrollments.",
    deleteDesc: "Delete — permanently remove this curriculum. Prefer inactive if used.",
  }),

  "global-families": makeListTour({
    title: "Families",
    helpText:
      "Replay with ? — Families group guardians/parents linked to students.",
    createText:
      "Click + to register a family and add guardians (contacts for students).",
    filterText: "Search families by name or related details.",
    tableText:
      "All families. When creating a student, you link them to a family here.",
    editDesc: "Edit — update family info or guardians.",
    disableDesc:
      "Inactive / Active — deactivate a family record without deleting it.",
    deleteDesc: "Delete — permanently remove this family. Check linked students first.",
  }),

  "global-term": makeListTour({
    title: "Term Periods",
    helpText:
      "Replay with ? — Term periods divide an academic year (Term 1, Term 2, etc.).",
    createText:
      "Click + to open the Create Term dialog. A short guide will explain required fields (red *) and Submit.",
    filterText: "Search term periods by name or dates.",
    tableText:
      "Terms used for attendance reports, scores, and scheduling within a year.",
    editDesc: "Edit — change term name or date range.",
    disableDesc:
      "Inactive / Active — turn a term off without deleting related records.",
    deleteDesc: "Delete — remove this term. Prefer inactive if scores/attendance exist.",
  }),

  "global-term-create-dialog": {
    title: "Create Term",
    steps: [
      dialogHelpStep(
        "Click ? in this dialog anytime to replay — required fields and Create.",
      ),
      {
        element: "#page-tour-term-required",
        popover: {
          title: "Required fields (red *)",
          description:
            "Fields marked with a red star (*) are required: Name Kh, Name En, Start Date, End Date, and Year. You must fill these before you can create the term.",
          side: "bottom",
          align: "start",
        },
      },
      {
        element: "#page-tour-dialog-submit",
        popover: {
          title: "Submit / Create",
          description:
            "After required fields are filled, click Create to save the term period.",
          side: "top",
          align: "end",
        },
      },
    ],
  },

  "global-student-curriculum": {
    title: "Students (Curriculum)",
    steps: [
      helpStep(
        "Replay with ? — this page shows students assigned to the current curriculum part (English, Khmer, or Chinese).",
      ),
      {
        element: "#page-tour-table",
        popover: {
          title: "Assigned students",
          description:
            "Students listed here are already enrolled in this curriculum. If you skipped curriculum on Create Student, they will NOT appear until you assign them.",
          side: "top",
          align: "start",
        },
      },
      createStep(
        "Click + to assign students to this curriculum. Use this when a student was created without selecting a curriculum.",
      ),
      filterStep("Search enrolled students by name or other details."),
      ...disableOnlyRowSteps(
        "Inactive (or Active) — mark the student as not studying in this curriculum, or activate them again. This does not delete the student record.",
      ),
    ],
  },

  "global-student-curriculum-assign-dialog": {
    title: "Assign to curriculum",
    steps: [
      dialogHelpStep(
        "Click ? in this dialog anytime to replay — how to select and assign students.",
      ),
      {
        element: "#page-tour-student-curriculum-select",
        popover: {
          title: "Select students",
          description:
            "Tick the checkbox for each student who is not yet in this curriculum. Only students available for enrollment appear in this list.",
          side: "bottom",
          align: "start",
        },
      },
      {
        element: "#page-tour-dialog-submit",
        popover: {
          title: "Create / Assign",
          description:
            "Click Create to enroll the selected students into this curriculum. After that they will show on the Students list.",
          side: "top",
          align: "end",
        },
      },
    ],
  },

  "global-classes": {
    title: "Classes",
    steps: [
      helpStep(
        "Replay with ? — classes group students by grade and section (symbol) for the current curriculum and year.",
      ),
      createStep(
        "Click + to create a new class. A guide will explain required fields (Grade, Symbol, Year) and Submit.",
      ),
      filterStep("Search classes by name or description."),
      tableStep(
        "All classes in the current curriculum. After creating a class, use Add in the row menu to enroll students.",
      ),
      ...classListRowSteps(),
    ],
  },

  "global-classes-create-dialog": {
    title: "Create Class",
    steps: [
      dialogHelpStep(
        "Click ? in this dialog anytime to replay — Grade, Symbol, Year, and Create.",
      ),
      {
        element: "#page-tour-class-required",
        popover: {
          title: "Required fields (red *)",
          description:
            "Grade, Symbol, and Year are required (red star). Pick a grade and section letter — class names (Kh/En/Cn) fill in automatically. Room is optional.",
          side: "bottom",
          align: "start",
        },
      },
      {
        element: "#page-tour-class-names",
        popover: {
          title: "Class names",
          description:
            "Names are generated from Grade + Symbol. You can edit them if needed before saving.",
          side: "bottom",
          align: "start",
        },
      },
      {
        element: "#page-tour-dialog-submit",
        popover: {
          title: "Submit / Create",
          description:
            "When required fields are filled, click Create to save the class. Then use Add on the class row to enroll students.",
          side: "top",
          align: "end",
        },
      },
    ],
  },

  "global-class-detail": {
    title: "Class Detail",
    steps: [
      helpStep(
        "Replay with ? — manage this class: overview, students, teachers, and weekly schedule.",
      ),
      {
        element: "#page-tour-class-tabs",
        popover: {
          title: "Three sections",
          description:
            "General — class summary and schedule. Students — enroll students in this class. Teachers — assign teachers and subjects.",
          side: "bottom",
          align: "start",
        },
      },
      {
        element: "#page-tour-class-stats",
        popover: {
          title: "Class totals",
          description:
            "Quick counts: total students, female students, teachers, and assistants currently in this class. Numbers update after you add or remove people.",
          side: "bottom",
          align: "start",
        },
        onHighlightStarted: () => {
          document.querySelector("#page-tour-class-tab-general")?.click();
        },
      },
      {
        element: "#page-tour-class-schedule",
        popover: {
          title: "Weekly schedule",
          description:
            "This is the class timetable — which subject runs on each day and time. Use it to see the week at a glance. Adding/editing slots is optional; focus first on having students and teachers assigned.",
          side: "top",
          align: "start",
        },
        waitForElement: 1500,
        onHighlightStarted: () => {
          document.querySelector("#page-tour-class-tab-general")?.click();
        },
      },
      {
        element: "#page-tour-class-tab-students",
        popover: {
          title: "Students tab",
          description:
            "Open this tab to see who is in the class and add more students from the curriculum.",
          side: "bottom",
          align: "start",
        },
        onHighlighted: (el) => {
          el?.click?.();
        },
      },
      {
        element: "#page-tour-create-btn",
        popover: {
          title: "Add students",
          description:
            "Click + to enroll students into this class. Only students already assigned to this curriculum can be added.",
          side: "bottom",
          align: "end",
        },
        waitForElement: 2000,
        onHighlightStarted: () => {
          document.querySelector("#page-tour-class-tab-students")?.click();
        },
      },
      {
        element: "#page-tour-class-tab-teachers",
        popover: {
          title: "Teachers tab",
          description:
            "Open this tab to assign teachers and the subject they teach in this class.",
          side: "bottom",
          align: "start",
        },
        onHighlighted: (el) => {
          el?.click?.();
        },
      },
      {
        element: "#page-tour-add-teacher",
        popover: {
          title: "Add teacher",
          description:
            "Click Add Teacher, then choose teacher, subject, and role (main, assistant, or classload).",
          side: "bottom",
          align: "end",
        },
        waitForElement: 2000,
        onHighlightStarted: () => {
          document.querySelector("#page-tour-class-tab-teachers")?.click();
        },
      },
    ],
  },

  "global-class-add-student-dialog": {
    title: "Add students to class",
    steps: [
      dialogHelpStep(
        "Click ? in this dialog anytime to replay — how to select and save students.",
      ),
      {
        element: "#page-tour-class-student-select",
        popover: {
          title: "Select students",
          description:
            "Tick students to enroll in this class. Use search to find by name. Only students in this curriculum who are not yet in the class appear here.",
          side: "bottom",
          align: "start",
        },
      },
      {
        element: "#page-tour-class-student-save",
        popover: {
          title: "Save",
          description:
            "Click Save changes to add the selected students to this class.",
          side: "top",
          align: "end",
        },
      },
    ],
  },

  "global-class-add-teacher-dialog": {
    title: "Add teacher to class",
    steps: [
      dialogHelpStep(
        "Click ? in this dialog anytime to replay — teacher, subject, and Create.",
      ),
      {
        element: "#page-tour-class-teacher-form",
        popover: {
          title: "Teacher & subject",
          description:
            "Pick the teacher and the subject they will teach in this class. Optionally mark Assistant or Classload.",
          side: "bottom",
          align: "start",
        },
      },
      {
        element: "#page-tour-dialog-submit",
        popover: {
          title: "Create",
          description: "Click Create to assign this teacher to the class.",
          side: "top",
          align: "end",
        },
      },
    ],
  },

  "global-schedule": {
    title: "Schedule",
    steps: [
      helpStep(
        "Replay with ? — build the weekly timetable: pick a class, add time slots, then print or copy to other classes.",
      ),
      {
        element: "#page-tour-schedule-class",
        popover: {
          title: "1. Choose class",
          description:
            "Start here — select the class whose timetable you want to view or edit. The weekly grid loads below.",
          side: "bottom",
          align: "start",
        },
      },
      {
        element: "#page-tour-schedule-toolbar",
        popover: {
          title: "Actions",
          description:
            "Add slot — open the create form. Print / PDF — export the timetable. Apply To — copy this class's full schedule to other classes (replaces their existing slots).",
          side: "bottom",
          align: "end",
        },
        waitForElement: 1500,
      },
      {
        element: "#page-tour-schedule-grid",
        popover: {
          title: "Weekly grid",
          description:
            "Mon–Fri columns with time rows. Colored blocks are scheduled slots. Click a slot to edit; hover an empty cell and click + Add to create a slot for that day and time.",
          side: "top",
          align: "start",
        },
        waitForElement: 1500,
      },
      {
        element: "#page-tour-schedule-add",
        popover: {
          title: "Add slot",
          description:
            "Click here to create a new slot. The form asks: Subject (a real lesson) or Title / Activity (line up, break, etc.) — see the guide when the dialog opens.",
          side: "bottom",
          align: "end",
        },
        waitForElement: 1500,
      },
      {
        element: "#page-tour-schedule-apply",
        popover: {
          title: "Apply To other classes",
          description:
            "After this class's schedule is complete, copy all slots to other classes in one step. Useful when several classes share the same timetable.",
          side: "bottom",
          align: "end",
        },
        waitForElement: 1500,
      },
    ],
  },

  "global-schedule-create-dialog": {
    title: "Create schedule slot",
    steps: [
      dialogHelpStep(
        "Click ? in this dialog anytime to replay — Subject vs Title / Activity, days, and time.",
      ),
      {
        element: "#page-tour-schedule-entry-type",
        popover: {
          title: "Subject or Title / Activity?",
          description:
            "This is the most important choice. Subject = a real taught lesson (Math, Khmer, Science) — links to attendance and score entry. Title / Activity = anything else on the timetable (Line up, Lunch, Assembly, Break) — not a subject, just a label.",
          side: "bottom",
          align: "start",
        },
      },
      {
        element: "#page-tour-schedule-subject-field",
        popover: {
          title: "Subject slot",
          description:
            "Pick Subject, then choose from the subject list. Color is assigned automatically. Use this for every lesson that teachers grade or take attendance for.",
          side: "bottom",
          align: "start",
        },
        waitForElement: 1500,
        onHighlightStarted: () => {
          document.querySelector("#page-tour-schedule-entry-subject")?.click();
        },
      },
      {
        element: "#page-tour-schedule-title-field",
        popover: {
          title: "Title / Activity slot",
          description:
            "Pick Title / Activity, type a name (e.g. Line up, Snack time, Free play), and choose a color. Use for routines and breaks — not for graded subjects.",
          side: "bottom",
          align: "start",
        },
        waitForElement: 1500,
        onHighlightStarted: () => {
          document.querySelector("#page-tour-schedule-entry-title")?.click();
        },
      },
      {
        element: "#page-tour-schedule-classes",
        popover: {
          title: "Which classes?",
          description:
            "When creating, you can add the same slot to one class or many at once. This class only — or All classes — then adjust the list. Overlapping times in a class are blocked.",
          side: "bottom",
          align: "start",
        },
        waitForElement: 500,
      },
      {
        element: "#page-tour-schedule-days",
        popover: {
          title: "Day(s)",
          description:
            "Single day — pick Monday, Tuesday, etc. Merge across days — same slot spans several days (e.g. Mon–Fri morning line up). Use Mon – Fri shortcut for full week.",
          side: "bottom",
          align: "start",
        },
      },
      {
        element: "#page-tour-schedule-time",
        popover: {
          title: "Start & end time",
          description:
            "Enter start and end yourself (no default). End must be after start. Times define where the block appears in the grid.",
          side: "left",
          align: "start",
        },
      },
      {
        element: "#page-tour-schedule-dialog-save",
        popover: {
          title: "Add slot",
          description:
            "Click Add slot to save. The dialog stays open so you can add more slots quickly. Click Cancel when finished.",
          side: "top",
          align: "end",
        },
      },
    ],
  },

  "global-score-entry": {
    title: "Score Entry",
    steps: [
      helpStep(
        "Replay with ? — enter grades in order: Class → Subject → Term, then use the tabs for scores, teacher comments, and behavior.",
      ),
      {
        element: "#page-tour-score-class",
        popover: {
          title: "1. Choose class",
          description:
            "Start here — pick the class you are grading. This loads subjects for that class's grade.",
          side: "bottom",
          align: "start",
        },
      },
      {
        element: "#page-tour-score-subject",
        popover: {
          title: "2. Choose subject",
          description:
            "Select the subject you are entering scores for (e.g. Math, Khmer). Enabled after you choose a class.",
          side: "bottom",
          align: "start",
        },
      },
      {
        element: "#page-tour-score-term",
        popover: {
          title: "3. Choose term",
          description:
            "Pick the term (Term 1, Term 2, etc.). When all three filters are set, the score sheet loads automatically below.",
          side: "bottom",
          align: "start",
        },
      },
      {
        element: "#page-tour-score-empty",
        popover: {
          title: "What appears next",
          description:
            "After you pick a class, subject, and term, three tabs open: Insert Score (grade grid), Teacher Recommend (report comments), and Student Behavior. The same filters apply to all tabs.",
          side: "top",
          align: "center",
        },
      },
      {
        element: "#page-tour-score-tabs",
        popover: {
          title: "Three tabs",
          description:
            "Insert Score — enter assessment grades. Teacher Recommend — comments for report cards. Student Behavior — behavior ratings. Switch tabs anytime; filters stay the same.",
          side: "bottom",
          align: "start",
        },
        waitForElement: 1500,
      },
      {
        element: "#page-tour-score-tab-scores",
        popover: {
          title: "Insert Score tab",
          description:
            "Open this tab first when entering grades. The spreadsheet loads students and assessment columns for the selected subject.",
          side: "bottom",
          align: "start",
        },
        waitForElement: 1500,
        onHighlighted: (el) => {
          el?.click?.();
        },
      },
      {
        element: "#page-tour-score-grid",
        popover: {
          title: "Score grid",
          description:
            "Columns are grouped by category (Homework, Exam, Attendance…). Type a score in each cell — Totals, %, and Average Grade calculate automatically. Attendance days may pre-fill from attendance records. Red cells mean the score is invalid (over max).",
          side: "top",
          align: "start",
        },
        waitForElement: 2000,
        onHighlightStarted: () => {
          document.querySelector("#page-tour-score-tab-scores")?.click();
        },
      },
      {
        element: "#page-tour-score-save",
        popover: {
          title: "Save Scores",
          description:
            "Click Save Scores when you are done entering grades. Invalid scores block save. Use Refresh to reload saved data from the server.",
          side: "bottom",
          align: "end",
        },
        waitForElement: 1500,
        onHighlightStarted: () => {
          document.querySelector("#page-tour-score-tab-scores")?.click();
        },
      },
      {
        element: "#page-tour-score-tab-recommend",
        popover: {
          title: "Teacher Recommend tab",
          description:
            "Write teacher comments for report cards. Text can auto-generate from each student's scores across all subjects in the grade.",
          side: "bottom",
          align: "start",
        },
        waitForElement: 1500,
        onHighlighted: (el) => {
          el?.click?.();
        },
      },
      {
        element: "#page-tour-score-recommend-actions",
        popover: {
          title: "Generate & Save",
          description:
            "Generate — fill empty rows from scores. Regenerate all — overwrite every row. Edit any comment, then Save. Draft until saved.",
          side: "bottom",
          align: "end",
        },
        waitForElement: 2000,
        onHighlightStarted: () => {
          document.querySelector("#page-tour-score-tab-recommend")?.click();
        },
      },
      {
        element: "#page-tour-score-tab-behavior",
        popover: {
          title: "Student Behavior tab",
          description:
            "Rate each student on behavior criteria (configured in Subject Setting). Uses the same class and term as above.",
          side: "bottom",
          align: "start",
        },
        waitForElement: 1500,
        onHighlighted: (el) => {
          el?.click?.();
        },
      },
      {
        element: "#page-tour-score-behavior-actions",
        popover: {
          title: "Save behavior",
          description:
            "Pick a rating for each student in every behavior column, then click Save.",
          side: "bottom",
          align: "end",
        },
        waitForElement: 2000,
        onHighlightStarted: () => {
          document.querySelector("#page-tour-score-tab-behavior")?.click();
        },
      },
    ],
  },

  "global-attendance": {
    title: "Attendance",
    steps: [
      helpStep(
        "Replay with ? — daily attendance flow: class → date → search → mark → submit → approve.",
      ),
      {
        element: "#page-tour-attendance-class",
        popover: {
          title: "1. Choose class",
          description:
            "Start here — select the class you are taking attendance for.",
          side: "bottom",
          align: "start",
        },
      },
      {
        element: "#page-tour-attendance-date",
        popover: {
          title: "2. Choose date",
          description:
            "Pick the attendance date (usually today). The day of week is used to load subjects from the class schedule.",
          side: "bottom",
          align: "start",
        },
      },
      {
        element: "#page-tour-attendance-search",
        popover: {
          title: "3. Search",
          description:
            "Click Search to load students in this class for the selected date. Subject and the student list appear after a successful search.",
          side: "bottom",
          align: "start",
        },
      },
      {
        element: "#page-tour-attendance-subject",
        popover: {
          title: "4. Choose subject",
          description:
            "After search, pick the subject taught on this day (from the class schedule). Required when multiple subjects run on the same day.",
          side: "bottom",
          align: "start",
        },
        waitForElement: 1500,
      },
      {
        element: "#page-tour-attendance-table",
        popover: {
          title: "5. Mark each student",
          description:
            "Present = in class. Late = arrived late. Ask Permission = absent with permission (choose Reason). Use Description for notes. Default is Present.",
          side: "top",
          align: "start",
        },
        waitForElement: 1500,
      },
      {
        element: "#page-tour-attendance-submit",
        popover: {
          title: "6. Submit",
          description:
            "Save attendance when marking is done. If already saved, this button shows Update.",
          side: "bottom",
          align: "end",
        },
        waitForElement: 1500,
      },
      {
        element: "#page-tour-attendance-approve",
        popover: {
          title: "7. Approve",
          description:
            "After Submit, click Approve to lock attendance (or Disapprove to unlock). Available only after attendance is submitted.",
          side: "bottom",
          align: "end",
        },
        waitForElement: 1500,
      },
    ],
  },

  "admin-users": makeListTour({
    title: "Users",
    helpText:
      "Replay with ? — Staff/system users who log into Dewey (teachers, admins, etc.).",
    createText:
      "Click + to create a user account (opens the Create User page).",
    filterText: "Search users by name, username, email, or role.",
    tableText:
      "All users with branch, role, and active status. Users need a role to access pages.",
    editDesc: "Edit — open the user form to change profile, branch, or role.",
    disableDesc:
      "Inactive / Active — disable login without deleting the account.",
    deleteDesc: "Delete — permanently remove this user account.",
  }),

  "admin-roles": makeListTour({
    title: "Roles",
    helpText:
      "Replay with ? — Roles group permissions (Admin, Teacher, etc.) assigned to users.",
    createText:
      "Click + to create a role and choose which permissions it includes.",
    filterText: "Search roles by name.",
    tableText:
      "All roles. Assign a role to a user so they can open the correct pages.",
    editDesc: "Edit — change role name or permissions.",
    disableDesc:
      "Inactive / Active — deactivate a role without deleting it.",
    deleteDesc: "Delete — remove this role. Reassign users first if needed.",
  }),

  "admin-permissions": {
    title: "Permissions",
    steps: [
      helpStep(
        "Replay with ? — Permissions control which pages and actions each role can use.",
      ),
      {
        element: "#page-tour-permissions-search",
        popover: {
          title: "Search",
          description:
            "Filter permissions by name, display name, or group.",
          side: "bottom",
          align: "end",
        },
      },
      {
        element: "#page-tour-permissions-create",
        popover: {
          title: "Create permission",
          description:
            "Add a new permission (usually for developers when a new page/action is added).",
          side: "bottom",
          align: "end",
        },
      },
      {
        element: "#page-tour-permissions-groups",
        popover: {
          title: "Permission groups",
          description:
            "Permissions are grouped (Students, Users, etc.). Expand a group to see items. Use Edit on a row to change display name or settings. Roles pick from these permissions.",
          side: "top",
          align: "start",
        },
      },
    ],
  },

  "admin-users-create": {
    title: "Create User",
    steps: [
      helpStep("Replay with ? — guide for creating a staff/system user."),
      {
        element: "#page-tour-user-form",
        popover: {
          title: "User form",
          description:
            "Fill name, username, email, gender, branch, and password so the person can log in.",
          side: "bottom",
          align: "start",
        },
      },
      {
        element: "#page-tour-user-role",
        popover: {
          title: "Role",
          description:
            "Assign a role so the user gets the right permissions. Without a role they may see almost nothing (shown as “Users without role” on the dashboard).",
          side: "top",
          align: "start",
        },
      },
      {
        element: "#page-tour-submit",
        popover: {
          title: "Submit",
          description: "Save the new user account.",
          side: "top",
          align: "end",
        },
      },
    ],
  },

  "global-subject-setting": {
    title: "Subject Setting",
    steps: [
      helpStep(
        "Replay with ? — configure how each subject is graded: categories (weights), max scores, and assessment items used on Score Entry.",
      ),
      {
        element: "#page-tour-subject-setting-search",
        popover: {
          title: "Search",
          description:
            "Filter by grade or subject name. Settings are for the current branch, year, and curriculum (navbar).",
          side: "bottom",
          align: "start",
        },
      },
      {
        element: "#page-tour-subject-setting-add",
        popover: {
          title: "Add Rule",
          description:
            "Create grading rules for a subject: pick subject + grades, then add categories with % weight and max score. Category weights must total 100%. A guide opens in the form.",
          side: "bottom",
          align: "end",
        },
      },
      {
        element: "#page-tour-subject-setting-grades",
        popover: {
          title: "Grades list",
          description:
            "Subjects are grouped by grade. Expand a grade to see its subjects. Each subject holds categories and assessments for Score Entry.",
          side: "top",
          align: "start",
        },
        waitForElement: 1500,
      },
      {
        element: "#page-tour-subject-setting-grade",
        popover: {
          title: "1. Expand a grade",
          description:
            "Click a grade row to open its subjects. Next you expand a subject to manage categories.",
          side: "bottom",
          align: "start",
        },
        waitForElement: 1500,
        onHighlighted: (el) => {
          el?.click?.();
        },
      },
      {
        element: "#page-tour-subject-setting-subject",
        popover: {
          title: "2. Expand a subject",
          description:
            "Click a subject to open Child Subjects (if any) and Parent Categories. Categories define how the score sheet columns are built.",
          side: "bottom",
          align: "start",
        },
        waitForElement: 2000,
        onHighlighted: (el) => {
          el?.click?.();
        },
      },
      {
        element: "#page-tour-subject-setting-subject-actions",
        popover: {
          title: "Subject actions",
          description:
            "+ add more categories · pencil edit this subject’s rules · copy setup to another branch · trash remove rules for this grade/subject.",
          side: "left",
          align: "start",
        },
        waitForElement: 2000,
      },
      {
        element: "#page-tour-subject-setting-categories",
        popover: {
          title: "3. Parent Categories",
          description:
            "Open this section to see categories (Homework, Exam, Attendance…). Weights should total 100%. Expand a category to see its assessment items.",
          side: "top",
          align: "start",
        },
        waitForElement: 2000,
        onHighlighted: (el) => {
          el?.querySelector(".cursor-pointer")?.click?.() || el?.click?.();
        },
      },
      {
        element: "#page-tour-subject-setting-rule",
        popover: {
          title: "4. Category row",
          description:
            "Each row is one category with weight % and max points. Expand it to list assessments (Quiz 1, Midterm…). Pencil/trash edit or delete the category.",
          side: "top",
          align: "start",
        },
        waitForElement: 2000,
      },
      {
        element: "#page-tour-subject-setting-add-assessment",
        popover: {
          title: "5. Add assessments",
          description:
            "Click + on a category to create assessment items (named score columns). Their max scores must fit within the category max. These appear on Score Entry → Insert Score.",
          side: "left",
          align: "start",
        },
        waitForElement: 1500,
      },
    ],
  },

  "global-subject-setting-create-dialog": {
    title: "Add Subject Setting",
    steps: [
      dialogHelpStep(
        "Click ? in this dialog anytime to replay — subject, grades, categories, and 100% weights.",
      ),
      {
        element: "#page-tour-ss-subject-grades",
        popover: {
          title: "Subject & grades",
          description:
            "Choose the subject, then All Grades or Select Grades. Rules apply to those grades for the current academic year.",
          side: "bottom",
          align: "start",
        },
      },
      {
        element: "#page-tour-ss-rules",
        popover: {
          title: "Categories (rules)",
          description:
            "For each row: Category (e.g. Homework), Percentage (weight in final grade), Max Score (points). Use + to add another category. Parent subjects: percentages must total 100%. Child subjects: weight stays 0% — set max scores only.",
          side: "top",
          align: "start",
        },
      },
      {
        element: "#page-tour-ss-weight-total",
        popover: {
          title: "Weight total",
          description:
            "Watch this bar — green when weights = 100%. Over 100% blocks save. After creating categories, open each category on the list and add assessments with +.",
          side: "top",
          align: "start",
        },
        waitForElement: 500,
      },
      {
        element: "#page-tour-dialog-submit",
        popover: {
          title: "Create",
          description:
            "Save the grading rules. Then expand the subject → category → + to add assessment items used when teachers enter scores.",
          side: "top",
          align: "end",
        },
      },
    ],
  },

  "global-subject-setting-assessment-dialog": {
    title: "Create Assessment",
    steps: [
      dialogHelpStep(
        "Click ? in this dialog anytime to replay — how to add score columns for a category.",
      ),
      {
        element: "#page-tour-ss-assessment-meta",
        popover: {
          title: "Category info",
          description:
            "Shows which category you are adding to, its max score, and weight %. These are fixed here — change them by editing the category rule.",
          side: "bottom",
          align: "start",
        },
      },
      {
        element: "#page-tour-ss-assessment-qty",
        popover: {
          title: "Quantity & default max",
          description:
            "Quantity = how many assessments to create (Quiz 1, Quiz 2…). Default Max Score fills each row; you can edit individual max scores. Do not exceed Remaining points.",
          side: "bottom",
          align: "start",
        },
      },
      {
        element: "#page-tour-ss-assessment-rows",
        popover: {
          title: "Assessment rows",
          description:
            "Name each item and set max score. These become columns on the Score Entry grid for this subject.",
          side: "top",
          align: "start",
        },
        waitForElement: 1500,
      },
      {
        element: "#page-tour-dialog-submit",
        popover: {
          title: "Create",
          description:
            "Save assessments. Teachers can then enter scores for these items on Score Entry.",
          side: "top",
          align: "end",
        },
      },
    ],
  },

  "global-report-attendance": {
    title: "Attendance Report",
    steps: [
      helpStep(
        "Replay with ? — print attendance by Day, Month, Term, or Year for a class.",
      ),
      {
        element: "#page-tour-att-report-class",
        popover: {
          title: "1. Choose class",
          description:
            "Start here — select the class you want to report on. Filters and the report area appear after you pick a class.",
          side: "bottom",
          align: "start",
        },
      },
      {
        element: "#page-tour-att-report-type",
        popover: {
          title: "2. Report period",
          description:
            "Day — one date. Month — a calendar month (Daily or Whole Month). Term — one academic term. Year — full academic year summary.",
          side: "bottom",
          align: "start",
        },
      },
      {
        element: "#page-tour-att-report-empty",
        popover: {
          title: "Select a class first",
          description:
            "Until a class is chosen, the report stays empty. Pick a class above, then choose Day / Month / Term / Year.",
          side: "top",
          align: "center",
        },
      },
      {
        element: "#page-tour-att-report-period",
        popover: {
          title: "3. Pick the period detail",
          description:
            "Day → select a date. Month → select the month (and optionally Daily/Whole Month + subject). Term → select the term. Year → no extra period field.",
          side: "bottom",
          align: "start",
        },
        waitForElement: 1500,
      },
      {
        element: "#page-tour-att-report-search",
        popover: {
          title: "4. Search",
          description:
            "Click Search to load attendance for the selected filters. The table fills with students and attendance status.",
          side: "bottom",
          align: "start",
        },
        waitForElement: 1500,
      },
      {
        element: "#page-tour-att-report-print",
        popover: {
          title: "5. Print",
          description:
            "After data loads, Print opens the browser print dialog (PDF). Use this for paper copies or saving a PDF.",
          side: "bottom",
          align: "end",
        },
        waitForElement: 1500,
      },
      {
        element: "#page-tour-att-report-sheet-header",
        popover: {
          title: "6. Report header",
          description:
            "The printed sheet starts with the school logo and title (e.g. Attendance Report Monthly for August 2026). This block appears after Search loads data.",
          side: "bottom",
          align: "start",
        },
        waitForElement: 2000,
      },
      {
        element: "#page-tour-att-report-sheet-meta",
        popover: {
          title: "Class & program",
          description:
            "Left: class name (orange). Right: program / curriculum (English, Khmer, or Chinese). Extra lines may show subject, term, or period depending on report type.",
          side: "top",
          align: "start",
        },
        waitForElement: 1500,
      },
    ],
  },

  "global-report-exam": {
    title: "Exam Report",
    steps: [
      helpStep(
        "Replay with ? — generate ranking and individual student score reports (Term or Final).",
      ),
      {
        element: "#page-tour-exam-report-filters",
        popover: {
          title: "Filters panel",
          description:
            "Open this panel to choose Grade, Class, Term/Final, then Search. After searching, the panel can collapse so you see more of the report.",
          side: "bottom",
          align: "start",
        },
        onHighlightStarted: () => {
          // ensure panel is open for filter steps
        },
      },
      {
        element: "#page-tour-exam-report-grade",
        popover: {
          title: "1. Grade",
          description:
            "Choose the grade first. Classes list only shows classes in that grade.",
          side: "bottom",
          align: "start",
        },
      },
      {
        element: "#page-tour-exam-report-class",
        popover: {
          title: "2. Class",
          description: "Pick the class within the selected grade.",
          side: "bottom",
          align: "start",
        },
      },
      {
        element: "#page-tour-exam-report-type",
        popover: {
          title: "3. Term or Final",
          description:
            "Term — one academic period (you must also pick the term). Final — whole-year / final exam report (no term needed).",
          side: "bottom",
          align: "start",
        },
      },
      {
        element: "#page-tour-exam-report-term",
        popover: {
          title: "4. Term",
          description:
            "When type is Term, choose which term (Term 1, Term 2, …). Hidden when type is Final.",
          side: "bottom",
          align: "start",
        },
        waitForElement: 500,
      },
      {
        element: "#page-tour-exam-report-search",
        popover: {
          title: "5. Search",
          description:
            "Click Search when Grade + Class (+ Term if needed) are set. Clear resets all filters. Reports appear below after Search.",
          side: "bottom",
          align: "end",
        },
      },
      {
        element: "#page-tour-exam-report-empty",
        popover: {
          title: "Before Search",
          description:
            "This empty state shows until you Search. Follow Grade → Class → Term (if Term type) → Search.",
          side: "top",
          align: "center",
        },
      },
      {
        element: "#page-tour-exam-report-tabs",
        popover: {
          title: "Report tabs",
          description:
            "After Search: Ranking — class score ranking table. Individual — one student’s full report card (pick student, then Print / PNG).",
          side: "bottom",
          align: "start",
        },
        waitForElement: 1500,
      },
      {
        element: "#page-tour-exam-report-tab-ranking",
        popover: {
          title: "Ranking",
          description:
            "Class ranking by scores for the selected filters. Use Print on this tab for the ranking sheet.",
          side: "bottom",
          align: "start",
        },
        waitForElement: 1500,
        onHighlighted: (el) => {
          el?.click?.();
        },
      },
      {
        element: "#page-tour-exam-report-print",
        popover: {
          title: "Print ranking",
          description: "Print or save PDF of the ranking report.",
          side: "bottom",
          align: "end",
        },
        waitForElement: 1500,
        onHighlightStarted: () => {
          document
            .querySelector("#page-tour-exam-report-tab-ranking")
            ?.click();
        },
      },
      {
        element: "#page-tour-exam-report-tab-individual",
        popover: {
          title: "Individual",
          description:
            "Open this tab for a single student’s report card (scores, recommendations, etc.).",
          side: "bottom",
          align: "start",
        },
        waitForElement: 1500,
        onHighlighted: (el) => {
          el?.click?.();
        },
      },
      {
        element: "#page-tour-exam-report-student",
        popover: {
          title: "Select student",
          description:
            "Choose which student to view. Then use Download PNG or Print / PDF for that student’s report.",
          side: "bottom",
          align: "start",
        },
        waitForElement: 2000,
        onHighlightStarted: () => {
          document
            .querySelector("#page-tour-exam-report-tab-individual")
            ?.click();
        },
      },
    ],
  },
};

export function getPageTour(tourId) {
  return pageTours[tourId] || null;
}
