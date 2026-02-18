import { Resolver, Mutation, Args, ID, ResolveField, Parent } from '@nestjs/graphql';
import { Attribute } from '../models/attribute.model.js';
import { AttributeCategory } from '../models/attribute-category.model.js';
import { AttributesService } from '../services/attributes.service.js';
import { UpdateAttributeInput } from '../dto/update-attribute.input.js';
import { AttributeCategoryLoader } from '../loaders/attribute-category.loader.js';

@Resolver(() => Attribute)
export class AttributesResolver {
  constructor(
    private readonly attributesService: AttributesService,
    private readonly attributeCategoryLoader: AttributeCategoryLoader,
  ) {}

  @Mutation(() => Attribute)
  async updateAttribute(
    @Args('id', { type: () => ID }) id: string,
    @Args('data') data: UpdateAttributeInput,
  ) {
    return this.attributesService.update(id, data);
  }

  @Mutation(() => Attribute)
  async deleteAttribute(@Args('id', { type: () => ID }) id: string) {
    return this.attributesService.remove(id);
  }

  // ── Field resolvers ────────────────────────────────────────────────────────

  @ResolveField(() => AttributeCategory, { nullable: true })
  async attributeCategory(@Parent() attribute: Attribute & { attributeCategoryId: string }) {
    return this.attributeCategoryLoader.loader.load(attribute.attributeCategoryId);
  }
}
