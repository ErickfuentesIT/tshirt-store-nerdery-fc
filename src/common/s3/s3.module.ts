import { Global, Module } from '@nestjs/common';
import { S3Service } from './s3.service.js';
import { CustomConfigModule } from '../config/config.module.js';

@Global()
@Module({
  imports: [CustomConfigModule],
  providers: [S3Service],
  exports: [S3Service],
})
export class S3Module {}
