import { z } from 'zod';

export const aiModerationSchema = z
  .object({
    decision: z.enum(['approved', 'rejected']),
    reason: z.string().trim().min(3).nullable(),
    category: z.enum(['funny', 'nostalgic', 'wholesome', 'other']),
    caption: z
      .string()
      .trim()
      .min(1)
      .refine(
        (caption) => caption.split(/\s+/).filter(Boolean).length <= 12,
        'Caption must not exceed 12 words'
      ),
  })
  .strict()
  .superRefine((value, ctx) => {
    if (value.decision === 'approved' && value.reason !== null) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['reason'],
        message: 'Approved decisions must have reason set to null',
      });
    }

    if (value.decision === 'rejected' && value.reason === null) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['reason'],
        message: 'Rejected decisions must include a clear rejection reason',
      });
    }
  });

export type AiModerationOutput = z.infer<typeof aiModerationSchema>;