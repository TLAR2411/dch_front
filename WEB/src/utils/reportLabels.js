/**
 * Part-aware display names for exam / attendance reports.
 *
 * english  → name_en
 * khmer    → name_kh
 * chinese  → name_kh (primary) + name_cn (secondary, when present)
 */

export function resolveReportPart(part) {
  const value = String(part || "").toLowerCase();
  if (value === "khmer" || value === "chinese" || value === "english") {
    return value;
  }
  return "english";
}

/**
 * Single-line label for selects, meta, titles, sorting.
 */
export function getEntityLabel(entity, part, fallback = "—") {
  if (!entity) return fallback;

  const resolved = resolveReportPart(part);

  if (resolved === "khmer") {
    return entity.name_kh || entity.name_en || entity.name_cn || fallback;
  }

  if (resolved === "chinese") {
    return (
      entity.name_kh ||
      entity.name_cn ||
      entity.name_en ||
      fallback
    );
  }

  return entity.name_en || entity.name_kh || entity.name_cn || fallback;
}

/**
 * Two-line label for printed tables.
 * Chinese: primary = name_kh, secondary = name_cn (if any).
 * Other parts: primary only.
 */
export function getBilingualLabel(entity, part, fallback = "—") {
  if (!entity) {
    return { primary: fallback, secondary: null };
  }

  const resolved = resolveReportPart(part);

  if (resolved === "chinese") {
    const primary =
      entity.name_kh || entity.name_cn || entity.name_en || fallback;
    const secondary =
      entity.name_cn && entity.name_cn !== primary ? entity.name_cn : null;

    return { primary, secondary };
  }

  return {
    primary: getEntityLabel(entity, resolved, fallback),
    secondary: null,
  };
}

/** LocaleCompare using the part's primary display name. */
export function compareEntityNames(a, b, part) {
  return String(getEntityLabel(a, part, "")).localeCompare(
    String(getEntityLabel(b, part, "")),
  );
}

/** Field name for simple VSelect item-title (single line). */
export function getSelectTitleField(part) {
  const resolved = resolveReportPart(part);
  if (resolved === "khmer" || resolved === "chinese") return "name_kh";
  return "name_en";
}
