import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
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
import { BullMQModule } from '../../common/bullmq/bullmq.module.js';
import { EmailModule } from '../../common/email/email.module.js';
import { StockNotificationService } from './stock-notification.service.js';
import { StockNotificationProcessor } from './processors/stock-notification.processor.js';
import { STOCK_NOTIFICATION_QUEUE } from './constants/queue.constants.js';

@Module({
  imports: [
    CaslModule,
    BullMQModule,
    EmailModule,
    BullModule.registerQueue({ name: STOCK_NOTIFICATION_QUEUE }),
  ],
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
    StockNotificationService,
    StockNotificationProcessor,
  ],
})
export class OrdersModule {}
