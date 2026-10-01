import jwt from 'jsonwebtoken';

export type Role = 'ADMIN' | 'ENGINEER' | 'VIEWER';

export const tokenFor = (role: Role, id = `${role.toLowerCase()}-id`, expiresIn: string | number = '1h') =>
  jwt.sign({ role }, process.env.JWT_SECRET!, { subject: id, expiresIn: expiresIn as any, algorithm: 'HS256' });

export const auth = (role: Role) => ({ Authorization: `Bearer ${tokenFor(role)}` });