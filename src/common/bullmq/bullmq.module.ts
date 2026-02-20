import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { CustomConfigModule } from '../config/config.module.js';
import { CustomConfigService } from '../config/config.service.js';

/**
 * Registers the BullMQ root connection once for the entire application.
 * Feature modules that need to enqueue or process jobs import this module
 * and call BullModule.registerQueue({ name: '<queue-name>' }) locally.
 */
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
