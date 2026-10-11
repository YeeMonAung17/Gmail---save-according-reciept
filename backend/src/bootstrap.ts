import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module';
import { ApiExceptionFilter, checkOrigin, validationPipe } from './common/http';

export async function createApp(logging = true) {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    bodyParser: false,
    logger: logging ? undefined : false,
  });
  app.setGlobalPrefix('api');
  app.use(checkOrigin);
  app.useBodyParser('json', { limit: '16kb' });
  app.useGlobalPipes(validationPipe());
  app.useGlobalFilters(new ApiExceptionFilter());
  app.enableShutdownHooks();
  return app;
}
