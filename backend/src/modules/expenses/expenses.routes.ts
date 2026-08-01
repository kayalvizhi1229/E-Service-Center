import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../../config/database.js';
import { authenticate, requireRoles } from '../../middleware/auth.js';
import { validateBody } from '../../middleware/validate.js';
import { asyncHandler } from '../../middleware/errorHandler.js';
import { parsePagination, paginatedResponse } from '../../shared/utils.js';
import { Role, ExpenseCategory } from '@prisma/client';

const router = Router();
router.use(authenticate, requireRoles(Role.ADMIN));

const expenseSchema = z.object({
  category: z.nativeEnum(ExpenseCategory),
  amount: z.number().min(0),
  description: z.string().optional(),
  expenseDate: z.string().optional(),
  reference: z.string().optional(),
});

router.get(
  '/',
  asyncHandler(async (req: Request, res: Response) => {
    const { page, limit, skip } = parsePagination(req.query);
    const category = (req.query.category as string) as ExpenseCategory | undefined;
    const where = category ? { category } : {};

    const [data, total] = await Promise.all([
      prisma.expense.findMany({ where, skip, take: limit, orderBy: { expenseDate: 'desc' } }),
      prisma.expense.count({ where }),
    ]);
    res.json(paginatedResponse(data, total, page, limit));
  })
);

router.post(
  '/',
  validateBody(expenseSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const expense = await prisma.expense.create({
      data: {
        ...req.body,
        expenseDate: req.body.expenseDate ? new Date(req.body.expenseDate) : new Date(),
      },
    });
    res.status(201).json({ success: true, data: expense });
  })
);

router.put(
  '/:id',
  validateBody(expenseSchema.partial()),
  asyncHandler(async (req: Request, res: Response) => {
    const expense = await prisma.expense.update({
      where: { id: (req.params.id as string) },
      data: {
        ...req.body,
        expenseDate: req.body.expenseDate ? new Date(req.body.expenseDate) : undefined,
      },
    });
    res.json({ success: true, data: expense });
  })
);

router.delete(
  '/:id',
  asyncHandler(async (req: Request, res: Response) => {
    await prisma.expense.delete({ where: { id: (req.params.id as string) } });
    res.json({ success: true, message: 'Expense deleted' });
  })
);

export default router;
