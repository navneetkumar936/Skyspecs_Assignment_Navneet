import { z } from 'zod';

export const turbineIdParamSchema = z.object({
  id: z.string().min(1, 'id is required'),
});

export const createTurbineSchema = z.object({
  name: z
    .string({ required_error: 'name required', invalid_type_error: 'name required' })
    .min(1, 'name required'),
  manufacturer: z.string().optional(),
  mwRating: z.number({ invalid_type_error: 'mwRating must be a number' }).optional(),
  lat: z.number({ invalid_type_error: 'lat must be a number' }).optional(),
  lng: z.number({ invalid_type_error: 'lng must be a number' }).optional(),
});

export const updateTurbineSchema = z.object({
  name: z.string().min(1, 'name cannot be empty').optional(),
  manufacturer: z.string().optional(),
  mwRating: z.number({ invalid_type_error: 'mwRating must be a number' }).optional(),
  lat: z.number({ invalid_type_error: 'lat must be a number' }).optional(),
  lng: z.number({ invalid_type_error: 'lng must be a number' }).optional(),
});
