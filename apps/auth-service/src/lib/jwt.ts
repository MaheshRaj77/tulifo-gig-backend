import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { UnauthorizedError } from './errors';

export interface TokenPayload {
  userId: string;
  email: string;
  role: string;
}

export interface AccessTokenPayload extends TokenPayload {
  jti: string; // JWT ID for audit
}

export interface RefreshTokenPayload extends TokenPayload {
  jti: string;
  familyId: string; // Token rotation family
}

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'your-refresh-secret';
const ACCESS_TOKEN_EXPIRY = '15m';
const REFRESH_TOKEN_EXPIRY = '7d';

function generateJti(): string {
  return crypto.randomUUID();
}

export function generateAccessToken(payload: TokenPayload): string {
  const tokenPayload: AccessTokenPayload = {
    ...payload,
    jti: generateJti(),
  };
  return jwt.sign(tokenPayload, JWT_SECRET, { expiresIn: ACCESS_TOKEN_EXPIRY });
}

export function generateRefreshToken(payload: TokenPayload, familyId?: string): { token: string; familyId: string } {
  const family = familyId || crypto.randomUUID();
  const tokenPayload: RefreshTokenPayload = {
    ...payload,
    jti: generateJti(),
    familyId: family,
  };
  const token = jwt.sign(tokenPayload, JWT_REFRESH_SECRET, { expiresIn: REFRESH_TOKEN_EXPIRY });
  return { token, familyId: family };
}

export function verifyAccessToken(token: string): AccessTokenPayload {
  try {
    return jwt.verify(token, JWT_SECRET) as AccessTokenPayload;
  } catch {
    throw new UnauthorizedError('Invalid access token');
  }
}

export function verifyRefreshToken(token: string): RefreshTokenPayload {
  try {
    return jwt.verify(token, JWT_REFRESH_SECRET) as RefreshTokenPayload;
  } catch {
    throw new UnauthorizedError('Invalid refresh token');
  }
}

export function generateTokenPair(payload: TokenPayload, familyId?: string) {
  const accessToken = generateAccessToken(payload);
  const refresh = generateRefreshToken(payload, familyId);
  return {
    accessToken,
    refreshToken: refresh.token,
    familyId: refresh.familyId,
    expiresIn: 15 * 60, // 15 minutes in seconds
  };
}

export const REFRESH_TOKEN_EXPIRY_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
