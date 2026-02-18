import { UseGuards } from '@nestjs/common';
import { Resolver, Query, Mutation, Args, ID } from '@nestjs/graphql';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth/jwt-auth.guard.js';
import { PoliciesGuard } from '../../../common/guards/policies.guard.js';
import { CheckPolicies } from '../../../common/decorators/check-policies.decorator.js';
import { Action } from '../../../common/casl/casl.types.js';
import { AttributeCategory } from '../models/attribute-category.model.js';
import { AttributeCategoriesService } from '../services/attribute-categories.service.js';
import { UpdateAttributeCategoryInput } from '../dto/update-attribute-category.input.js';
import { InsertAttributesWithCategoryInput } from '../dto/insert-attributes-with-category.input.js';

@UseGuards(JwtAuthGuard, PoliciesGuard)
@Resolver(() => AttributeCategory)
export class AttributeCategoriesResolver {
  constructor(
    private readonly attributeCategoriesService: AttributeCategoriesService,
  ) {}

  @CheckPolicies((ability) => ability.can(Action.Read, AttributeCategory))
  @Query(() => [AttributeCategory], {
    name: 'attributeCategories',
    description: 'Returns all attribute categories (e.g. Color, Size) along with their nested attributes.',
  })
  async findAll() {
    return this.attributeCategoriesService.findAll();
  }

  @CheckPolicies((ability) => ability.can(Action.Read, AttributeCategory))
  @Query(() => AttributeCategory, {
    name: 'attributeCategory',
    description: 'Fetches a single attribute category by its ID, including its nested attributes.',
  })
  async findOne(@Args('id', { type: () => ID }) id: string) {
    return this.attributeCategoriesService.findOne(id);
  }

  @CheckPolicies((ability) => ability.can(Action.Update, AttributeCategory))
  @Mutation(() => AttributeCategory, {
    description: 'Updates the name of an attribute category.',
  })
  async updateAttributeCategory(
    @Args('id', { type: () => ID }) id: string,
    @Args('data') data: UpdateAttributeCategoryInput,
  ) {
    return this.attributeCategoriesService.update(id, data);
  }

  @CheckPolicies((ability) => ability.can(Action.Delete, AttributeCategory))
  @Mutation(() => AttributeCategory, {
    description:
      'Permanently deletes an attribute category. Blocked if any of its attributes are assigned to product variants — disable the affected variants first.',
  })
  async deleteAttributeCategory(@Args('id', { type: () => ID }) id: string) {
    return this.attributeCategoriesService.remove(id);
  }

  @CheckPolicies((ability) => ability.can(Action.Create, AttributeCategory))
  @Mutation(() => AttributeCategory, {
    description:
      'Creates a new attribute category with its attributes (Case A: provide name + values), or appends attributes to an existing category (Case B: provide attributeCategoryId + values). Runs in a transaction.',
  })
  async createAttributesWithCategory(
    @Args('data') data: InsertAttributesWithCategoryInput,
  ) {
    return this.attributeCategoriesService.insertAttributesWithCategory(data);
  }
}
