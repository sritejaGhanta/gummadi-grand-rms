import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/filters/http-exception.filter';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const logger = new Logger('RMS-Bootstrap');

  // Enable CORS for intranet and web/mobile clients
  app.enableCors({
    origin: '*',
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
  });

  // Global prefixes, pipes, filters, interceptors
  app.setGlobalPrefix('api');
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: false,
    }),
  );
  app.useGlobalFilters(new AllExceptionsFilter());
  app.useGlobalInterceptors(new TransformInterceptor());

  // Swagger Documentation Setup
  const config = new DocumentBuilder()
    .setTitle('Restaurant Management System (RMS) API')
    .setDescription('Enterprise LAN RMS RESTful API with Dynamic RBAC, Orders, Kitchen, & Billing')
    .setVersion('1.0.0')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  const port = process.env.PORT || 3000;
  await app.listen(port, '0.0.0.0');

  logger.log(`=======================================================`);
  logger.log(`🍽️  RMS Backend Server running at: http://localhost:${port}/api`);
  logger.log(`📚 Swagger API Docs available at: http://localhost:${port}/api/docs`);
  logger.log(`=======================================================`);
}

bootstrap();
