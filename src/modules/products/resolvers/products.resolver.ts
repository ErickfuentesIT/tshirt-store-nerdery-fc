import { Resolver, Query, Mutation, Args, ID, Int } from '@nestjs/graphql';
import { Product } from './models/product.model.js';
import { ProductsService } from './products.service.js';
import { CreateProductInput } from './dto/create-product.input.js';
import { UpdateProductInput } from './dto/update-product.input.js';

@Resolver(() => Product)
export class ProductsResolver {
  constructor(private readonly productsService: ProductsService) {}

  @Query(() => [Product], { name: 'products', description: 'Fetches data from products, it works with paginations, with two parameters. skip: means the current page and take: the range of records. By default: skip: 0, take: 10' })
  async findAll(
    @Args('skip', { type: () => Int, defaultValue: 0 }) skip: number, // page
    @Args('take', { type: () => Int, defaultValue: 10 }) take: number, // range
  ) {
    return this.productsService.findAll(skip, take);
  }

  @Query(() => Product, { name: 'product' })
  async findOne(@Args('id', { type: () => ID }) id: string) {
    return this.productsService.findOne(id);
  }

  @Mutation(() => Product)
  async createProduct(@Args('data') data: CreateProductInput) {
    return this.productsService.create(data);
  }

  @Mutation(() => Product)
  async updateProduct(
    @Args('id', { type: () => ID }) id: string,
    @Args('data') data: UpdateProductInput,
  ) {
    return this.productsService.update(id, data);
  }

  @Mutation(() => Product)
  async deleteProduct(@Args('id', { type: () => ID }) id: string) {
    return this.productsService.remove(id);
  }

  @Mutation(() => Product)
  async disableProduct(@Args('id', { type: () => ID }) id: string) {
    return this.productsService.disable(id);
  }
}
