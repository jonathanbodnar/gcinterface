import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import * as bodyParser from 'body-parser';
import * as multer from 'multer';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: ['error', 'warn', 'log'],
    bodyParser: false, // Disable default so we control parsing order
  });

  // Global validation
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: false,
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

  // Log all webhook requests FIRST for diagnostics
  const expressApp = app.getHttpAdapter().getInstance();
  expressApp.all('/api/webhooks/*', (req: any, res: any, next: any) => {
    console.log(`🔔 WEBHOOK HIT: ${req.method} ${req.url}`);
    console.log(`   Content-Type: ${req.headers['content-type']}`);
    console.log(`   Content-Length: ${req.headers['content-length']}`);
    console.log(`   User-Agent: ${req.headers['user-agent']}`);
    next();
  });

  // Parse multipart/form-data for SendGrid webhook BEFORE other body parsers
  const upload = multer({ limits: { fileSize: 50 * 1024 * 1024 } });
  expressApp.post('/api/webhooks/sendgrid-inbound', upload.any(), (req: any, _res: any, next: any) => {
    console.log(`📎 Multer parsed: ${(req.files || []).length} files, body keys: ${Object.keys(req.body || {}).join(', ')}`);
    next();
  });

  // Standard body parsers for all other routes
  app.use(bodyParser.urlencoded({ extended: true, limit: '50mb' }));
  app.use(bodyParser.json({ limit: '50mb' }));

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

