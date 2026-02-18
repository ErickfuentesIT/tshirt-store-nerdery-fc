import { Resolver, Query, Mutation, Args, ID } from '@nestjs/graphql';
import { Category } from './models/category.model.js';
import { CategoriesService } from './categories.service.js';
import { CreateCategoryInput } from './dto/create-category.dto.js';

@Resolver(() => Category)
export class CategoriesResolver {
  constructor(private readonly categoriesService: CategoriesService) {}

  @Query(() => [Category], {
    name: 'categories',
    description: 'Returns all product categories.',
  })
  async findAll() {
    return this.categoriesService.findAll();
  }

  @Mutation(() => Category, {
    description: 'Creates a new product category.',
  })
  async createCategory(@Args('data') data: CreateCategoryInput) {
    return this.categoriesService.create(data);
  }

  @Mutation(() => Category, {
    description: 'Updates a product category name.',
  })
  async updateCategory(
    @Args('id', { type: () => ID }) id: string,
    @Args('data') data: CreateCategoryInput,
  ) {
    return this.categoriesService.update(id, data);
  }

  @Mutation(() => Category, {
    description:
      'Permanently deletes a category. Blocked if any products are currently assigned to it — reassign or disable those products first.',
  })
  async deleteCategory(@Args('id', { type: () => ID }) id: string) {
    return this.categoriesService.remove(id);
  }
}
