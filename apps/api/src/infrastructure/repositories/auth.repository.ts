import type { CurrentUser } from '@frollz2/schema';

export interface AuthUserRecord extends CurrentUser {
  passwordHash: string;
}

export abstract class AuthRepository {
  abstract findCurrentUserById(userId: number): Promise<CurrentUser | null>;

  abstract findUserByEmail(email: string): Promise<AuthUserRecord | null>;

  abstract findUserById(userId: number): Promise<AuthUserRecord | null>;

  abstract createUser(input: { email: string; name: string; passwordHash: string; createdAt: string }): Promise<CurrentUser>;

  abstract upsertRefreshToken(input: {
    userId: number;
    tokenHash: string;
    createdAt: string;
    expiresAt: string;
  }): Promise<void>;

  abstract deleteRefreshToken(tokenHash: string, userId: number): Promise<void>;

  abstract rotateRefreshToken(input: {
    userId: number;
    oldTokenHash: string;
    newTokenHash: string;
    createdAt: string;
    expiresAt: string;
  }): Promise<void>;

  abstract findRefreshTokenByHash(tokenHash: string): Promise<{ userId: number; tokenHash: string; expiresAt: string } | null>;
}
