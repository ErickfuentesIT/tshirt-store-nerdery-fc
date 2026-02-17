import { Module } from '@nestjs/common';
import { ProductsService } from './services/products.service.js';
import { ProductsResolver } from './resolvers/products.resolver.js';
import { ProductVariantsService } from './services/product-variants.service.js';
import { ProductVariantsResolver } from './resolvers/product-variants.resolver.js';

@Module({
  providers: [
    ProductsService,
    ProductsResolver,
    ProductVariantsService,
    ProductVariantsResolver,
  ],
  exports: [ProductsService, ProductVariantsService],
})
export class ProductsModule {}
