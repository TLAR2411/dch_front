const isAbsoluteUrl = (url) => /^https?:\/\//i.test(String(url ?? "").trim());

// getImageUrl.js
export default function getImageUrl(image) {
  if (!image) return "";

  const path = String(image).trim();

  // Supabase / external full URLs — use as-is
  if (isAbsoluteUrl(path)) {
    return path;
  }

  const base = import.meta.env.VITE_API_URL.replace(/\/+$/, "");
  return `${base}/${path.replace(/^\/+/, "")}`;
}

export function getThumbUrl(
  image,
  { w = 72, h = 72, q = 60, fmt = "webp", fit = "inside" } = {},
) {
  const original = getImageUrl(image);

  if (!original) return "";

  // External URLs: skip API thumb proxy (use direct URL)
  if (isAbsoluteUrl(original)) {
    return original;
  }

  const base = import.meta.env.VITE_API_URL.replace(/\/+$/, "");
  return `${base}/img?url=${encodeURIComponent(original)}&w=${w}&h=${h}&fmt=${fmt}&q=${q}&fit=${fit}`;
}
