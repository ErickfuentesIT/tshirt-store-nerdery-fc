import { Global, Module } from '@nestjs/common';
import { StripeService } from './stripe.service.js';
import { CustomConfigModule } from '../config/config.module.js';

@Global()
@Module({
  imports: [CustomConfigModule],
  providers: [StripeService],
  exports: [StripeService],
})
export class StripeModule {}
