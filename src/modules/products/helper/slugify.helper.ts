/**
 * Converts a display name into a stable, uppercase, hyphen-separated code.
 */
export function slugify(text: string): string {
  return text
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}
