import { Module } from '@nestjs/common';
import { CaslModule } from '../../common/casl/casl.module.js';
import { LikesService } from './likes.service.js';
import { LikesResolver } from './likes.resolver.js';

@Module({
  imports: [CaslModule],
  providers: [LikesResolver, LikesService],
})
export class LikesModule {}
