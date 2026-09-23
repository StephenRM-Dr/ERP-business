import { NestFactory, Reflector } from '@nestjs/core';
import { AppModule } from './app.module';
import { ClassSerializerInterceptor, ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

import { json, urlencoded } from 'express';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.use(json({ limit: '50mb' }));
  app.use(urlencoded({ extended: true, limit: '50mb' }));
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // Strips away unknown properties
      forbidNonWhitelisted: true, // Throws an error if unknown properties are sent
    }),
  );
  // Honour @Exclude() / @Expose() decorators on entities & DTOs (e.g. clave_hash)
  app.useGlobalInterceptors(new ClassSerializerInterceptor(app.get(Reflector)));
  app.enableCors(); // Enable CORS for the frontend to connect
  app.setGlobalPrefix('api'); // All routes served under /api, matching the frontend's VITE_API_URL

  // Only expose Swagger documentation in non-production environments
  if (process.env.NODE_ENV !== 'production') {
    const config = new DocumentBuilder()
      .setTitle('ERP Business API')
      .setDescription('The ERP Business backend API description')
      .setVersion('1.0')
      .addTag('clientes')
      .build();
    const documentFactory = () => SwaggerModule.createDocument(app, config);
    // setGlobalPrefix doesn't cascade to SwaggerModule.setup — the path here must include 'api' explicitly.
    SwaggerModule.setup('api/docs', app, documentFactory);
  }

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
