import { Resolver, ResolveField, Parent } from '@nestjs/graphql';
import { VariantAttributeCategory } from '../models/variant-attribute-category.model.js';
import { Attribute } from '../models/attribute.model.js';
import { AttributeLoader } from '../loaders/attribute.loader.js';

@Resolver(() => VariantAttributeCategory)
export class VariantAttributeCategoriesResolver {
  constructor(private readonly attributeLoader: AttributeLoader) {}

  // ─── Field Resolvers ─────────────────────────────────────────────────────────

  @ResolveField(() => Attribute, { nullable: true })
  async attribute(@Parent() vac: VariantAttributeCategory & { attributeId: string }) {
    return this.attributeLoader.loader.load(vac.attributeId);
  }
}
