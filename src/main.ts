import { NestFactory, Reflector } from '@nestjs/core';
import { ValidationPipe, ClassSerializerInterceptor } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Prefijo global
  app.setGlobalPrefix('api/v1');

  // Validación global de DTOs
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  // Serialización — respeta el @Exclude() en las entidades
  app.useGlobalInterceptors(
    new ClassSerializerInterceptor(app.get(Reflector)),
    new TransformInterceptor(),
  );

  // CORS
  app.enableCors({
    origin: process.env.FRONTEND_URL || 'http://localhost:3001',
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });

  // ── Swagger ──────────────────────────────────────────────
  const config = new DocumentBuilder()
    .setTitle('Prubea tecnica Backend')
    .setDescription(
      'API REST para gestión de usuarios y productos. ' +
      'Usa el botón Authorize para ingresar tu JWT y probar los endpoints protegidos.',
    )
    .setVersion('1.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'Ingresa tu token JWT aquí',
      },
      'JWT-auth', // Nombre de la seguridad — se referencia en cada endpoint
    )
    .addTag('Auth', 'Registro, login y recuperación de contraseña')
    .addTag('Users', 'Gestión de usuarios')
    .addTag('Products', 'Gestión de productos')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('docs', app, document, {
    swaggerOptions: {
      persistAuthorization: true, // Recuerda el token al recargar la página
    },
  });

  const port = process.env.APP_PORT || 3000;
  await app.listen(port);

  console.log(`🚀 API corriendo en:     http://localhost:${port}/api/v1`);
  console.log(`📖 Swagger docs en:      http://localhost:${port}/docs`);
  console.log(`📧 MailHog UI en:        http://localhost:8025`);
}

bootstrap();