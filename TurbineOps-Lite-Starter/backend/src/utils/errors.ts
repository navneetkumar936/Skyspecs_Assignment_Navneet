import { Prisma } from "@prisma/client";

export class AppError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

export const isUniqueViolation = (e: unknown) =>
  e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002';
