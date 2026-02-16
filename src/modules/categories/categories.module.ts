import { Module } from '@nestjs/common';
import { CategoriesService } from './categories.service.js';
import { CategoriesResolver } from './categories.resolver.js';

@Module({
  providers: [CategoriesResolver, CategoriesService],
  exports: [CategoriesService],
})
export class CategoriesModule {}
