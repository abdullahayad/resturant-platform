// Must run before any other import: AuthModule's JwtModule.register() reads
// process.env.JWT_SECRET as a static decorator argument, which is evaluated
// at import time — before @nestjs/config's ConfigModule.forRoot() (itself
// only reached once AppModule's own decorator runs, after every one of its
// imports, including the whole auth module chain, has already resolved)
// would otherwise get a chance to load .env. Confirmed by a hard failure
// in requireJwtSecret() during the security review; see jwt-secret.ts.
import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
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

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.use(helmet());
  app.enableCors({ origin: allowedOrigins });
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
