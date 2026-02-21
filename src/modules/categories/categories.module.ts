import { Module } from '@nestjs/common';
import { CaslModule } from '../../common/casl/casl.module.js';
import { CategoriesService } from './categories.service.js';
import { CategoriesResolver } from './categories.resolver.js';

@Module({
  imports: [CaslModule],
  providers: [CategoriesResolver, CategoriesService],
  exports: [CategoriesService],
})
export class CategoriesModule {}
