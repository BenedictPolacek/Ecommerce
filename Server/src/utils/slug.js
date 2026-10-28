// Lowercase words separated by single hyphens, e.g. "men-shirts"
export const SLUG_REGEX = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/**
 * Generates a URL-friendly slug: "Café Crème 2" → "cafe-creme-2"
 */
export const slugify = (text) => {
  return text
    .toString()
    .normalize('NFKD') // split accented letters into letter + accent mark
    .replace(/[̀-ͯ]/g, '') // drop the accent marks
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-') // everything else becomes a single hyphen
    .replace(/^-+|-+$/g, ''); // trim starting/trailing hyphens
};
