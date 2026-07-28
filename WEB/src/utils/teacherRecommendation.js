/**
 * Template-based teacher recommendations from subject averages (+ optional attendance).
 *
 * Strong: score >= 80 (up to top 2)
 * Weak: score < 60 (up to bottom 2)
 * High absence: mention attendance / punctuality (mild variety, not AI)
 */

export const STRONG_THRESHOLD = 80;
export const WEAK_THRESHOLD = 60;
/** Unique absent day-records at/above this → mention attendance */
export const HIGH_ABSENT_THRESHOLD = 5;

export function pronounForGender(gender) {
  const g = String(gender || "")
    .trim()
    .toLowerCase();

  if (g === "m" || g === "male" || g === "boy") {
    return { subject: "he", object: "him", possessive: "his", verbNeed: "needs" };
  }
  if (g === "f" || g === "female" || g === "girl") {
    return { subject: "she", object: "her", possessive: "her", verbNeed: "needs" };
  }
  return { subject: "they", object: "them", possessive: "their", verbNeed: "need" };
}

/** Stable index so the same student keeps the same wording on reload. */
function pickIndex(seed, length) {
  if (!length) return 0;
  const s = String(seed ?? "");
  let hash = 0;
  for (let i = 0; i < s.length; i++) {
    hash = (hash * 31 + s.charCodeAt(i)) >>> 0;
  }
  return hash % length;
}

function pick(seed, options) {
  return options[pickIndex(seed, options.length)];
}

function joinNames(names = []) {
  if (!names.length) return "";
  if (names.length === 1) return names[0];
  if (names.length === 2) return `${names[0]} and ${names[1]}`;
  return `${names.slice(0, -1).join(", ")}, and ${names[names.length - 1]}`;
}

/**
 * Soft skill wording inspired by school report samples.
 * Falls back to the subject name when no match.
 */
export function subjectToSkillPhrase(subjectName) {
  const n = String(subjectName || "")
    .trim()
    .toLowerCase();

  if (!n) return "classroom skills";

  if (n.includes("math") || n.includes("numer")) return "numerical skills";
  if (n.includes("science")) return "science understanding";
  if (n.includes("moral") || n.includes("value")) return "moral and social skills";
  if (n.includes("mapec") || n.includes("pe") || n.includes("sport") || n.includes("physical")) {
    return "physical activity and coordination";
  }
  if (n.includes("art") && !n.includes("language")) return "creative and art skills";
  if (n.includes("music")) return "music and rhythm skills";
  if (
    n.includes("language") ||
    n.includes("english") ||
    n.includes("khmer") ||
    n.includes("chinese") ||
    n.includes("literacy")
  ) {
    // slight variety by subject string
    if (n.includes("listen") || n.includes("speak")) return "listening and speaking skills";
    if (n.includes("write")) return "writing skills";
    if (n.includes("read")) return "reading skills";
    return pick(n, [
      "language and communication skills",
      "speaking ability",
      "listening skills",
      "writing skills",
      "reading and comprehension",
    ]);
  }

  return subjectName;
}

/**
 * @param {Array<{ id: number, name_en?: string, name_kh?: string }>} subjects
 * @param {Record<number, number>} subjectScores
 */
export function classifySubjects(subjects = [], subjectScores = {}) {
  const rows = subjects
    .map((subject) => ({
      id: subject.id,
      name: subject.name_en || subject.name_kh || "Subject",
      score: Number(subjectScores[subject.id]) || 0,
    }))
    .sort((a, b) => b.score - a.score);

  const strong = rows
    .filter((r) => r.score >= STRONG_THRESHOLD)
    .slice(0, 2)
    .map((r) => subjectToSkillPhrase(r.name));

  const weak = rows
    .filter((r) => r.score < WEAK_THRESHOLD)
    .sort((a, b) => a.score - b.score)
    .slice(0, 2)
    .map((r) => subjectToSkillPhrase(r.name));

  return { strong, weak, allStrong: rows.length > 0 && rows.every((r) => r.score >= STRONG_THRESHOLD) };
}

function attendanceNote({ name, pronoun, absentDays, seed }) {
  if (!Number.isFinite(absentDays) || absentDays < HIGH_ABSENT_THRESHOLD) return "";

  return pick(`${seed}-att`, [
    ` ${name}'s attendance and punctuality need improvement, though ${pronoun.subject} shows good participation when in class.`,
    ` Encouraging more regular attendance will help ${pronoun.object} get the most from each lesson.`,
    ` More consistent attendance would help ${pronoun.object} build on what ${pronoun.subject} learns in class.`,
  ]);
}

/**
 * Build a short teacher comment (varied templates, inspired by report samples).
 *
 * @param {{
 *   name: string,
 *   gender?: string|null,
 *   studentId?: number|string,
 *   subjects: Array,
 *   subjectScores: Record<number, number>,
 *   absentDays?: number|null,
 * }}
 */
export function buildTeacherRecommendation({
  name,
  gender,
  studentId,
  subjects,
  subjectScores,
  absentDays = null,
}) {
  const displayName = String(name || "The student").trim() || "The student";
  const pronoun = pronounForGender(gender);
  const seed = studentId ?? displayName;
  const { strong, weak, allStrong } = classifySubjects(subjects, subjectScores);

  const strongText = joinNames(strong);
  const weakText = joinNames(weak);
  const att = attendanceNote({
    name: displayName,
    pronoun,
    absentDays,
    seed,
  });

  // High absence can lead the comment when scores are mid/mixed
  if (att && !strong.length && !weak.length) {
    return pick(`${seed}-abs-only`, [
      `${displayName}'s attendance and punctuality need improvement, though ${pronoun.subject} shows good participation when in class.`,
      `${displayName} learns best with regular attendance; more consistency will help ${pronoun.object} progress steadily.`,
    ]).trim();
  }

  let core = "";

  if (allStrong && strong.length) {
    core = pick(`${seed}-all`, [
      `${displayName} seems so good in all aspects; ${pronoun.subject} only needs to keep sharpening ${pronoun.possessive} ${weakText || "listening skills"}.`,
      `${displayName} is a smart learner and performs well across subjects. A little more focus on ${weakText || "careful checking"} will help even more.`,
      `${displayName} shows great speed in completing tasks. With improved careful checking, ${pronoun.subject} can produce even more accurate results.`,
    ]);
  } else if (strong.length && weak.length) {
    core = pick(`${seed}-both`, [
      `${displayName} is very good with ${strongText}. ${pronoun.subject === "they" ? "They" : pronoun.subject[0].toUpperCase() + pronoun.subject.slice(1)} only ${pronoun.verbNeed} to improve more on ${weakText}.`,
      `${displayName} is a smart student but ${pronoun.subject} ${pronoun.verbNeed} to improve more on ${weakText}.`,
      `${displayName} shows enthusiasm and strength in ${strongText}. More focus on ${weakText} will help ${pronoun.object} apply what ${pronoun.subject} learns.`,
      `${displayName} shows potential in ${strongText}, but ${pronoun.verbNeed} better focus on ${weakText} to maximize learning.`,
      `${displayName} is highly energetic and active in ${strongText}, but occasionally loses focus on ${weakText}. Encouraging more concentration will help ${pronoun.object} maximize learning.`,
      `${displayName} is very good in sharing ideas in class around ${strongText}; ${pronoun.subject} ${pronoun.verbNeed} to practice more on ${weakText} so others also get the chance to participate.`,
    ]);
  } else if (strong.length) {
    core = pick(`${seed}-strong`, [
      `${displayName} is very good with ${strongText}.`,
      `${displayName} performs well in ${strongText} and shows growing confidence.`,
      `${displayName} demonstrates understanding confidently in ${strongText} when guided.`,
      `${displayName} shows great effort and strength in ${strongText}.`,
    ]);
  } else if (weak.length) {
    core = pick(`${seed}-weak`, [
      `${displayName} ${pronoun.verbNeed} to improve more on ${weakText}.`,
      `${displayName} needs to improve on ${pronoun.possessive} ${weakText}.`,
      `${displayName} requires guidance to stay on track with ${weakText}, yet demonstrates understanding of the lesson.`,
      `${displayName} learns best with close guidance and will grow with more practice in ${weakText}.`,
      `${displayName} shows potential, but ${pronoun.verbNeed} better focus on ${weakText} to maximize productivity.`,
    ]);
  } else {
    core = pick(`${seed}-mid`, [
      `${displayName} is making steady progress across subjects.`,
      `${displayName} shows enthusiasm in class; keeping a steady focus will help ${pronoun.object} apply what ${pronoun.subject} learns.`,
      `${displayName} learns best with close guidance and is able to express understanding when questioned.`,
      `${displayName} shows great speed in completing tasks. With improved careful checking, ${pronoun.subject} can produce even more accurate results.`,
    ]);
  }

  // Append attendance note when high absence (and not already the whole message)
  if (att && !core.toLowerCase().includes("attendance")) {
    // Prefer grafting a short clause instead of a long second paragraph when possible
    const shortAtt = pick(`${seed}-att-short`, [
      ` Attendance and punctuality also need improvement.`,
      ` More regular attendance would help ${pronoun.object} further.`,
      ` Encouraging better attendance will help ${pronoun.object} maximize learning.`,
    ]);
    return `${core}${shortAtt}`.replace(/\s+/g, " ").trim();
  }

  return core.replace(/\s+/g, " ").trim();
}
