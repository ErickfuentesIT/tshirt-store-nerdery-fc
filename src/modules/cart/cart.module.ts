import { Module } from '@nestjs/common';
import { CaslModule } from '../../common/casl/casl.module.js';
import { CartService } from './cart.service.js';
import { CartResolver } from './cart.resolver.js';
import { CartItemVariantLoader } from './loaders/cart-item-variant.loader.js';

@Module({
  imports: [CaslModule],
  providers: [CartResolver, CartService, CartItemVariantLoader],
})
export class CartModule {}
