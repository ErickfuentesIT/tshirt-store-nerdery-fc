import { Module } from '@nestjs/common';
import { EmailService } from './email.service.js';
import { CustomConfigModule } from '../../config/config.module.js';

@Module({
  imports: [CustomConfigModule],
  providers: [EmailService],
  exports: [EmailService],
})
export class EmailModule {}
