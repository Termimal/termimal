import { z } from 'zod'
import { isDisposableEmail } from './disposable-emails'

export const LIMITS = {
  email: 254,
  passwordMin: 8,
  passwordMax: 72,
  fullName: 100,
  country: 56,
  timezone: 64,
  language: 16,
} as const

export const emailSchema = z
  .string()
  .trim()
  .min(1, 'Email is required.')
  .max(LIMITS.email, `Email must be at most ${LIMITS.email} characters.`)
  .email('Enter a valid email address.')
  .refine((v) => !isDisposableEmail(v), {
    message: 'Disposable email addresses are not allowed.',
  })

export const passwordSchema = z
  .string()
  .min(LIMITS.passwordMin, `Password must be at least ${LIMITS.passwordMin} characters.`)
  .max(LIMITS.passwordMax, `Password must be at most ${LIMITS.passwordMax} characters.`)

export const signupSchema = z
  .object({
    email: emailSchema,
    password: passwordSchema,
    confirmPassword: passwordSchema,
  })
  .refine((d) => d.password === d.confirmPassword, {
    path: ['confirmPassword'],
    message: 'Passwords do not match.',
  })

export const profileSchema = z.object({
  full_name: z
    .string()
    .trim()
    .max(LIMITS.fullName, `Full name must be at most ${LIMITS.fullName} characters.`)
    .optional()
    .or(z.literal('')),
  country: z
    .string()
    .trim()
    .max(LIMITS.country, `Country must be at most ${LIMITS.country} characters.`)
    .optional()
    .or(z.literal('')),
  timezone: z
    .string()
    .trim()
    .max(LIMITS.timezone, `Timezone must be at most ${LIMITS.timezone} characters.`)
    .optional()
    .or(z.literal('')),
  language: z
    .string()
    .trim()
    .max(LIMITS.language, `Language must be at most ${LIMITS.language} characters.`)
    .optional()
    .or(z.literal('')),
})

export type SignupInput = z.infer<typeof signupSchema>
export type ProfileInput = z.infer<typeof profileSchema>
