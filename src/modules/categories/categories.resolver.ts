import { Resolver, Query, Mutation, Args, ID } from '@nestjs/graphql';
import { Category } from './models/category.model.js';
import { CategoriesService } from './categories.service.js';
import { CreateCategoryInput } from './dto/create-category.dto.js';

@Resolver(() => Category)
export class CategoriesResolver {
  constructor(private readonly categoriesService: CategoriesService) {}

  @Query(() => [Category], { name: 'categories' })
  async findAll() {
    return this.categoriesService.findAll();
  }

  @Query(() => Category, { name: 'category' })
  async findOne(@Args('id', { type: () => ID }) id: string) {
    return this.categoriesService.findOne(id);
  }

  @Mutation(() => Category)
  async createCategory(@Args('data') data: CreateCategoryInput) {
    return this.categoriesService.create(data);
  }

  @Mutation(() => Category)
  async updateCategory(
    @Args('id', { type: () => ID }) id: string,
    @Args('data') data: CreateCategoryInput,
  ) {
    return this.categoriesService.update(id, data);
  }

  @Mutation(() => Category)
  async deleteCategory(@Args('id', { type: () => ID }) id: string) {
    return this.categoriesService.remove(id);
  }
}
