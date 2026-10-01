import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { Role } from '@prisma/client';
import { prisma } from '../db/prisma.js';
import { env } from '../config/env.js';
import { AppError } from '../utils/errors.js';

export interface AuthUser {
  id: string;
  role: Role;
}

export async function login(email: unknown, password: unknown) {
  if (typeof email !== 'string' || typeof password !== 'string' || !email || !password) {
    throw new AppError(400, 'email and password required');
  }
  const user = await prisma.user.findUnique({ where: { email } });
  const ok = user ? await bcrypt.compare(password, user.passwordHash) : false;
  if (!user || !ok) throw new AppError(401, 'Invalid email or password');

  const token = jwt.sign({ role: user.role }, env.jwtSecret, {
    subject: user.id,
    expiresIn: '1h',
    algorithm: 'HS256',
  });
  return {
    token,
    expiresIn: 3600,
    user: { id: user.id, email: user.email, name: user.name, role: user.role },
  };
}

export function extractUser(header?: string): AuthUser {
  if (!header?.startsWith('Bearer ')) throw new AppError(401, 'Authentication required');
  try {
    const p = jwt.verify(header.slice(7), env.jwtSecret, { algorithms: ['HS256'] }) as jwt.JwtPayload;
    if (!p.sub || !Object.values(Role).includes(p.role)) throw new Error('bad payload');
    return { id: p.sub, role: p.role as Role };
  } catch {
    throw new AppError(401, 'Invalid or expiredddd token');
  }
}

export async function getMe(id: string) {
  const user = await prisma.user.findUnique({
    where: { id },
    select: { id: true, email: true, name: true, role: true },
  });
  if (!user) throw new AppError(401, 'User no longer exists');
  return user;
}