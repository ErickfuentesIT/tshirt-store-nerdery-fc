import { Resolver, ResolveField, Parent } from '@nestjs/graphql';
import { VariantAttributeCategory } from '../models/variant-attribute-category.model.js';
import { Attribute } from '../models/attribute.model.js';
import { AttributeLoader } from '../loaders/attribute.loader.js';

/**
 * Field-resolver only. No mutations — variant attributes are immutable once
 * set at variant creation time. Changing attributes requires disabling the
 * variant and creating a new one with the correct attribute set.
 */
@Resolver(() => VariantAttributeCategory)
export class VariantAttributeCategoriesResolver {
  constructor(private readonly attributeLoader: AttributeLoader) {}

  @ResolveField(() => Attribute, { nullable: true })
  async attribute(@Parent() vac: VariantAttributeCategory & { attributeId: string }) {
    return this.attributeLoader.loader.load(vac.attributeId);
  }
}
