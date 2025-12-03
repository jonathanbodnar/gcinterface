import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import * as bodyParser from 'body-parser';
import * as multer from 'multer';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: ['error', 'warn', 'log'],
  });

  // Global validation
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: false, // Allow extra properties for now
    }),
  );

  // API prefix (exclude root, health, migrate, and seed endpoints)
  app.setGlobalPrefix('api', {
    exclude: ['/', 'health', 'migrate', 'seed-mock-project', 'seed-email-templates'],
  });

  // CORS
  app.enableCors({
    origin: process.env.CORS_ORIGIN || '*',
    credentials: true,
  });

  // Parse URL-encoded bodies (SendGrid webhook format)
  app.use(bodyParser.urlencoded({ extended: true, limit: '50mb' }));
  app.use(bodyParser.json({ limit: '50mb' }));
  
  // Parse multipart/form-data (SendGrid sends this format)
  const upload = multer();
  app.use('/api/webhooks/sendgrid-inbound', upload.any());

  // Swagger documentation
  const config = new DocumentBuilder()
    .setTitle('GC Interface API')
    .setDescription('Post-Takeoff Estimation & Procurement SaaS')
    .setVersion('1.0')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  const port = process.env.PORT || 3001;
  await app.listen(port);

  console.log(`🚀 GC Interface API running on port ${port}`);
  console.log(`📚 API Documentation: http://localhost:${port}/api/docs`);
}

bootstrap();

