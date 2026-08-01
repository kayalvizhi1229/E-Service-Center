import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../../config/database.js';
import { authenticate, requireRoles } from '../../middleware/auth.js';
import { validateBody } from '../../middleware/validate.js';
import { asyncHandler } from '../../middleware/errorHandler.js';
import { parsePagination, paginatedResponse, generateCode } from '../../shared/utils.js';
import { Role } from '@prisma/client';

const router = Router();
router.use(authenticate, requireRoles(Role.ADMIN, Role.STORE_MANAGER));

const supplierSchema = z.object({
  name: z.string().min(2),
  contactPerson: z.string().optional(),
  mobile: z.string().min(10),
  email: z.string().email().optional().or(z.literal('')),
  address: z.string().optional(),
  gstNo: z.string().optional(),
});

router.get(
  '/',
  asyncHandler(async (req: Request, res: Response) => {
    const { page, limit, search, skip } = parsePagination(req.query);
    const where = search
      ? { name: { contains: search, mode: 'insensitive' as const } }
      : {};

    const [data, total] = await Promise.all([
      prisma.supplier.findMany({ where, skip, take: limit, orderBy: { createdAt: 'desc' } }),
      prisma.supplier.count({ where }),
    ]);
    res.json(paginatedResponse(data, total, page, limit));
  })
);

router.post(
  '/',
  validateBody(supplierSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const count = await prisma.supplier.count();
    const supplierCode = await generateCode('SUP', count);
    const supplier = await prisma.supplier.create({
      data: { ...req.body, supplierCode, email: req.body.email || null },
    });
    res.status(201).json({ success: true, data: supplier });
  })
);

router.put(
  '/:id',
  validateBody(supplierSchema.partial()),
  asyncHandler(async (req: Request, res: Response) => {
    const supplier = await prisma.supplier.update({
      where: { id: (req.params.id as string) },
      data: req.body,
    });
    res.json({ success: true, data: supplier });
  })
);

router.delete(
  '/:id',
  asyncHandler(async (req: Request, res: Response) => {
    await prisma.supplier.delete({ where: { id: (req.params.id as string) } });
    res.json({ success: true, message: 'Supplier deleted' });
  })
);

export default router;
