/**
 * Grade calc helpers for Score Entry.
 *
 * Formula per category:
 *   (studentTotal / categoryMax) * categoryWeight
 * Final average = sum of all category weighted %.
 */

export const CATEGORY_ORDER = [
  "attendance",
  "homework",
  "work",
  "participation",
  "exam",
];

export function normalizeCategoryKey(name) {
  const raw = String(name || "")
    .trim()
    .toLowerCase();

  if (raw.includes("attend")) return "attendance";
  if (raw.includes("home") || raw === "h") return "homework";
  if (raw.includes("work") || raw === "w") return "work";
  if (raw.includes("parti")) return "participation";
  if (raw.includes("exam") || raw.includes("test")) return "exam";
  return raw || "other";
}

export function categorySortIndex(name) {
  const key = normalizeCategoryKey(name);
  const idx = CATEGORY_ORDER.indexOf(key);
  return idx === -1 ? CATEGORY_ORDER.length : idx;
}

/**
 * Sum item scores for a student within a category.
 * @param {Record<number, number|null|''>} scoreByItemId
 * @param {Array<{ id: number }>} items
 */
export function sumItemScores(scoreByItemId, items = []) {
  return items.reduce((sum, item) => {
    const raw = scoreByItemId?.[item.id];
    const n = Number(raw);
    return sum + (Number.isFinite(n) ? n : 0);
  }, 0);
}

/**
 * Sum of max scores for items. Falls back to categoryMax when no items.
 */
export function resolveCategoryMax({ items = [], categoryMax = null, attendanceMax = null, isAttendance = false }) {
  if (isAttendance && Number.isFinite(Number(attendanceMax))) {
    return Number(attendanceMax);
  }

  const itemTotal = items.reduce(
    (sum, item) => sum + (Number(item.max_score) || 0),
    0,
  );

  if (itemTotal > 0) return itemTotal;

  const cat = Number(categoryMax);
  return Number.isFinite(cat) ? cat : 0;
}

/**
 * Weighted % for one category.
 * @returns {number} 0..weight
 */
export function calcCategoryPercent({ studentTotal, categoryMax, weight }) {
  const max = Number(categoryMax);
  const w = Number(weight) || 0;
  if (!Number.isFinite(max) || max <= 0) return 0;

  const total = Number(studentTotal) || 0;
  const ratio = Math.min(Math.max(total / max, 0), 1);
  return ratio * w;
}

/**
 * Final average grade from category percents.
 * @param {Array<{ percent: number }>} categoryResults
 */
export function calcAverageGrade(categoryResults = []) {
  return categoryResults.reduce(
    (sum, row) => sum + (Number(row.percent) || 0),
    0,
  );
}

/**
 * Validate a score against item max.
 * @returns {string|null} error message or null if ok
 */
export function validateScore(value, maxScore) {
  if (value === null || value === undefined || value === "") return null;

  const n = Number(value);
  if (!Number.isFinite(n)) return "Invalid score";
  if (n < 0) return "Score cannot be negative";

  const max = Number(maxScore);
  if (Number.isFinite(max) && n > max) {
    return `Max is ${max}`;
  }

  return null;
}

/**
 * Round display values for the grid.
 */
export function roundScore(value, digits = 2) {
  const n = Number(value);
  if (!Number.isFinite(n)) return 0;
  const f = 10 ** digits;
  return Math.round(n * f) / f;
}
