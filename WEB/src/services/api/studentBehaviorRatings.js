import { api } from "@/utils/api";

/** Score Entry student × behavior ratings (class + term). */
export const listStudentBehaviorRatings = (filter) =>
  api.post("/api/student-behavior-ratings-list", filter).then((r) => r.data.data);

export const saveStudentBehaviorRatings = (rows) =>
  api
    .post("/api/student-behavior-ratings-upsert", rows)
    .then((r) => r.data.data);
