import { Inject, Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { randomBytes, createHash } from 'node:crypto';
import bcrypt from 'bcrypt';
import type { CurrentUser, LoginRequest, RegisterRequest, TokenPair } from '@frollz2/schema';
import { AuthRepository } from '../../infrastructure/repositories/auth.repository.js';
import { DomainError } from '../../domain/errors.js';
import { AUTH_ACCESS_TOKEN_TTL, AUTH_REFRESH_TOKEN_TTL_DAYS, requireAuthJwtSecret } from './auth.constants.js';

function nowIso(): string {
  return new Date().toISOString();
}

function refreshExpiresAt(): string {
  return new Date(Date.now() + AUTH_REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000).toISOString();
}

function hashRefreshToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

@Injectable()
export class AuthService {
  constructor(
    @Inject(AuthRepository) private readonly authRepository: AuthRepository,
    @Inject(JwtService) private readonly jwtService: JwtService
  ) { }

  async register(input: RegisterRequest): Promise<TokenPair> {
    const existingUser = await this.authRepository.findUserByEmail(input.email);

    if (existingUser) {
      throw new DomainError('CONFLICT', 'A user with that email already exists');
    }

    const passwordHash = await bcrypt.hash(input.password, 12);
    const user = await this.authRepository.createUser({
      email: input.email,
      name: input.name,
      passwordHash,
      createdAt: nowIso()
    });

    return this.issueTokenPair(user.id, user.email);
  }

  async login(input: LoginRequest): Promise<TokenPair> {
    const user = await this.authRepository.findUserByEmail(input.email);

    if (!user) {
      throw new DomainError('UNAUTHORIZED', 'Invalid email or password');
    }

    const passwordMatches = await bcrypt.compare(input.password, user.passwordHash);

    if (!passwordMatches) {
      throw new DomainError('UNAUTHORIZED', 'Invalid email or password');
    }

    return this.issueTokenPair(user.id, user.email);
  }

  async refresh(refreshToken: string): Promise<TokenPair> {
    const tokenHash = hashRefreshToken(refreshToken);
    const storedToken = await this.authRepository.findRefreshTokenByHash(tokenHash);

    if (!storedToken) {
      throw new DomainError('UNAUTHORIZED', 'Invalid refresh token');
    }

    if (new Date(storedToken.expiresAt).getTime() <= Date.now()) {
      throw new DomainError('UNAUTHORIZED', 'Refresh token has expired');
    }

    const user = await this.authRepository.findUserById(storedToken.userId);

    if (!user) {
      throw new DomainError('UNAUTHORIZED', 'Invalid refresh token');
    }

    const accessToken = await this.jwtService.signAsync(
      { sub: user.id, email: user.email },
      {
        secret: requireAuthJwtSecret(),
        expiresIn: AUTH_ACCESS_TOKEN_TTL
      }
    );

    return {
      accessToken,
      refreshToken
    };
  }

  async logout(userId: number, refreshToken: string): Promise<void> {
    await this.authRepository.deleteRefreshToken(hashRefreshToken(refreshToken), userId);
  }

  async me(userId: number): Promise<CurrentUser> {
    const user = await this.authRepository.findCurrentUserById(userId);

    if (!user) {
      throw new DomainError('NOT_FOUND', 'User not found');
    }

    return user;
  }

  private generateRefreshToken(): string {
    return randomBytes(48).toString('base64url');
  }

  private async issueTokenPair(userId: number, email: string): Promise<TokenPair> {
    const refreshToken = this.generateRefreshToken();

    await this.authRepository.upsertRefreshToken({
      userId,
      tokenHash: hashRefreshToken(refreshToken),
      createdAt: nowIso(),
      expiresAt: refreshExpiresAt()
    });

    const accessToken = await this.jwtService.signAsync(
      { sub: userId, email },
      {
        secret: requireAuthJwtSecret(),
        expiresIn: AUTH_ACCESS_TOKEN_TTL
      }
    );

    return {
      accessToken,
      refreshToken
    };
  }
}
