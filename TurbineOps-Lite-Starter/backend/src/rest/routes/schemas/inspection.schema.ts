import { z } from 'zod';

export const inspectionIdParamSchema = z.object({
  id: z.string().min(1, 'id is required'),
});

export const listInspectionsQuerySchema = z.object({
  from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'date must be YYYY-MM-DD').nullish(),
  to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'date must be YYYY-MM-DD').nullish(),
  turbineId: z.string().nullish(),
  dataSource: z
    .enum(['DRONE', 'MANUAL'], {
      errorMap: () => ({ message: 'dataSource must be one of: DRONE, MANUAL' }),
    })
    .nullish(),
});

export const createInspectionSchema = z.object({
  turbineId: z
    .string({ required_error: 'turbineId is required', invalid_type_error: 'turbineId is required' })
    .min(1, 'turbineId is required'),
  date: z
    .string({ required_error: 'date must be YYYY-MM-DD', invalid_type_error: 'date must be YYYY-MM-DD' })
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'date must be YYYY-MM-DD'),
  dataSource: z.enum(['DRONE', 'MANUAL'], {
    errorMap: () => ({ message: 'dataSource must be one of: DRONE, MANUAL' }),
  }),
  inspectorName: z.string().nullish(),
  rawPackageUrl: z.string().nullish(),
});

export const updateInspectionSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'date must be YYYY-MM-DD').nullish(),
  dataSource: z
    .enum(['DRONE', 'MANUAL'], {
      errorMap: () => ({ message: 'dataSource must be one of: DRONE, MANUAL' }),
    })
    .nullish(),
  inspectorName: z.string().nullish(),
  rawPackageUrl: z.string().nullish(),
});

export const createFindingSchema = z.object({
  category: z.enum(['BLADE_DAMAGE', 'LIGHTNING', 'EROSION', 'UNKNOWN'], {
    errorMap: () => ({ message: 'category must be one of: BLADE_DAMAGE, LIGHTNING, EROSION, UNKNOWN' }),
  }),
  severity: z
    .number({
      required_error: 'severity must be an integer between 1 and 5',
      invalid_type_error: 'severity must be an integer between 1 and 5',
    })
    .int('severity must be an integer between 1 and 5')
    .min(1, 'severity must be an integer between 1 and 5')
    .max(5, 'severity must be an integer between 1 and 5'),
  estimatedCost: z
    .number({
      required_error: 'estimatedCost must be a number >= 0',
      invalid_type_error: 'estimatedCost must be a number >= 0',
    })
    .min(0, 'estimatedCost must be a number >= 0'),
  notes: z.string().nullable().optional(),
});
