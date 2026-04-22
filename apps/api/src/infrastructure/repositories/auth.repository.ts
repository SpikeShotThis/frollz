import type { CurrentUser } from '@frollz2/schema';

export interface AuthUserRecord extends CurrentUser {
  passwordHash: string;
}

export type RefreshTokenMatchType = 'current' | 'previous';

export interface RefreshTokenRecord {
  userId: number;
  tokenHash: string;
  previousTokenHash: string | null;
  previousTokenGraceUntil: string | null;
  expiresAt: string;
  revokedAt: string | null;
  matchType: RefreshTokenMatchType;
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
    previousTokenGraceUntil: string;
    createdAt: string;
    expiresAt: string;
  }): Promise<boolean>;

  abstract rotateRefreshTokenFromPrevious(input: {
    userId: number;
    previousTokenHash: string;
    currentTokenHash: string;
    newTokenHash: string;
    previousTokenGraceUntil: string;
    createdAt: string;
    expiresAt: string;
    now: string;
  }): Promise<boolean>;

  abstract revokeRefreshTokensForUser(userId: number, revokedAt: string): Promise<void>;

  abstract findRefreshTokenByHash(tokenHash: string): Promise<RefreshTokenRecord | null>;
}
