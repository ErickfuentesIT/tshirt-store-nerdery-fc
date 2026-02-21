import { slugify } from "./slugify.helper.js";

/**
 * Generates a deterministic SKU from the product name and attribute values.
 */
export function generateSku(productName: string, attributeValues: string[]): string {
  const sluggedName = slugify(productName);
  const sortedValues = [...attributeValues]
    .map((v) => slugify(v))
    .sort();
  return [sluggedName, ...sortedValues].join('-');
}