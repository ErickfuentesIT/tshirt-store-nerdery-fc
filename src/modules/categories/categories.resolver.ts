import { UseGuards } from '@nestjs/common';
import { Resolver, Query, Mutation, Args, ID } from '@nestjs/graphql';
import { JwtAuthGuard } from '../auth/guards/jwt-auth/jwt-auth.guard.js';
import { PoliciesGuard } from '../../common/guards/policies.guard.js';
import { CheckPolicies } from '../../common/decorators/check-policies.decorator.js';
import { Action } from '../../common/casl/casl.types.js';
import { Category } from './models/category.model.js';
import { CategoriesService } from './categories.service.js';
import { CreateCategoryInput } from './dto/create-category.dto.js';

@UseGuards(JwtAuthGuard, PoliciesGuard)
@Resolver(() => Category)
export class CategoriesResolver {
  constructor(private readonly categoriesService: CategoriesService) {}

  @CheckPolicies((ability) => ability.can(Action.Read, Category))
  @Query(() => [Category], {
    name: 'categories',
    description: 'Returns all product categories.',
  })
  async findAll() {
    return this.categoriesService.findAll();
  }

  @CheckPolicies((ability) => ability.can(Action.Create, Category))
  @Mutation(() => Category, {
    description: 'Creates a new product category.',
  })
  async createCategory(@Args('data') data: CreateCategoryInput) {
    return this.categoriesService.create(data);
  }

  @CheckPolicies((ability) => ability.can(Action.Update, Category))
  @Mutation(() => Category, {
    description: 'Updates a product category name.',
  })
  async updateCategory(
    @Args('id', { type: () => ID }) id: string,
    @Args('data') data: CreateCategoryInput,
  ) {
    return this.categoriesService.update(id, data);
  }

  @CheckPolicies((ability) => ability.can(Action.Delete, Category))
  @Mutation(() => Category, {
    description:
      'Permanently deletes a category. Blocked if any products are currently assigned to it — reassign or disable those products first.',
  })
  async deleteCategory(@Args('id', { type: () => ID }) id: string) {
    return this.categoriesService.remove(id);
  }
}
