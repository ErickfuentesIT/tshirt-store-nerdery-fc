import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module.js';
import { CustomConfigService } from './common/config/config.service.js';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(CustomConfigService);

  app.useGlobalPipes(new ValidationPipe({ whitelist: true })); // Pipe that validates incoming requests against their DTOs

  const port: number = configService.app.port;
  await app.listen(port);
}
bootstrap();
