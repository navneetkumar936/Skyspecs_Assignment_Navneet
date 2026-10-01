import { z } from 'zod';

export const loginSchema = z.object({
  email: z
    .string({ required_error: 'email and password required', invalid_type_error: 'email and password required' })
    .min(1, 'email and password required')
    .email('Invalid email format'),
  password: z
    .string({ required_error: 'email and password required', invalid_type_error: 'email and password required' })
    .min(1, 'email and password required'),
});
