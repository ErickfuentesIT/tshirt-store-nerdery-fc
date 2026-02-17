import { Resolver, Query, Mutation, Args, ID, Int } from '@nestjs/graphql';
import { ProductVariant } from '../models/product-variant.model.js';

@Resolver(() => ProductVariant)
export class ProductVariantsResolver{

}