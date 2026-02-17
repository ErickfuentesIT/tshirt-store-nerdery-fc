import { Module } from '@nestjs/common';
import { ProductsService } from './services/products.service.js';
import { ProductsResolver } from './products.resolver.js';

@Module({
  providers: [ProductsService, ProductsResolver],
  exports: [ProductsService],
})
export class ProductsModule {}
