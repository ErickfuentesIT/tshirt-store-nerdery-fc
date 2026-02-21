import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { CustomConfigModule } from '../config/config.module.js';
import { CustomConfigService } from '../config/config.service.js';

@Module({
  imports: [
    BullModule.forRootAsync({
      imports: [CustomConfigModule],
      useFactory: (config: CustomConfigService) => ({
        connection: {
          host: config.redis.host,
          port: config.redis.port,
        },
      }),
      inject: [CustomConfigService],
    }),
  ],
  exports: [BullModule],
})
export class BullMQModule {}
