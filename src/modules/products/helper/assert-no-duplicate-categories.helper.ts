import { BadRequestException } from '@nestjs/common';
import { AttributeMeta } from '../types/attribute-meta.type.js';

export function assertNoDuplicateCategories(
  attributeValueIds: string[],
  attributeMeta: Map<string, AttributeMeta>,
): void {
  const seen = new Map<string, string>(); // categoryId → first attributeId seen
  for (const attrId of attributeValueIds) {
    const { categoryId, categoryName } = attributeMeta.get(attrId)!;
    if (seen.has(categoryId)) {
      throw new BadRequestException(
        `Variant has more than one attribute from category "${categoryName}". ` +
          `A variant may only have one value per attribute category.`,
      );
    }
    seen.set(categoryId, attrId);
  }
}
