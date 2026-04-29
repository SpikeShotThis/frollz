import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ThrottlerGuard } from '@nestjs/throttler';
import { AuthController } from './auth.controller.js';
import { AuthService } from './auth.service.js';
import { JwtStrategy } from './jwt.strategy.js';
import { JwtAuthGuard } from './jwt-auth.guard.js';
import { AuthRepository } from '../../infrastructure/repositories/auth.repository.js';
import { MikroOrmAuthRepository } from '../../infrastructure/repositories/mikro-orm-auth.repository.js';
import { requireAuthJwtSecret } from './auth.constants.js';

@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      useFactory: () => ({
        secret: requireAuthJwtSecret()
      })
    })
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    JwtStrategy,
    { provide: AuthRepository, useClass: MikroOrmAuthRepository },
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: JwtAuthGuard }
  ],
  exports: [AuthService]
})
export class AuthModule { }
