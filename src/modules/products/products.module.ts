import { Module } from '@nestjs/common';
import { ProductsService } from './services/products.service.js';
import { ProductsResolver } from './resolvers/products.resolver.js';
import { ProductVariantsService } from './services/product-variants.service.js';
import { ProductVariantsResolver } from './resolvers/product-variants.resolver.js';
import { AttributesService } from './services/attributes.service.js';
import { AttributesResolver } from './resolvers/attributes.resolver.js';
import { AttributeCategoriesService } from './services/attribute-categories.service.js';
import { AttributeCategoriesResolver } from './resolvers/attribute-categories.resolver.js';
import { VariantAttributeCategoriesService } from './services/variant-attribute-categories.service.js';
import { VariantAttributeCategoriesResolver } from './resolvers/variant-attribute-categories.resolver.js';

@Module({
  providers: [
    ProductsService,
    ProductsResolver,
    ProductVariantsService,
    ProductVariantsResolver,
    AttributesService,
    AttributesResolver,
    AttributeCategoriesService,
    AttributeCategoriesResolver,
    VariantAttributeCategoriesService,
    VariantAttributeCategoriesResolver,
  ],
  exports: [
    ProductsService,
    ProductVariantsService,
    AttributesService,
    AttributeCategoriesService,
    VariantAttributeCategoriesService,
  ],
})
export class ProductsModule {}
