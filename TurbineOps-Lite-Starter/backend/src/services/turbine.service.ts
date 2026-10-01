import { prisma } from '../db/prisma.js';
import { AppError } from '../utils/errors.js';

export interface TurbineInput {
  name?: string;
  manufacturer?: string;
  mwRating?: number;
  lat?: number;
  lng?: number;
}

export const listTurbines = () => prisma.turbine.findMany({ take: 50 });

export async function createTurbine(input: TurbineInput) {
  if (!input.name) throw new AppError(400, 'name required');
  const { name, manufacturer, mwRating, lat, lng } = input;
  return prisma.turbine.create({ data: { name, manufacturer, mwRating, lat, lng } });
}

export async function updateTurbine(id: string, input: TurbineInput) {
  const existing = await prisma.turbine.findUnique({ where: { id } });
  if (!existing) throw new AppError(404, 'Turbine not found');
  if (input.name !== undefined && !input.name) throw new AppError(400, 'name cannot be empty');
  const { name, manufacturer, mwRating, lat, lng } = input;
  return prisma.turbine.update({ where: { id }, data: { name, manufacturer, mwRating, lat, lng } });
}