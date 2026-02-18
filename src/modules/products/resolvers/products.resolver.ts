import { Resolver, Query, Mutation, Args, ID, Int } from '@nestjs/graphql';
import { Product } from '../models/product.model.js';
import { ProductsService } from '../services/products.service.js';
import { CreateProductWithVariantsInput } from '../dto/create-product-with-variants.input.js';
import { AddVariantsInput } from '../dto/add-variants.input.js';
import { UpdateProductInput } from '../dto/update-product.input.js';

@Resolver(() => Product)
export class ProductsResolver {
  constructor(private readonly productsService: ProductsService) {}

  @Query(() => [Product], {
    name: 'products',
    description:
      'Fetches data from products, it works with paginations, with two parameters. skip: means the current page and take: the range of records. By default: skip: 0, take: 10',
  })
  async findAll(
    @Args('skip', { type: () => Int, defaultValue: 0 }) skip: number,
    @Args('take', { type: () => Int, defaultValue: 10 }) take: number,
  ) {
    return this.productsService.findAll(skip, take);
  }

  @Query(() => Product, { name: 'product' })
  async findOne(@Args('id', { type: () => ID }) id: string) {
    return this.productsService.findOne(id);
  }

  @Mutation(() => Product, {
    description:
      'Creates a product with its variants, attribute mappings, and images in a single atomic transaction. SKU is auto-generated from product name + sorted attribute values.',
  })
  async createProduct(
    @Args('data') data: CreateProductWithVariantsInput,
  ) {
    return this.productsService.createWithVariants(data);
  }

  @Mutation(() => Product, {
    description:
      'Appends new variants (with attributes and images) to an existing product. Runs in a transaction.',
  })
  async addVariantsToProduct(
    @Args('productId', { type: () => ID }) productId: string,
    @Args('data') data: AddVariantsInput,
  ) {
    return this.productsService.addVariants(productId, data);
  }

  @Mutation(() => Product)
  async updateProduct(
    @Args('id', { type: () => ID }) id: string,
    @Args('data') data: UpdateProductInput,
  ) {
    return this.productsService.update(id, data);
  }

  @Mutation(() => Product)
  async disableProduct(@Args('id', { type: () => ID }) id: string) {
    return this.productsService.disable(id);
  }
}
