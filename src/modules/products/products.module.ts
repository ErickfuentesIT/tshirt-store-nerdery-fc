import { Module } from '@nestjs/common';
import { ProductsService } from './services/products.service.js';
import { ProductsResolver } from './resolvers/products.resolver.js';
import { ProductVariantsService } from './services/product-variants.service.js';
import { ProductVariantsResolver } from './resolvers/product-variants.resolver.js';
import { AttributesService } from './services/attributes.service.js';
import { AttributesResolver } from './resolvers/attributes.resolver.js';
import { AttributeCategoriesService } from './services/attribute-categories.service.js';
import { AttributeCategoriesResolver } from './resolvers/attribute-categories.resolver.js';
import { VariantAttributeCategoriesResolver } from './resolvers/variant-attribute-categories.resolver.js';
import { ImagesService } from './services/images.service.js';
import { ImagesResolver } from './resolvers/images.resolver.js';
import { CustomConfigModule } from '../../common/config/config.module.js';
import { ProductVariantsLoader } from './loaders/product-variants.loader.js';
import { VariantAttributesLoader } from './loaders/variant-attributes.loader.js';
import { AttributeLoader } from './loaders/attribute.loader.js';
import { AttributeCategoryLoader } from './loaders/attribute-category.loader.js';
import { CategoryLoader } from './loaders/category.loader.js';
import { ProductImagesLoader } from './loaders/product-images.loader.js';
import { VariantImagesLoader } from './loaders/variant-images.loader.js';

@Module({
  imports: [CustomConfigModule],
  providers: [
    // Services
    ProductsService,
    ProductVariantsService,
    AttributesService,
    AttributeCategoriesService,
    ImagesService,
    // Resolvers
    ProductsResolver,
    ProductVariantsResolver,
    AttributesResolver,
    AttributeCategoriesResolver,
    VariantAttributeCategoriesResolver,
    ImagesResolver,
    // DataLoaders (REQUEST-scoped — one fresh instance per incoming request)
    ProductVariantsLoader,
    VariantAttributesLoader,
    AttributeLoader,
    AttributeCategoryLoader,
    CategoryLoader,
    ProductImagesLoader,
    VariantImagesLoader,
  ],
  exports: [
    ProductsService,
    ProductVariantsService,
    AttributesService,
    AttributeCategoriesService,
    ImagesService,
  ],
})
export class ProductsModule {}
