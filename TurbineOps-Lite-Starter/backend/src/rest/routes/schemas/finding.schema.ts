import { z } from 'zod';

export const findingIdParamSchema = z.object({
  id: z.string().min(1, 'id is required'),
});

export const searchFindingsQuerySchema = z.object({
  q: z
    .string({ required_error: 'q is required', invalid_type_error: 'q is required' })
    .trim()
    .min(1, 'q is required'),
  inspectionId: z.string().optional(),
});

export const updateFindingSchema = z.object({
  category: z
    .enum(['BLADE_DAMAGE', 'LIGHTNING', 'EROSION', 'UNKNOWN'], {
      errorMap: () => ({ message: 'category must be one of: BLADE_DAMAGE, LIGHTNING, EROSION, UNKNOWN' }),
    })
    .optional(),
  severity: z
    .number({ invalid_type_error: 'severity must be an integer between 1 and 5' })
    .int('severity must be an integer between 1 and 5')
    .min(1, 'severity must be an integer between 1 and 5')
    .max(5, 'severity must be an integer between 1 and 5')
    .optional(),
  estimatedCost: z
    .number({ invalid_type_error: 'estimatedCost must be a number >= 0' })
    .min(0, 'estimatedCost must be a number >= 0')
    .optional(),
  notes: z.string().nullable().optional(),
});
