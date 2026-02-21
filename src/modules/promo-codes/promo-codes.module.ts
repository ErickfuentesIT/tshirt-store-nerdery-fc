import { Module } from '@nestjs/common';
import { PromoCodesService } from './promo-codes.service.js';
import { PromoCodesResolver } from './promo-codes.resolver.js';
import { CaslModule } from '../../common/casl/casl.module.js';

@Module({
  imports: [CaslModule],
  providers: [PromoCodesService, PromoCodesResolver],
  exports: [PromoCodesService],
})
export class PromoCodesModule {}
