import { Module } from '@nestjs/common';
import { OrdersService } from './orders.service.js';
import { OrdersResolver } from './orders.resolver.js';
import { WebhookController } from './webhook.controller.js';
import { CaslModule } from './../../common/casl/casl.module.js';

@Module({
  imports: [CaslModule],
  controllers: [WebhookController],
  providers: [OrdersService, OrdersResolver],
})
export class OrdersModule {}
