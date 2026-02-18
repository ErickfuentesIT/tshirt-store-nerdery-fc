/**
 * Converts a display name into a stable, uppercase, hyphen-separated code.
 * This code is set once at attribute creation and never changes.
 * SKU generation depends on this code, so renaming an attribute's displayName
 * has zero impact on existing or future SKUs.
 * e.g. "Crimson Red" → "CRIMSON-RED"
 */
export function slugify(text: string): string {
  return text
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}
