import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../../config/database.js';
import { authenticate, requireRoles } from '../../middleware/auth.js';
import { validateBody } from '../../middleware/validate.js';
import { asyncHandler } from '../../middleware/errorHandler.js';
import { parsePagination, paginatedResponse } from '../../shared/utils.js';
import { Role, IncomeType } from '@prisma/client';

const router = Router();
router.use(authenticate, requireRoles(Role.ADMIN));

const incomeSchema = z.object({
  type: z.nativeEnum(IncomeType),
  amount: z.number().min(0),
  description: z.string().optional(),
  incomeDate: z.string().optional(),
  reference: z.string().optional(),
});

router.get(
  '/',
  asyncHandler(async (req: Request, res: Response) => {
    const { page, limit, skip } = parsePagination(req.query);
    const type = (req.query.type as string) as IncomeType | undefined;
    const where = type ? { type } : {};

    const [data, total] = await Promise.all([
      prisma.income.findMany({ where, skip, take: limit, orderBy: { incomeDate: 'desc' } }),
      prisma.income.count({ where }),
    ]);
    res.json(paginatedResponse(data, total, page, limit));
  })
);

router.post(
  '/',
  validateBody(incomeSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const income = await prisma.income.create({
      data: {
        ...req.body,
        incomeDate: req.body.incomeDate ? new Date(req.body.incomeDate) : new Date(),
      },
    });
    res.status(201).json({ success: true, data: income });
  })
);

export default router;
