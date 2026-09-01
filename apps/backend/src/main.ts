// Must run before any other import: initializes Sentry (needs to patch
// Node's internals before other modules grab references to them) and loads
// .env as its own first line — which AuthModule's JwtModule.register() also
// depends on, since it reads process.env.JWT_SECRET as a static decorator
// argument evaluated at import time, before @nestjs/config's
// ConfigModule.forRoot() would otherwise get a chance to load .env.
// Confirmed by a hard failure in requireJwtSecret() during the security
// review; see jwt-secret.ts and instrument.ts.
import './instrument';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import { AppModule } from './app.module';

// Comma-separated list of allowed browser origins, e.g.
// "http://localhost:5173,https://admin.example.com". Falls back to the
// known local dev origins (admin portal + Expo web) rather than reflecting
// any origin (see security review) — set ALLOWED_ORIGINS explicitly in
// any deployed environment.
const allowedOrigins = (process.env.ALLOWED_ORIGINS ?? 'http://localhost:5173,http://localhost:8082')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

// Docs describe route shapes only (no secrets), but stay opt-in everywhere —
// fails closed if NODE_ENV is ever left unset in a deployed environment
// (see security review) rather than fail open by default outside production.
const swaggerEnabled = process.env.ENABLE_SWAGGER === 'true';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.use(helmet());

  if (swaggerEnabled) {
    // Swagger UI's bootstrap script is inline, which the default CSP blocks —
    // relax CSP only on the /docs path itself, not the whole app.
    app.use('/docs', helmet({ contentSecurityPolicy: false }));
  }

  app.enableCors({ origin: allowedOrigins });
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));

  if (swaggerEnabled) {
    const config = new DocumentBuilder()
      .setTitle('Restaurant Platform API')
      .setDescription('Backend API for the LiQETA partner app and admin portal')
      .setVersion('1.0')
      .addBearerAuth()
      .build();
    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('docs', app, document);
  }

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
