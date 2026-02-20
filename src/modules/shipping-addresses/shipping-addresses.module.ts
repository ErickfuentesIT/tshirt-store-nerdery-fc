import { Module } from '@nestjs/common';
import { ShippingAddressesService } from './shipping-addresses.service.js';
import { ShippingAddressesResolver } from './shipping-addresses.resolver.js';
import { CaslModule } from '../../common/casl/casl.module.js';

@Module({
  imports: [CaslModule],
  providers: [ShippingAddressesService, ShippingAddressesResolver],
})
export class ShippingAddressesModule {}
