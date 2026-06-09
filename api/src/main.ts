import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { json, urlencoded } from 'express';
import * as path from 'node:path';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  app.setGlobalPrefix('api/v1');
  app.enableCors(); // open for dev; lock down origins before deploy

  // Larger bodies so base64 media uploads fit (proxy-upload path).
  app.use(json({ limit: '25mb' }));
  app.use(urlencoded({ extended: true, limit: '25mb' }));

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  const config = app.get(ConfigService);

  // Serve locally-stored media at /uploads (LocalStorageService; R2 serves itself).
  const uploadsDir = path.resolve(config.get<string>('MEDIA_LOCAL_DIR') ?? 'uploads');
  app.useStaticAssets(uploadsDir, { prefix: '/uploads/' });

  const port = config.get<number>('PORT') ?? 3000;
  await app.listen(port);
  // eslint-disable-next-line no-console
  console.log(`Trailr API listening on http://localhost:${port}/api/v1`);
}

void bootstrap();
