import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module.js';
import { CustomConfigService } from './common/config/config.service.js';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { rawBody: true });
  const configService = app.get(CustomConfigService);

  app.useGlobalPipes(new ValidationPipe({ whitelist: true })); // Pipe that validates incoming requests against their DTOs

  const swaggerConfig = new DocumentBuilder()
    .setTitle('T-Shirt Store API')
    .setDescription('REST API documentation for the T-Shirt Store')
    .setVersion('1.0')
    .addBearerAuth(
      { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
      'access-token',
    )
    .addBearerAuth(
      { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
      'refresh-token',
    )
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/docs', app, document);

  const port: number = configService.app.port;
  await app.listen(port);
}
bootstrap();
