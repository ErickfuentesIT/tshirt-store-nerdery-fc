import { Module } from '@nestjs/common';
import { OrdersService } from './orders.service.js';
import { OrdersResolver } from './orders.resolver.js';
import { OrderItemsResolver } from './order-items.resolver.js';
import { WebhookController } from './webhook.controller.js';
import { CaslModule } from './../../common/casl/casl.module.js';
import { OrderItemsLoader } from './loaders/order-items.loader.js';
import { OrderPaymentsLoader } from './loaders/order-payments.loader.js';
import { OrderItemVariantLoader } from './loaders/order-item-variant.loader.js';
import { OrderShippingAddressLoader } from './loaders/order-shipping-address.loader.js';
import { OrderStatusesLoader } from './loaders/order-statuses.loader.js';

@Module({
  imports: [CaslModule],
  controllers: [WebhookController],
  providers: [
    OrdersService,
    OrdersResolver,
    OrderItemsResolver,
    OrderItemsLoader,
    OrderPaymentsLoader,
    OrderItemVariantLoader,
    OrderShippingAddressLoader,
    OrderStatusesLoader,
  ],
})
export class OrdersModule {}
